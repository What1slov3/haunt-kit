import { envelopeDuration } from './envelope';
import {
  foldIntoRange,
  midiToFrequency,
  quantize,
  scaleNotes,
  transposition,
  type ScaleSpec,
} from './music';
import { DESIGN_LIMITS, peakGain, seededRandom, type SoundMood } from './sound-design';
import { malletVoices, type RoomSpec, type SoundSpec, type Voice } from './sounds';

/*
 * Мотив по шагам — сетка шестнадцатых: на каждом шаге аккорд (ноты MIDI) или пауза, инструмент один на
 * мотив. Сетка собирается в обычные голоса `SoundSpec` (у каждой ноты удара своя задержка): движку и
 * правилам набора шаги не нужны, в JSON звука остаются только голоса. Лад — линза сетки: показывает
 * ноты тональности; смена тоники транспонирует мотив, смена лада подтягивает ноты к ближайшим ступеням.
 */

/**
 * mallet — колотушка набора; bell — FM-колокол, звон темнеет; pluck — щипок треугольником; chip — узкий
 * импульс, как у приставки; pad — мягкий выдох с тремоло
 */
export type Instrument = 'mallet' | 'bell' | 'pluck' | 'chip' | 'pad';

export const INSTRUMENTS: readonly Instrument[] = ['mallet', 'bell', 'pluck', 'chip', 'pad'];

export interface SequenceSpec {
  /** Четвертей в минуту; шаг — шестнадцатая */
  bpm: number;
  scale: ScaleSpec;
  /** На шаге — ноты MIDI снизу вверх (несколько — аккорд); пусто — пауза */
  steps: number[][];
  instrument: Instrument;
  /** Громкость ноты удара */
  gain: number;
  /** Звон удара, с */
  decay: number;
}

/** Пентатоника набора от соль малой октавы: мотив по умолчанию ложится рядом со звуками интерфейса */
export const DEFAULT_SCALE: ScaleSpec = { root: 7, type: 'major-pentatonic', octave: 3 };

/** Длина шага-шестнадцатой, с */
export const stepSeconds = (bpm: number) => 60 / bpm / 4;

const round = (value: number, digits = 4) => Number(value.toFixed(digits));

/** Голоса одного удара инструмента */
export function instrumentVoices(
  instrument: Instrument,
  frequency: number,
  gain: number,
  decay: number,
  delay = 0,
): Voice[] {
  switch (instrument) {
    case 'mallet':
      return malletVoices(frequency, gain, decay, delay);
    // Модулятор в 3,5 раза выше и индекс спадает: удар яркий, звон темнеет — как у колокольчика
    case 'bell':
      return [
        {
          kind: 'tone',
          wave: 'sine',
          frequency,
          delay,
          gain,
          fm: { ratio: 3.5, depth: 2.4, depthEnd: 0.2 },
          envelope: { attack: 0.002, decay: round(decay * 1.6) },
        },
      ];
    case 'pluck':
      return [
        {
          kind: 'tone',
          wave: 'triangle',
          frequency,
          glideTo: round(frequency * 0.995, 2),
          delay,
          gain,
          drive: 0.2,
          filter: { type: 'lowpass', frequency: Math.min(5000, Math.round(frequency * 4)), q: 0.7 },
          envelope: { attack: 0.003, decay: round(decay * 0.8) },
        },
      ];
    // Прямоугольник на слух громче синуса той же громкости — тише и со срезом верха
    case 'chip':
      return [
        {
          kind: 'tone',
          wave: 'pulse',
          pulseWidth: 0.25,
          frequency,
          delay,
          gain: round(gain * 0.45),
          filter: { type: 'lowpass', frequency: 3200, q: 0.5 },
          envelope: { attack: 0.002, hold: round(decay * 0.25), decay: round(decay * 0.5) },
        },
      ];
    case 'pad':
      return [
        {
          kind: 'tone',
          wave: 'triangle',
          frequency,
          delay,
          gain: round(gain * 0.8),
          tremolo: { rate: 5, depth: 0.25 },
          vibrato: { rate: 4.5, depth: 8 },
          envelope: { attack: 0.06, decay: round(decay * 2) },
        },
      ];
  }
}

/** Голоса всех ударов сетки */
export function sequenceVoices(sequence: SequenceSpec): Voice[] {
  const step = stepSeconds(sequence.bpm);

  return sequence.steps.flatMap((notes, index) =>
    notes.flatMap((midi) =>
      instrumentVoices(
        sequence.instrument,
        round(midiToFrequency(midi), 2),
        sequence.gain,
        sequence.decay,
        round(index * step),
      ),
    ),
  );
}

const chord = (notes: number[]) => [...new Set(notes)].sort((x, y) => x - y);

/** Нота на шаге: есть — убрать, нет — добавить в аккорд */
export function toggleStepNote(sequence: SequenceSpec, index: number, midi: number): SequenceSpec {
  return {
    ...sequence,
    steps: sequence.steps.map((notes, i) =>
      i !== index
        ? notes
        : notes.includes(midi)
          ? notes.filter((n) => n !== midi)
          : chord([...notes, midi]),
    ),
  };
}

/**
 * Сетка в другой тональности: сдвиг по тонике и октаве (`transposition`), затем каждая нота — к
 * ближайшей ступени лада и в диапазон сетки. Совпавшие ноты аккорда сливаются в одну
 */
export function rescale(sequence: SequenceSpec, scale: ScaleSpec): SequenceSpec {
  const shift = transposition(sequence.scale, scale);

  return {
    ...sequence,
    scale,
    steps: sequence.steps.map((notes) =>
      chord(notes.map((midi) => foldIntoRange(quantize(midi + shift, scale), scale))),
    ),
  };
}

