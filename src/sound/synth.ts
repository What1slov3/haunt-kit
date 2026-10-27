import {
  driveCurve,
  impulseResponse,
  noiseSamples,
  pulseCoefficients,
  type RoomShape,
} from './dsp';
import { envelopeDuration, envelopeSteps, SILENCE } from './envelope';
import {
  soundLength,
  soundTail,
  type EchoSpec,
  type Lfo,
  type NoiseColor,
  type RoomSpec,
  type SoundSpec,
  type Voice,
} from './sounds';

/*
 * Синтез звука в граф Web Audio — только методы BaseAudioContext, поэтому тот же код рисует звук в
 * OfflineAudioContext (история, генератор, тесты в headless без динамиков). Голос: генератор (с FM и
 * вибрато) или шум → фильтр (с качанием) → перегруз → тремоло → усилитель с огибающей. Голоса звука
 * сходятся в его вход; оттуда — сухой сигнал, эхо и помещение звука → выход звука → `destination`.
 * Узлы одноразовые: после stop() они отцепляются и собираются сборщиком, держать их не нужно.
 */

/** Буфер шума, с: голоса берут из него случайный отрезок и идут по кругу */
const NOISE_SECONDS = 2;
/** Сколько помещений держать на контекст: генератор двигает ползунки, а хвост в 4 с — это мегабайты */
const ROOM_CACHE = 8;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const noiseBuffers = new WeakMap<BaseAudioContext, Map<NoiseColor, AudioBuffer>>();
const pulseWaves = new WeakMap<BaseAudioContext, Map<number, PeriodicWave>>();
const roomBuffers = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();

/** Значение из кэша контекста; сверх `limit` записей вытесняется самая старая */
function cached<K, V>(
  store: WeakMap<BaseAudioContext, Map<K, V>>,
  ctx: BaseAudioContext,
  key: K,
  make: () => V,
  limit = Infinity,
): V {
  let map = store.get(ctx);

  if (!map) {
    map = new Map();
    store.set(ctx, map);
  }

  let value = map.get(key);

  if (value === undefined) {
    value = make();
    map.set(key, value);

    if (map.size > limit) map.delete(map.keys().next().value!);
  }

  return value;
}

function noiseBuffer(ctx: BaseAudioContext, color: NoiseColor): AudioBuffer {
  return cached(noiseBuffers, ctx, color, () => {
    const length = ctx.sampleRate * NOISE_SECONDS;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);

    buffer.getChannelData(0).set(noiseSamples(color, length));

    return buffer;
  });
}

function pulseWave(ctx: BaseAudioContext, width: number): PeriodicWave {
  // Шаг 0.01 — разницы на слух меньше, а кэш не растёт от каждого сдвига ползунка
  const key = Math.round(clamp(width, 0.05, 0.95) * 100) / 100;

  return cached(pulseWaves, ctx, key, () => {
    const { real, imag } = pulseCoefficients(key);

    return ctx.createPeriodicWave(real, imag);
  });
}

/** Помещение в буфер свёртки; одинаковые параметры — один буфер на контекст */
export function roomBuffer(ctx: BaseAudioContext, room: RoomShape): AudioBuffer {
  const key = [room.decay, room.preDelay ?? 0, room.brightness ?? 0.5, room.width ?? 0.8].join('|');

  return cached(
    roomBuffers,
    ctx,
    key,
    () => {
      const [left, right] = impulseResponse(room, ctx.sampleRate);
      const buffer = ctx.createBuffer(2, left.length, ctx.sampleRate);

      buffer.getChannelData(0).set(left);
      buffer.getChannelData(1).set(right);

      return buffer;
    },
    ROOM_CACHE,
  );
}

const isActive = (lfo: Lfo | undefined): lfo is Lfo => !!lfo && lfo.rate > 0 && lfo.depth > 0;

