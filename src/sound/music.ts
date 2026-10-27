/*
 * Ноты и лады — чистые функции над номерами MIDI (60 — до первой октавы, C4; 69 — ля, 440 Гц).
 * Номер, а не частота и не имя: так ноты складываются в аккорды, транспонируются на полутон и
 * привязываются к ладу целой арифметикой, а частота считается в самом конце, равномерной темперацией.
 */

export const PITCH_CLASSES = [
  'C',
  'C♯',
  'D',
  'D♯',
  'E',
  'F',
  'F♯',
  'G',
  'G♯',
  'A',
  'A♯',
  'B',
] as const;

/** Лады — ступени от тоники в полутонах */
export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  'harmonic-minor': [0, 2, 3, 5, 7, 8, 11],
  'major-pentatonic': [0, 2, 4, 7, 9],
  'minor-pentatonic': [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
} as const satisfies Record<string, readonly number[]>;

export type ScaleName = keyof typeof SCALES;

export const SCALE_NAMES = Object.keys(SCALES) as ScaleName[];

export interface ScaleSpec {
  /** Тоника, 0…11: 0 — до, 7 — соль */
  root: number;
  type: ScaleName;
  /** Октава нижней тоники сетки: 3 — от тоники малой октавы */
  octave: number;
}

/** Октав в сетке шагов: две и верхняя тоника — хватает на мотив, сетка не становится простынёй */
export const SCALE_OCTAVES = 2;

export const midiToFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export const frequencyToMidi = (frequency: number) => 69 + 12 * Math.log2(frequency / 440);

const mod12 = (value: number) => ((value % 12) + 12) % 12;

/** Имя ноты с октавой: 61 → «C♯4» */
export function noteName(midi: number): string {
  return `${PITCH_CLASSES[mod12(midi)]}${Math.floor(midi / 12) - 1}`;
}

/** Нижняя тоника сетки, MIDI */
export const scaleBottom = (scale: ScaleSpec) => (scale.octave + 1) * 12 + mod12(scale.root);

export function inScale(midi: number, scale: ScaleSpec): boolean {
  return (SCALES[scale.type] as readonly number[]).includes(mod12(midi - scale.root));
}

/** Ноты лада снизу вверх: от нижней тоники на `SCALE_OCTAVES` октав, верхняя тоника включена */
export function scaleNotes(scale: ScaleSpec): number[] {
  const bottom = scaleBottom(scale);
  const notes: number[] = [];

  for (let midi = bottom; midi <= bottom + SCALE_OCTAVES * 12; midi++) {
    if (inScale(midi, scale)) notes.push(midi);
  }

  return notes;
}

/** Ближайшая нота лада; на равном расстоянии — нижняя */
export function quantize(midi: number, scale: ScaleSpec): number {
  for (let distance = 0; distance < 12; distance++) {
    if (inScale(midi - distance, scale)) return midi - distance;

    if (inScale(midi + distance, scale)) return midi + distance;
  }

  return midi;
}

/** Нота в диапазон сетки — сдвигом на октаву: высота класса сохраняется, нота не пропадает за краем */
export function foldIntoRange(midi: number, scale: ScaleSpec): number {
  const bottom = scaleBottom(scale);
  const top = bottom + SCALE_OCTAVES * 12;
  let note = midi;

  while (note > top) note -= 12;

  while (note < bottom) note += 12;

  return note;
}

/**
 * Сдвиг нот при смене тональности: новая тоника транспонирует (в ближайшую сторону, не дальше
 * тритона), новая октава — на октаву; смена лада не двигает, ноты потом подтягиваются к ладу
 */
export function transposition(from: ScaleSpec, to: ScaleSpec): number {
  const step = mod12(to.root - from.root);

  return (step > 6 ? step - 12 : step) + (to.octave - from.octave) * 12;
}
