/*
 * Осциллограф — ядро фона `waveform`. Уровень голоса приходит извне (проп `level`, шина
 * `ambient.level()` — источник подключает приложение, например LiveKit); здесь только сглаживание и
 * форма линий. Без голоса линии почти ровные и дышат еле заметно — фон не «шумит» в тишине.
 */

/**
 * Сглаживание уровня: быстрая атака, медленный спад — как у индикатора громкости. `attack` и
 * `release` — постоянные времени, с.
 */
export function smoothLevel(
  current: number,
  target: number,
  dt: number,
  attack = 0.06,
  release = 0.45,
): number {
  const clamped = Math.min(1, Math.max(0, target));
  const tau = clamped > current ? attack : release;
  const k = 1 - Math.exp(-dt / Math.max(tau, 1e-3));

  return current + (clamped - current) * k;
}

/** Покой: уровень, ниже которого линия только дышит */
const IDLE = 0.04;

/**
 * Смещение линии `line` в точке `x` (0…1 по ширине) в момент `time`, примерно −1…1 амплитуды.
 * Сумма трёх синусов с несоизмеримыми частотами — форма не повторяется заметно; к краям линия
 * сходится в ноль (окно Ханна), как развёртка на экране осциллографа.
 */
export function waveSample(x: number, time: number, level: number, line: number): number {
  const window = Math.sin(Math.PI * Math.min(1, Math.max(0, x))) ** 2;
  const amp = IDLE + (1 - IDLE) * Math.min(1, Math.max(0, level));
  const phase = line * 1.7;
  const f = 1 + line * 0.35;
  const wave =
    0.55 * Math.sin(x * 9 * f + time * 2.1 + phase) +
    0.3 * Math.sin(x * 23 * f - time * 3.4 + phase * 2) +
    0.15 * Math.sin(x * 51 * f + time * 5.3 + phase * 3);

  return wave * amp * window;
}

/** Синтетический «голос» для историй: слоги по 150–300 мс и паузы — без микрофона и LiveKit */
export function syntheticVoice(time: number): number {
  const syllable = Math.max(0, Math.sin(time * 7.3) * Math.sin(time * 2.9 + 1));
  const phrase = Math.sin(time * 0.7) > -0.2 ? 1 : 0;

  return Math.min(1, syllable * 1.4 * phrase);
}
