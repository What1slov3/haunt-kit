/*
 * Огибающие громкости — чистые функции, без Web Audio. Огибающая звука интерфейса — короткая
 * «ударная»: линейная атака, удержание, экспоненциальный спад до уровня sustain и линейное затухание
 * в ноль. `envelopeAt` считает ту же кривую, что строят `envelopeSteps` для AudioParam, — по ней
 * тесты проверяют форму, а история рисует звук без проигрывания.
 */

export interface Envelope {
  /** Секунды */
  attack: number;
  hold?: number;
  decay: number;
  /** Доля пика 0…1, на которой звук держится после спада; 0 — чисто ударный звук */
  sustain?: number;
  /** Сколько держать sustain, с */
  sustainTime?: number;
  release?: number;
}

/** Нижняя граница для экспоненты: exponentialRampToValueAtTime не принимает ноль */
export const SILENCE = 0.0001;

/** Полная длина огибающей, с */
export function envelopeDuration(envelope: Envelope): number {
  return (
    envelope.attack +
    (envelope.hold ?? 0) +
    envelope.decay +
    (envelope.sustainTime ?? 0) +
    (envelope.release ?? 0)
  );
}

export interface EnvelopeStep {
  /** Секунды от начала звука */
  time: number;
  value: number;
  /** Как AudioParam приходит к значению: прыжком, линейно или экспонентой */
  curve: 'set' | 'linear' | 'exponential';
}

/** Точки автоматизации для GainNode.gain: пик — `peak` */
export function envelopeSteps(envelope: Envelope, peak: number): EnvelopeStep[] {
  const top = Math.max(SILENCE, peak);
  const sustain = Math.max(SILENCE, top * (envelope.sustain ?? 0));
  const attackEnd = envelope.attack;
  const holdEnd = attackEnd + (envelope.hold ?? 0);
  const decayEnd = holdEnd + envelope.decay;
  const sustainEnd = decayEnd + (envelope.sustainTime ?? 0);
  const end = sustainEnd + (envelope.release ?? 0);
  const steps: EnvelopeStep[] = [
    { time: 0, value: SILENCE, curve: 'set' },
    { time: attackEnd, value: top, curve: 'linear' },
  ];

  if (holdEnd > attackEnd) steps.push({ time: holdEnd, value: top, curve: 'set' });

  steps.push({ time: decayEnd, value: sustain, curve: 'exponential' });

  if (sustainEnd > decayEnd) steps.push({ time: sustainEnd, value: sustain, curve: 'set' });

  if (end > sustainEnd) steps.push({ time: end, value: 0, curve: 'linear' });

  return steps;
}

/**
 * Значение огибающей в момент `t` (с) при пике `peak` — так же, как AudioParam интерполирует между
 * точками `envelopeSteps`: линейно или экспонентой (геометрически).
 */
export function envelopeAt(envelope: Envelope, t: number, peak = 1): number {
  const steps = envelopeSteps(envelope, peak);

  if (t <= 0) return t < 0 ? 0 : steps[0]!.value;

  for (let i = 1; i < steps.length; i++) {
    const from = steps[i - 1]!;
    const to = steps[i]!;

    if (t > to.time) continue;

    const span = to.time - from.time;
    const k = span > 0 ? (t - from.time) / span : 1;

    if (to.curve === 'set') return from.value;

    if (to.curve === 'exponential') return from.value * (to.value / from.value) ** k;

    return from.value + (to.value - from.value) * k;
  }

  return steps.at(-1)!.curve === 'linear' ? 0 : steps.at(-1)!.value;
}
