import { describe, expect, it } from 'vitest';

import { driveCurve, impulseResponse, noiseSamples, pulseCoefficients } from './dsp';

const peak = (data: Float32Array) => data.reduce((max, value) => Math.max(max, Math.abs(value)), 0);

/** Средний перепад соседних отсчётов к средней амплитуде: чем выше, тем больше верха в сигнале */
function brightness(data: Float32Array): number {
  let diff = 0;
  let level = 0;

  for (let i = 1; i < data.length; i++) {
    diff += Math.abs(data[i]! - data[i - 1]!);
    level += Math.abs(data[i]!);
  }

  return diff / level;
}

const energy = (data: Float32Array, from: number, to: number) =>
  data.slice(from, to).reduce((sum, value) => sum + value * value, 0);

describe('noiseSamples', () => {
  it('у всех цветов пик 1; розовый темнее белого, коричневый темнее розового', () => {
    const white = noiseSamples('white', 8000);
    const pink = noiseSamples('pink', 8000);
    const brown = noiseSamples('brown', 8000);

    for (const data of [white, pink, brown]) expect(peak(data)).toBeCloseTo(1);

    expect(brightness(pink)).toBeLessThan(brightness(white));
    expect(brightness(brown)).toBeLessThan(brightness(pink));
  });

  it('одно зерно — один шум', () => {
    expect(noiseSamples('pink', 64, 7)).toEqual(noiseSamples('pink', 64, 7));
    expect(noiseSamples('pink', 64, 7)).not.toEqual(noiseSamples('pink', 64, 8));
  });
});

describe('pulseCoefficients', () => {
  it('ширина 0.5 — прямоугольник: только нечётные синусы 2 / nπ', () => {
    const { real, imag } = pulseCoefficients(0.5, 8);

    for (let n = 1; n <= 8; n++) {
      expect(real[n]).toBeCloseTo(0);
      expect(imag[n]).toBeCloseTo(n % 2 ? 2 / (n * Math.PI) : 0);
    }
  });

  it('узкий импульс богаче гармониками: вторая гармоника не ноль', () => {
    const { real, imag } = pulseCoefficients(0.25, 4);

    expect(Math.hypot(real[2]!, imag[2]!)).toBeGreaterThan(0.1);
  });
});

describe('driveCurve', () => {
  it('нечётная, не убывает и на краях ±1', () => {
    const curve = driveCurve(0.6, 101);

    expect(curve[0]).toBeCloseTo(-1);
    expect(curve[100]).toBeCloseTo(1);
    expect(curve[50]).toBeCloseTo(0);

    for (let i = 1; i < curve.length; i++) {
      expect(curve[i]!).toBeGreaterThanOrEqual(curve[i - 1]!);
    }
  });

  it('сильнее перегруз — тихий сигнал раньше доходит до пика', () => {
    expect(driveCurve(1, 101)[60]!).toBeGreaterThan(driveCurve(0.1, 101)[60]!);
  });
});

describe('impulseResponse', () => {
  const rate = 8000;

  it('длина — пауза плюс хвост; в паузе тишина; пик 1', () => {
    const [left, right] = impulseResponse({ decay: 0.5, preDelay: 0.05 }, rate);

    expect(left).toHaveLength(Math.round(0.05 * rate) + Math.ceil(0.5 * rate));
    expect(peak(left.slice(0, 0.05 * rate))).toBe(0);
    expect(Math.max(peak(left), peak(right))).toBeCloseTo(1);
  });

  it('хвост спадает: в конце энергии в сотни раз меньше, чем в начале', () => {
    const [left] = impulseResponse({ decay: 1 }, rate);
    const tenth = rate / 10;

    expect(energy(left, left.length - tenth, left.length)).toBeLessThan(
      energy(left, 0, tenth) / 100,
    );
  });

  it('ширина 0 — моно: каналы совпадают', () => {
    const [left, right] = impulseResponse({ decay: 0.3, width: 0 }, rate);

    expect(left).toEqual(right);
  });

  it('светлое помещение ярче тёмного', () => {
    const [bright] = impulseResponse({ decay: 0.6, brightness: 1 }, rate);
    const [dark] = impulseResponse({ decay: 0.6, brightness: 0 }, rate);

    expect(brightness(bright)).toBeGreaterThan(brightness(dark));
  });

  it('одни параметры — одна характеристика', () => {
    expect(impulseResponse({ decay: 0.4 }, rate)).toEqual(impulseResponse({ decay: 0.4 }, rate));
  });
});