/** Синус качает `param` с частотой `rate` и размахом `amount` в единицах параметра */
function connectLfo(
  ctx: BaseAudioContext,
  param: AudioParam,
  rate: number,
  amount: number,
  start: number,
  stop: number,
): void {
  const osc = ctx.createOscillator();
  const depth = ctx.createGain();

  osc.frequency.setValueAtTime(rate, start);
  depth.gain.setValueAtTime(amount, start);
  osc.connect(depth);
  depth.connect(param);
  osc.start(start);
  osc.stop(stop);
}

function applyEnvelope(param: AudioParam, voice: Voice, start: number, peak: number): void {
  for (const step of envelopeSteps(voice.envelope, peak)) {
    const time = start + step.time;

    if (step.curve === 'set') param.setValueAtTime(step.value, time);
    else if (step.curve === 'linear') param.linearRampToValueAtTime(step.value, time);
    else param.exponentialRampToValueAtTime(Math.max(SILENCE, step.value), time);
  }
}

/** Голос в граф; возвращает момент, когда он закончится */
export function scheduleVoice(
  ctx: BaseAudioContext,
  destination: AudioNode,
  voice: Voice,
  at: number,
  gain: number,
): number {
  const start = at + (voice.delay ?? 0);
  const end = start + envelopeDuration(voice.envelope);
  // Запас 20 мс: последняя точка огибающей должна доиграть, а не оборваться щелчком
  const stop = end + 0.02;
  const amp = ctx.createGain();
  let source: AudioScheduledSourceNode;

  if (voice.kind === 'tone') {
    const osc = ctx.createOscillator();

    if (voice.wave === 'pulse') osc.setPeriodicWave(pulseWave(ctx, voice.pulseWidth ?? 0.5));
    else osc.type = voice.wave;

    osc.frequency.setValueAtTime(voice.frequency, start);

    if (voice.glideTo) osc.frequency.exponentialRampToValueAtTime(voice.glideTo, end);

    const { fm } = voice;

    if (fm && (fm.depth > 0 || (fm.depthEnd ?? 0) > 0)) {
      const modulator = ctx.createOscillator();
      const index = ctx.createGain();

      modulator.frequency.setValueAtTime(voice.frequency * fm.ratio, start);

      if (voice.glideTo) {
        modulator.frequency.exponentialRampToValueAtTime(voice.glideTo * fm.ratio, end);
      }

      // Индекс × частота голоса — девиация в Гц: тембр одинаковый на любой ноте
      index.gain.setValueAtTime(fm.depth * voice.frequency, start);
      index.gain.linearRampToValueAtTime((fm.depthEnd ?? fm.depth) * voice.frequency, end);
      modulator.connect(index);
      index.connect(osc.frequency);
      modulator.start(start);
      modulator.stop(stop);
    }

    if (isActive(voice.vibrato)) {
      connectLfo(ctx, osc.detune, voice.vibrato.rate, voice.vibrato.depth, start, stop);
    }

    source = osc;
  } else {
    const noise = ctx.createBufferSource();

    noise.buffer = noiseBuffer(ctx, voice.color ?? 'white');
    // По кругу: голос шума длиннее буфера не обрывается на полуслове
    noise.loop = true;
    source = noise;
  }

  let tail: AudioNode = source;

  if (voice.filter) {
    const filter = ctx.createBiquadFilter();

    filter.type = voice.filter.type;
    filter.frequency.setValueAtTime(voice.filter.frequency, start);
    filter.Q.setValueAtTime(voice.filter.q ?? 1, start);

    if (isActive(voice.filter.lfo)) {
      const { rate, depth } = voice.filter.lfo;

      connectLfo(
        ctx,
        filter.frequency,
        rate,
        voice.filter.frequency * clamp(depth, 0, 1),
        start,
        stop,
      );
    }

    tail.connect(filter);
    tail = filter;
  }

  if (voice.drive) {
    const shaper = ctx.createWaveShaper();

    shaper.curve = driveCurve(voice.drive);
    // Двойная частота внутри: насыщение рождает обертоны, без запаса они отражаются вниз скрежетом
    shaper.oversample = '2x';
    tail.connect(shaper);
    tail = shaper;
  }

  if (isActive(voice.tremolo)) {
    const tremolo = ctx.createGain();
    // Громкость качается между 1 и 1 − depth
    const swing = clamp(voice.tremolo.depth, 0, 1) / 2;

    tremolo.gain.setValueAtTime(1 - swing, start);
    connectLfo(ctx, tremolo.gain, voice.tremolo.rate, swing, start, stop);
    tail.connect(tremolo);
    tail = tremolo;
  }

  amp.gain.setValueAtTime(0, at);
  applyEnvelope(amp.gain, voice, start, voice.gain * gain);
  tail.connect(amp);
  amp.connect(destination);

  // Шум стартует с разного места буфера (от времени) — иначе каждый щелчок звучит одной записью
  if (voice.kind === 'noise') {
    (source as AudioBufferSourceNode).start(start, (start * 7.3) % (NOISE_SECONDS - 0.1));
  } else {
    source.start(start);
  }

  source.stop(stop);

  return end;
}

