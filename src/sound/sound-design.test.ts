import { describe, expect, it } from 'vitest';

import {
  checkSound,
  normalizeGain,
  peakGain,
  randomSound,
  seedFromText,
  SOUND_MOODS,
  totalGain,
} from './sound-design';
import { soundDuration, SOUND_NAMES, SOUNDS, type SoundSpec } from './sounds';

const tone = (frequency: number, gain: number, delay = 0): SoundSpec['voices'][number] => ({
  kind: 'tone',
  wave: 'sine',
  frequency,
  delay,
  gain,
  envelope: { attack: 0.005, decay: 0.1 },
});

const spec = (...voices: SoundSpec['voices']): SoundSpec => ({
  minLevel: 'subtle',
  minInterval: 100,
  voices,
});

describe('checkSound', () => {
  it('звуки набора проходят свои же правила', () => {
    for (const name of SOUND_NAMES) expect(checkSound(SOUNDS[name]), name).toEqual([]);
  });

  it('пустой, громкий, длинный и пищащий звук — каждый со своим замечанием', () => {
    expect(checkSound(spec())).toEqual([{ code: 'empty' }]);
    expect(checkSound(spec(tone(440, 0.6), tone(660, 0.6)))).toEqual([{ code: 'gain' }]);
    expect(checkSound(spec(tone(440, 0.3, 0.45)))).toEqual([{ code: 'duration' }]);
    expect(checkSound(spec(tone(440, 0.3), tone(3000, 0.2)))).toEqual([
      { code: 'harsh', voice: 1 },
    ]);
  });

  it('тихий обертон колотушки в высоком регистре — не писк', () => {
    expect(checkSound(spec(tone(500, 0.3), tone(2000, 0.04)))).toEqual([]);
  });

  it('мотив: длина до трёх секунд, хвост эффектов — до четырёх', () => {
    const long = spec(tone(440, 0.3, 1.2));

    expect(checkSound(long)).toEqual([{ code: 'duration' }]);
    expect(checkSound({ ...long, category: 'motif' })).toEqual([]);
    expect(checkSound({ ...long, category: 'motif', room: { decay: 4.5, mix: 0.2 } })).toEqual([
      { code: 'tail' },
    ]);
    expect(
      checkSound({ ...spec(tone(440, 0.3)), echo: { time: 0.3, feedback: 0.8, mix: 0.5 } }),
    ).toEqual([{ code: 'tail' }]);
  });
});

describe('peakGain', () => {
  it('аккорд складывается, удары по очереди — нет', () => {
    expect(peakGain(spec(tone(440, 0.4), tone(660, 0.4)))).toBeCloseTo(0.8, 2);
    expect(peakGain(spec(tone(440, 0.4), tone(660, 0.4, 0.3)))).toBeCloseTo(0.4, 2);
    expect(totalGain(spec(tone(440, 0.4), tone(660, 0.4, 0.3)))).toBeCloseTo(0.8);
  });
});

describe('normalizeGain', () => {
  it('громкий звук сводится к 0.9 пропорционально, тихий не меняется', () => {
    const loud = normalizeGain(spec(tone(440, 0.6), tone(660, 0.9)));

    expect(totalGain(loud)).toBeCloseTo(0.9, 2);
    expect(loud.voices[0]!.gain / loud.voices[1]!.gain).toBeCloseTo(0.6 / 0.9, 2);

    const quiet = spec(tone(440, 0.3));

    expect(normalizeGain(quiet)).toBe(quiet);
  });
});

describe('randomSound', () => {
  it('любой мотив — в правилах набора', () => {
    for (const mood of SOUND_MOODS) {
      for (let seed = 0; seed < 200; seed++) {
        const motif = randomSound(seed, mood);

        expect(checkSound(motif), `${mood}:${seed}`).toEqual([]);
        expect(soundDuration(motif)).toBeLessThan(0.5);
      }
    }
  });

  it('одно зерно — один мотив; зерно из текста стабильно', () => {
    expect(randomSound(42)).toEqual(randomSound(42));
    expect(randomSound(42)).not.toEqual(randomSound(43));
    expect(seedFromText('user:maria')).toBe(seedFromText('user:maria'));
    expect(seedFromText('user:maria')).not.toBe(seedFromText('user:ivan'));
  });

  it('вверх — ноты по возрастанию, вниз — по убыванию', () => {
    const notes = (motif: SoundSpec) =>
      motif.voices
        .filter((_, i) => i % 2 === 0)
        .map((voice) => (voice.kind === 'tone' ? voice.frequency : 0));

    for (let seed = 0; seed < 50; seed++) {
      const up = notes(randomSound(seed, 'up'));
      const down = notes(randomSound(seed, 'down'));

      expect(up).toEqual([...up].sort((a, b) => a - b));
      expect(down).toEqual([...down].sort((a, b) => b - a));
    }
  });
});
