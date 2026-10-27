import { describe, expect, it } from 'vitest';

import {
  foldIntoRange,
  frequencyToMidi,
  inScale,
  midiToFrequency,
  noteName,
  quantize,
  scaleNotes,
  transposition,
  type ScaleSpec,
} from './music';

const cMajor: ScaleSpec = { root: 0, type: 'major', octave: 4 };

describe('ноты', () => {
  it('ля первой октавы — 440 Гц, октава — вдвое; обратно — тот же номер', () => {
    expect(midiToFrequency(69)).toBe(440);
    expect(midiToFrequency(81)).toBeCloseTo(880);
    expect(frequencyToMidi(261.63)).toBeCloseTo(60, 2);
  });

  it('имена с октавой и диезом', () => {
    expect(noteName(60)).toBe('C4');
    expect(noteName(61)).toBe('C♯4');
    expect(noteName(47)).toBe('B2');
  });
});

describe('лады', () => {
  it('до мажор на две октавы: 15 нот от C4 до C6, без чёрных клавиш', () => {
    const notes = scaleNotes(cMajor);

    expect(notes).toHaveLength(15);
    expect(notes[0]).toBe(60);
    expect(notes.at(-1)).toBe(84);
    expect(notes.map(noteName).some((name) => name.includes('♯'))).toBe(false);
  });

  it('хроматика — все 25 полутонов, пентатоника — 11 нот', () => {
    expect(scaleNotes({ ...cMajor, type: 'chromatic' })).toHaveLength(25);
    expect(scaleNotes({ ...cMajor, type: 'minor-pentatonic' })).toHaveLength(11);
  });

  it('тоника сдвигает лад: соль мажор с фа-диезом, без фа', () => {
    const g: ScaleSpec = { root: 7, type: 'major', octave: 3 };

    expect(inScale(66, g)).toBe(true);
    expect(inScale(65, g)).toBe(false);
  });

  it('привязка к ладу — к ближайшей ступени, на равном расстоянии вниз', () => {
    expect(quantize(61, cMajor)).toBe(60);
    expect(quantize(66, cMajor)).toBe(65);
    expect(quantize(64, cMajor)).toBe(64);
  });

  it('нота за краем сетки возвращается на октаву', () => {
    expect(foldIntoRange(90, cMajor)).toBe(78);
    expect(foldIntoRange(50, cMajor)).toBe(62);
  });

  it('смена тоники — в ближайшую сторону, октава — на 12', () => {
    expect(transposition(cMajor, { ...cMajor, root: 2 })).toBe(2);
    expect(transposition(cMajor, { ...cMajor, root: 11 })).toBe(-1);
    expect(transposition(cMajor, { ...cMajor, octave: 3 })).toBe(-12);
    expect(transposition(cMajor, { ...cMajor, type: 'minor' })).toBe(0);
  });
});
