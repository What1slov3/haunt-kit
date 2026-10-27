import { envelopeAt, envelopeDuration } from './envelope';
import {
  malletVoices,
  PENTATONIC,
  soundDuration,
  soundTail,
  type SoundSpec,
  type Voice,
} from './sounds';

/*
 * Генератор звуков — чистые функции: проверка правил набора, нормализация громкости и случайный звук
 * по зерну. Правила те же, что у звуков кита (sounds.ts): пик громкости ≤ 1, длина — по классу (звук
 * интерфейса меньше полусекунды, мотив меньше 3 с), хвост эффектов не тянется за звуком, основные тоны
 * вне 2–4,5 кГц — там ухо слышит громче всего, и звук «пищит» поверх интерфейса. Звук по зерну
 * детерминирован: из id человека или награды всегда выходит один и тот же.
 */

/** Длины — секунды. Голосов у мотива больше: каждый удар по шагам — свои голоса, а звучат они по очереди */
export const DESIGN_LIMITS = {
  ui: { maxVoices: 8, maxDuration: 0.5, maxTail: 1 },
  motif: { maxVoices: 64, maxDuration: 3, maxTail: 4 },
  maxGain: 1,
  harshFrom: 2000,
  harshTo: 4500,
} as const;

export type SoundIssueCode = 'empty' | 'voices' | 'gain' | 'duration' | 'tail' | 'harsh';

export interface SoundIssue {
  code: SoundIssueCode;
  /** Номер голоса, к которому относится замечание; без него — ко всему звуку */
  voice?: number;
}

/** Сумма громкостей голосов — грубая верхняя оценка: так громко, если бы все прозвучали разом */
export function totalGain(spec: SoundSpec): number {
  return spec.voices.reduce((sum, voice) => sum + voice.gain, 0);
}

/**
 * Пик громкости: в момент пика каждого голоса — сумма огибающих всех, кто звучит. Удары мотива идут
 * друг за другом и складываются только хвостами, простая сумма их бы завысила в разы
 */
export function peakGain(spec: SoundSpec): number {
  let peak = 0;

  for (const voice of spec.voices) {
    const at = (voice.delay ?? 0) + voice.envelope.attack;
    let sum = 0;

    for (const other of spec.voices) {
      sum += envelopeAt(other.envelope, at - (other.delay ?? 0), other.gain);
    }

    peak = Math.max(peak, sum);
  }

  return peak;
}

/** Что в звуке нарушает правила набора; пустой список — звук годится */
export function checkSound(spec: SoundSpec): SoundIssue[] {
  const issues: SoundIssue[] = [];
  const limits = DESIGN_LIMITS[spec.category ?? 'ui'];

  if (spec.voices.length === 0) return [{ code: 'empty' }];

  if (spec.voices.length > limits.maxVoices) issues.push({ code: 'voices' });

  if (peakGain(spec) > DESIGN_LIMITS.maxGain + 1e-6) issues.push({ code: 'gain' });

  if (soundDuration(spec) >= limits.maxDuration) issues.push({ code: 'duration' });

  if (soundTail(spec) > limits.maxTail) issues.push({ code: 'tail' });

  spec.voices.forEach((voice, index) => {
    if (voice.kind !== 'tone') return;

    const top = Math.max(voice.frequency, voice.glideTo ?? 0);

    // Тихий обертон колотушки (громкость ≤ 0.05) — не писк: он гаснет за 25 мс
    if (top >= DESIGN_LIMITS.harshFrom && top <= DESIGN_LIMITS.harshTo && voice.gain > 0.05) {
      issues.push({ code: 'harsh', voice: index });
    }
  });

  return issues;
}

/** Громкости, пропорционально уменьшенные до пика `target`; тише — без изменений */
export function normalizeGain(spec: SoundSpec, target = 0.9): SoundSpec {
  const peak = peakGain(spec);

  if (peak <= target || peak === 0) return spec;

  const scale = target / peak;

  return {
    ...spec,
    voices: spec.voices.map((voice) => ({ ...voice, gain: round(voice.gain * scale, 3) })),
  };
}

/** Длина голоса с задержкой, с */
export function voiceEnd(voice: Voice): number {
  return (voice.delay ?? 0) + envelopeDuration(voice.envelope);
}

const round = (value: number, digits = 3) => Number(value.toFixed(digits));

/** Зерно из текста (id человека, награды): FNV-1a — одинаковый текст, одинаковый мотив */
export function seedFromText(text: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

/** mulberry32: маленький детерминированный генератор, 0…1 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Характер мотива: вверх — «получилось», вниз — «ушло», звон — две ноты туда-обратно, мягко — одна-две низкие */
export type SoundMood = 'up' | 'down' | 'bell' | 'soft';

export const SOUND_MOODS: readonly SoundMood[] = ['up', 'down', 'bell', 'soft'];

const SCALE = Object.values(PENTATONIC);

/**
 * Случайный мотив в характере набора: 2–4 удара колотушкой по нотам пентатоники, шаг 50–100 мс,
 * громкость в сумме ≤ 0.9, длина меньше полусекунды. Одно зерно — один и тот же мотив.
 */
export function randomSound(seed: number, mood: SoundMood = 'up'): SoundSpec {
  const next = seededRandom(seed);
  const pick = <T>(items: readonly T[]) => items[Math.floor(next() * items.length)]!;
  const count =
    mood === 'soft' ? 1 + Math.floor(next() * 2) : mood === 'bell' ? 2 : 2 + Math.floor(next() * 3);
  // Мягкий — из нижней половины, остальные — из всей пентатоники; старт так, чтобы шагам хватило места
  const range = mood === 'soft' ? SCALE.slice(0, 5) : SCALE;
  const span = Math.min(range.length - 1, (count - 1) * 2);
  const startIndex =
    mood === 'down'
      ? span + Math.floor(next() * (range.length - span))
      : Math.floor(next() * (range.length - span));
  const steps: number[] = [];
  let index = startIndex;

  for (let i = 0; i < count; i++) {
    steps.push(range[Math.max(0, Math.min(range.length - 1, index))]!);

    const step = 1 + Math.floor(next() * 2);

    if (mood === 'up') index += step;
    else if (mood === 'down') index -= step;
    else if (mood === 'bell') index += i === 0 ? -step : step;
    else index += pick([-1, 1]);
  }

  // Последний удар звенит дольше: мотив заканчивается, а не обрывается
  const lastDecay = round(0.16 + next() * 0.08, 3);
  // Шаг — сколько влезает в полсекунды после звона последнего удара (атака и удержание колотушки — 13 мс)
  const budget = DESIGN_LIMITS.ui.maxDuration - 0.02 - lastDecay - 0.013;
  const spacing = Math.min(0.05 + next() * 0.05, count > 1 ? budget / (count - 1) : 0);
  const gain = round(0.9 / (count * 1.12), 3);
  const voices = steps.flatMap((frequency, i) => {
    const decay = i === steps.length - 1 ? lastDecay : round(0.08 + next() * 0.04, 3);

    return malletVoices(frequency, gain, decay, round(i * spacing, 3));
  });

  return {
    minLevel: 'subtle',
    minInterval: 300,
    voices: voices.map((voice) =>
      voice.kind === 'tone'
        ? {
            ...voice,
            frequency: round(voice.frequency, 2),
            glideTo: voice.glideTo === undefined ? undefined : round(voice.glideTo, 2),
          }
        : voice,
    ),
  };
}
