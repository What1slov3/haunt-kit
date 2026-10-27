import { describe, expect, it } from 'vitest';

import {
  INSTRUMENTS,
  instrumentVoices,
  randomMotif,
  randomSequence,
  sequenceSound,
  rescale,
  sequenceVoices,
  stepSeconds,
  toggleStepNote,
  type SequenceSpec,
} from './sequence';
import { midiToFrequency, SCALE_NAMES, scaleNotes, type ScaleSpec } from './music';
import { checkSound, SOUND_MOODS } from './sound-design';
import { soundDuration } from './sounds';

const sequence: SequenceSpec = {
  bpm: 120,
  scale: { root: 7, type: 'major-pentatonic', octave: 3 },
  steps: [[67], [], [71], [], [74], [], [], [79]],
  instrument: 'bell',
  gain: 0.3,
  decay: 0.2,
};

describe('sequenceVoices', () => {
  it('удар на каждой ноте, пауза — без голосов; задержка — номер шага × шестнадцатая', () => {
    const voices = sequenceVoices(sequence);
    const step = stepSeconds(120);

    expect(voices).toHaveLength(4);
    expect(voices.map((voice) => voice.delay)).toEqual(
      [0, 2, 4, 7].map((i) => Number((i * step).toFixed(4))),
    );
    expect(voices[0]).toMatchObject({ kind: 'tone', frequency: 392 });
  });

  it('аккорд на шаге — по голосу на ноту, все с одной задержкой', () => {
    const voices = sequenceVoices({ ...sequence, steps: [[60, 64, 67]] });

    expect(voices).toHaveLength(3);
    expect(new Set(voices.map((voice) => voice.delay))).toEqual(new Set([0]));
  });

  it('мотив из сетки — класс motif и проходит правила набора', () => {
    const motif = sequenceSound(sequence);

    expect(motif.category).toBe('motif');
    expect(checkSound(motif)).toEqual([]);
  });

  it('у каждого инструмента удар в правилах набора и не тише нуля', () => {
    for (const instrument of INSTRUMENTS) {
      const voices = instrumentVoices(instrument, 440, 0.3, 0.2);

      expect(voices.length, instrument).toBeGreaterThan(0);
      expect(checkSound({ minLevel: 'subtle', minInterval: 0, voices }), instrument).toEqual([]);
    }
  });
});

describe('правка сетки', () => {
  it('нота на шаге добавляется в аккорд по высоте и убирается повторным нажатием', () => {
    const added = toggleStepNote(sequence, 0, 62);

    expect(added.steps[0]).toEqual([62, 67]);
    expect(toggleStepNote(added, 0, 62).steps[0]).toEqual([67]);
  });

  it('новая тоника транспонирует мотив, новый лад подтягивает ноты к своим ступеням', () => {
    const inA = rescale(sequence, { ...sequence.scale, root: 9 });

    expect(inA.steps[0]).toEqual([69]);
    expect(inA.steps[2]).toEqual([73]);

    const minor = rescale(sequence, { ...sequence.scale, type: 'minor' });

    // Си в соль миноре — си-бемоль: терция становится малой
    expect(minor.steps[2]).toEqual([70]);
  });

  it('ноты, слившиеся после привязки к ладу, остаются одной нотой', () => {
    const chromatic: ScaleSpec = { ...sequence.scale, type: 'chromatic' };
    const cluster: SequenceSpec = { ...sequence, scale: chromatic, steps: [[60, 61]] };

    // До-диез не ступень соль мажора — подтягивается к до, к уже взятой ноте
    expect(rescale(cluster, { ...chromatic, type: 'major' }).steps[0]).toEqual([60]);
  });
});

describe('randomSequence и randomMotif', () => {
  it('любой случайный мотив — в правилах набора и короче трёх секунд', () => {
    for (const mood of SOUND_MOODS) {
      for (let seed = 0; seed < 120; seed++) {
        const motif = randomMotif(seed, mood);

        expect(checkSound(motif), `${mood}:${seed}`).toEqual([]);
        expect(soundDuration(motif)).toBeLessThan(3);
      }
    }
  });

  it('в любом ладу ноты — из лада, мотив — в правилах набора', () => {
    for (const type of SCALE_NAMES) {
      const scale: ScaleSpec = { root: 2, type, octave: 3 };
      const allowed = new Set(scaleNotes(scale));

      for (let seed = 0; seed < 30; seed++) {
        const random = randomSequence(seed, SOUND_MOODS[seed % 4], scale);

        expect(
          random.steps.flat().every((midi) => allowed.has(midi)),
          type,
        ).toBe(true);
        expect(checkSound(sequenceSound(random)), `${type}:${seed}`).toEqual([]);
      }
    }
  });

  it('вверх кончается трезвучием и не топчется: нота подряд не больше трёх раз', () => {
    for (let seed = 0; seed < 60; seed++) {
      const { steps } = randomSequence(seed, 'up');
      const tops = steps.filter((notes) => notes.length > 0).map((notes) => notes.at(-1));
      let run = 1;

      expect(steps.at(-1)!.length).toBe(3);

      for (let i = 1; i < tops.length; i++) {
        run = tops[i] === tops[i - 1] ? run + 1 : 1;
        expect(run, `seed ${seed}`).toBeLessThanOrEqual(3);
      }
    }
  });

  it('первый и последний шаг звучат; одно зерно — одна сетка', () => {
    for (let seed = 0; seed < 50; seed++) {
      const { steps } = randomSequence(seed, 'soft');

      expect(steps[0]!.length).toBeGreaterThan(0);
      expect(steps.at(-1)!.length).toBeGreaterThan(0);
    }

    expect(randomSequence(42, 'bell')).toEqual(randomSequence(42, 'bell'));
    expect(randomSequence(42, 'bell')).not.toEqual(randomSequence(43, 'bell'));
  });

  it('вверх — ноты не опускаются, вниз — не поднимаются', () => {
    // Мелодия вверх — верхняя нота шага (трезвучие под ней), вниз — нижняя (двузвучие над ней)
    const melody = (spec: SequenceSpec, voice: 'top' | 'bottom') =>
      spec.steps
        .filter((notes) => notes.length > 0)
        .map((notes) => midiToFrequency(voice === 'top' ? notes.at(-1)! : notes[0]!));

    for (let seed = 0; seed < 50; seed++) {
      const up = melody(randomSequence(seed, 'up'), 'top');
      const down = melody(randomSequence(seed, 'down'), 'bottom');

      expect(up).toEqual([...up].sort((a, b) => a - b));
      expect(down).toEqual([...down].sort((a, b) => b - a));
    }
  });
});
