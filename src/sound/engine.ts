import type { RoomShape } from './dsp';
import { SOUNDS, type SoundName, type SoundSpec } from './sounds';
import { roomBuffer, scheduleSound } from './synth';

/*
 * Живой AudioContext — отдельный чанк, грузится при первом звуке или `sound.preload()`. Контекст один
 * на страницу и создаётся лениво, только когда звук уже разрешён (уровень не off, был жест): браузеры
 * держат контекст, созданный до жеста, в suspended, а пустой контекст на каждой странице — лишний
 * аудиопоток в системе.
 *
 * Цепочка: голоса → общий усилитель (потолок громкости) → срез верха → сухой сигнал и короткое
 * «помещение» → компрессор-лимитер → динамики. Лимитер ловит редкие наложения звуков: сумма никогда
 * не уходит в клиппинг. Помещение даёт звуку хвост в 0,3 с на уровне −17 дБ: без него синтез
 * звучит сухо, прямо в ухе, и выпадает из интерфейса. Своё помещение и эхо звука (`room`, `echo`)
 * звучат до общего — в цепочке самого звука (synth.ts).
 */

/** Потолок общего усилителя: звуки интерфейса тише любой музыки и голоса в канале */
const MASTER_GAIN = 0.5;
/** Звук назначается чуть в будущее: start(currentTime) на загруженном потоке обрезал бы атаку */
const LOOKAHEAD = 0.005;
/** Выше — только призвуки шума и обертонов, их срезаем мягко */
const LOWPASS = 6000;
const ROOM_GAIN = 0.14;
/** Общее короткое помещение: тёмный хвост в 0,3 с — тот же генератор, что у помещений звуков */
const ROOM: RoomShape = { decay: 0.3, brightness: 0.25, width: 1 };
/** Остановка гасит звук за это время: обрыв без спада щёлкает */
const STOP_FADE = 0.06;

let ctx: AudioContext | null = null;
let input: GainNode | null = null;
/** Звуки, которые ещё звучат (с хвостом): их гасит `stopAll` */
const playing = new Set<() => void>();

function createChain(context: AudioContext): GainNode {
  const master = context.createGain();
  const lowpass = context.createBiquadFilter();
  const room = context.createConvolver();
  const roomGain = context.createGain();
  const limiter = context.createDynamicsCompressor();

  master.gain.value = MASTER_GAIN;
  lowpass.type = 'lowpass';
  lowpass.frequency.value = LOWPASS;
  lowpass.Q.value = 0.5;
  room.buffer = roomBuffer(context, ROOM);
  roomGain.gain.value = ROOM_GAIN;
  limiter.threshold.value = -12;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.12;
  master.connect(lowpass);
  lowpass.connect(limiter);
  lowpass.connect(room);
  room.connect(roomGain);
  roomGain.connect(limiter);
  limiter.connect(context.destination);

  return master;
}

/** Контекст страницы; null — Web Audio нет совсем */
export function audioContext(): AudioContext | null {
  if (ctx) return ctx;

  const Context =
    typeof window === 'undefined'
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);

  if (!Context) return null;

  ctx = new Context({ latencyHint: 'interactive' });
  input = createChain(ctx);

  return ctx;
}

/**
 * Сыграть звук — встроенный по имени или свой, описанный данными, — с множителем громкости `gain`
 * (уровень × громкость вызова); false — играть нечем. `signal` останавливает звук с коротким спадом,
 * хвост эха и помещения — тоже
 */
export function playNow(name: SoundName | SoundSpec, gain: number, signal?: AbortSignal): boolean {
  const context = audioContext();

  if (!context || !input) return false;

  if (signal?.aborted) return true;

  // Контекст мог уснуть (вкладка в фоне, политика автоплея) — будим; звук назначен и сыграет после
  if (context.state === 'suspended') void context.resume().catch(() => undefined);

  const spec = typeof name === 'string' ? SOUNDS[name] : name;
  const { output, tailEnd } = scheduleSound(
    context,
    input,
    spec,
    context.currentTime + LOOKAHEAD,
    gain,
  );

  const finish = () => {
    clearTimeout(timer);
    playing.delete(stop);
    signal?.removeEventListener('abort', stop);
  };

  function stop() {
    const now = context!.currentTime;

    output.gain.cancelScheduledValues(now);
    output.gain.setValueAtTime(output.gain.value, now);
    output.gain.linearRampToValueAtTime(0, now + STOP_FADE);
    finish();
    // Петля эха сама не затихнет до нуля: после спада звук отцепляется целиком
    setTimeout(() => output.disconnect(), (STOP_FADE + 0.02) * 1000);
  }

  playing.add(stop);
  signal?.addEventListener('abort', stop, { once: true });

  // Звук доиграл с хвостом — отцепляем: петля эха и свёртка иначе висят в графе
  const timer = setTimeout(
    () => {
      finish();
      output.disconnect();
    },
    (tailEnd - context.currentTime + 0.1) * 1000,
  );

  return true;
}

/** Остановить всё, что звучит, — уровень выключили, экран ушёл */
export function stopAll(): void {
  for (const stop of [...playing]) stop();
}

/** Для тестов: забыть контекст */
export function resetEngine(): void {
  void ctx?.close().catch(() => undefined);
  ctx = null;
  input = null;
}