/** Сетка → мотив: голоса сетки и остальное из `base` (помещение, эхо, уровень) */
export function sequenceSound(
  sequence: SequenceSpec,
  base: Partial<Omit<SoundSpec, 'voices'>> = {},
): SoundSpec {
  return {
    category: 'motif',
    minLevel: 'subtle',
    minInterval: 1000,
    ...base,
    voices: sequenceVoices(sequence),
  };
}

/** Помещение мотивов по умолчанию: небольшой светлый зал, хвост полторы секунды */
export const MOTIF_ROOM: RoomSpec = {
  decay: 1.4,
  preDelay: 0.02,
  brightness: 0.45,
  width: 0.9,
  mix: 0.22,
};

const MOOD_INSTRUMENTS: Record<SoundMood, readonly Instrument[]> = {
  up: ['mallet', 'pluck', 'chip'],
  down: ['pluck', 'mallet'],
  bell: ['bell', 'mallet'],
  soft: ['pad', 'bell'],
};

/** Пик мотива не выше этого: запас до лимитера на помещение и наложение с другим звуком */
const MOTIF_PEAK = 0.85;

/**
 * Случайная сетка в характере, в ладу `scale`: вверх — подъём на всю фразу с трезвучием под последней
 * нотой, вниз — спуск с двузвучием в конце, звон — арпеджио туда-обратно с двузвучиями, мягко — редкие
 * ноты в нижней половине. Аккорд — ступени через одну (в мажоре — терции). В хроматике
 * мелодия идёт по мажору той же тоники: случайные полутона звучат ошибкой. Первый и последний шаг всегда
 * звучат; длина — сколько влезает в 3 с со звоном последнего удара; громкость — так, чтобы пик был 0,85.
 * Одно зерно — одна сетка.
 */
export function randomSequence(
  seed: number,
  mood: SoundMood = 'up',
  scale: ScaleSpec = DEFAULT_SCALE,
): SequenceSpec {
  const next = seededRandom(seed);
  const pick = <T>(items: readonly T[]) => items[Math.floor(next() * items.length)]!;
  const instrument = pick(MOOD_INSTRUMENTS[mood]);
  const bpm = 96 + Math.floor(next() * 5) * 8;
  const step = stepSeconds(bpm);
  const decay = round(mood === 'soft' ? 0.3 : 0.16 + next() * 0.1, 3);
  const hit = Math.max(
    ...instrumentVoices(instrument, 440, 1, decay).map((voice) => envelopeDuration(voice.envelope)),
  );
  const maxSteps = Math.floor((DESIGN_LIMITS.motif.maxDuration - 0.05 - hit) / step) + 1;
  const length = Math.min(maxSteps, 8 + Math.floor(next() * 9));
  const notes = scaleNotes(scale.type === 'chromatic' ? { ...scale, type: 'major' } : scale);
  const top = notes.length - 1;
  const half = Math.floor(top / 2);
  const density = mood === 'soft' ? 0.35 : 0.6;
  let index =
    mood === 'down'
      ? top - Math.floor(next() * 3)
      : mood === 'soft'
        ? Math.floor(next() * Math.min(4, half))
        : Math.floor(top * 0.15) + Math.floor(next() * 3);
  const base = index;
  let direction = 1;
  const tones = (degrees: number[]) =>
    chord(degrees.map((degree) => notes[Math.max(0, Math.min(top, degree))]!));
  const hits = Array.from({ length }, (_, i) => i === 0 || i === length - 1 || next() <= density);
  // Подъём и спуск растянуты на всю фразу: сколько ступеней осталось на сколько ударов
  let budget = mood === 'up' ? top - index : mood === 'down' ? index : 0;
  let left = hits.filter(Boolean).length - 1;

  const steps = hits.map((hit, i) => {
    if (!hit) return [];

    const last = i === length - 1;
    const twin = (mood === 'bell' && next() < 0.35) || (mood === 'soft' && next() < 0.2);
    // Вверх кончается трезвучием под нотой мелодии — мелодия остаётся сверху; вниз и звон — двузвучием
    const notesAt =
      last && mood === 'up'
        ? tones([index - 4, index - 2, index])
        : (last && mood !== 'soft') || twin
          ? tones([index, index + 2])
          : tones([index]);

    if (last) return notesAt;

    if (mood === 'up' || mood === 'down') {
      // Места хватает — шаг на одну-две ступени; мало — ноль или одна, повторы поровну по фразе, а не
      // кучей: округление доли «ступеней на удар» разносит их, как пиксели линии у Брезенхэма
      const move = budget >= left * 1.5 ? 1 + Math.floor(next() * 2) : Math.round(budget / left);

      budget -= move;
      left -= 1;
      index += mood === 'up' ? move : -move;
    } else if (mood === 'bell') {
      index += direction * 2;

      if (index >= base + 4 || index <= base) direction = -direction;
    } else {
      index = Math.max(0, Math.min(half, index + (next() < 0.5 ? -1 : 1)));
    }

    return notesAt;
  });

  const draft: SequenceSpec = { bpm, scale, steps, instrument, gain: 1, decay };
  const peak = peakGain({ minLevel: 'subtle', minInterval: 0, voices: sequenceVoices(draft) });

  return { ...draft, gain: round(Math.min(0.4, MOTIF_PEAK / peak), 3) };
}

/** Случайный мотив целиком — сетка с помещением мотивов; награда без генератора: `randomMotif(seedFromText(id))` */
export function randomMotif(seed: number, mood: SoundMood = 'up'): SoundSpec {
  return sequenceSound(randomSequence(seed, mood), { room: MOTIF_ROOM });
}