/** Эхо: вход → задержка → срез верха → обратно в задержку тише на `feedback`; со среза — в выход */
function connectEcho(ctx: BaseAudioContext, from: AudioNode, to: AudioNode, echo: EchoSpec): void {
  const delay = ctx.createDelay(Math.max(1, echo.time));
  const tone = ctx.createBiquadFilter();
  const loop = ctx.createGain();
  const wet = ctx.createGain();

  delay.delayTime.value = echo.time;
  tone.type = 'lowpass';
  tone.frequency.value = echo.tone ?? 3500;
  loop.gain.value = clamp(echo.feedback, 0, 0.9);
  wet.gain.value = clamp(echo.mix, 0, 1);
  from.connect(delay);
  delay.connect(tone);
  tone.connect(loop);
  loop.connect(delay);
  tone.connect(wet);
  wet.connect(to);
}

function connectRoom(ctx: BaseAudioContext, from: AudioNode, to: AudioNode, room: RoomSpec): void {
  const convolver = ctx.createConvolver();
  const wet = ctx.createGain();

  convolver.buffer = roomBuffer(ctx, room);
  wet.gain.value = clamp(room.mix, 0, 1);
  from.connect(convolver);
  convolver.connect(wet);
  wet.connect(to);
}

export interface ScheduledSound {
  /** Конец последнего голоса, с — время контекста */
  end: number;
  /** Конец с хвостом эха и помещения */
  tailEnd: number;
  /** Выход звука: остановка гасит его громкость */
  output: GainNode;
}

/** Все голоса и эффекты звука с момента `at`; громкость `gain` — множитель уровня и громкости вызова */
export function scheduleSound(
  ctx: BaseAudioContext,
  destination: AudioNode,
  spec: SoundSpec,
  at: number,
  gain: number,
): ScheduledSound {
  const output = ctx.createGain();
  let input: AudioNode = output;

  output.connect(destination);

  if ((spec.echo && spec.echo.mix > 0) || (spec.room && spec.room.mix > 0)) {
    input = ctx.createGain();
    input.connect(output);

    if (spec.echo && spec.echo.mix > 0) connectEcho(ctx, input, output, spec.echo);

    if (spec.room && spec.room.mix > 0) connectRoom(ctx, input, output, spec.room);
  }

  let end = at;

  for (const voice of spec.voices) end = Math.max(end, scheduleVoice(ctx, input, voice, at, gain));

  return { end, tailEnd: end + soundTail(spec), output };
}

/**
 * Нарисовать звук без проигрывания: OfflineAudioContext → сэмплы, с хвостом эффектов. Для формы волны
 * в генераторе и истории и для проверок в headless: пик, длина, что звук не тишина.
 */
export async function renderSound(
  spec: SoundSpec,
  gain = 1,
  sampleRate = 22050,
): Promise<Float32Array> {
  const length = Math.ceil((soundLength(spec) + 0.04) * sampleRate);
  const ctx = new OfflineAudioContext(1, length, sampleRate);

  scheduleSound(ctx, ctx.destination, spec, 0, gain);

  const buffer = await ctx.startRendering();

  return buffer.getChannelData(0);
}
