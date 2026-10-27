import { describe, expect, it } from 'vitest';

import {
  computePeaks,
  formatTime,
  nextRate,
  normalizePeaks,
  ratioAt,
  resamplePeaks,
  seekByKey,
} from './voice-math';

describe('normalizePeaks', () => {
  it('приводит к [0, 1] по максимуму модуля', () => {
    expect(normalizePeaks([0.1, -0.2, 0.05])).toEqual([0.5, 1, 0.25]);
  });

  it('тишина и мусор — нули', () => {
    expect(normalizePeaks([0, 0])).toEqual([0, 0]);
    expect(normalizePeaks([NaN, 1])).toEqual([0, 1]);
  });
});

describe('computePeaks', () => {
  it('усредняет модуль амплитуды по отрезкам', () => {
    // Два столбца по 4 сэмпла: средние |x| — 0.25 и 1
    expect(computePeaks([[0.5, -0.5, 0, 0, 1, -1, 1, -1]], 2)).toEqual([0.25, 1]);
  });

  it('смешивает каналы', () => {
    expect(
      computePeaks(
        [
          [1, 1, 0, 0],
          [0, 0, 0, 1],
        ],
        2,
      ),
    ).toEqual([1, 0.5]);
  });

  it('столбцов больше, чем сэмплов — каждый смотрит хотя бы на один', () => {
    expect(computePeaks([[0, 1]], 4)).toEqual([0, 0, 1, 1]);
  });

  it('пустой звук — нули нужной длины', () => {
    expect(computePeaks([], 3)).toEqual([0, 0, 0]);
    expect(computePeaks([[]], 2)).toEqual([0, 0]);
    expect(computePeaks([[1]], 0)).toEqual([]);
  });

  it('длинную запись считает за линейное время', () => {
    const samples = new Float32Array(16_000 * 120).map((_, i) => Math.sin(i / 10));
    const started = performance.now();
    const peaks = computePeaks([samples], 48);

    expect(peaks).toHaveLength(48);
    expect(performance.now() - started).toBeLessThan(500);
  });
});

describe('resamplePeaks', () => {
  it('та же длина — только нормировка', () => {
    expect(resamplePeaks([2, 4], 2)).toEqual([0.5, 1]);
  });

  it('сжатие — среднее по отрезкам', () => {
    expect(resamplePeaks([1, 1, 0, 2], 2)).toEqual([1, 1]);
  });

  it('растяжение — линейная интерполяция', () => {
    expect(resamplePeaks([0, 1], 5)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it('пустые пики — нули', () => {
    expect(resamplePeaks([], 3)).toEqual([0, 0, 0]);
  });
});

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [5.9, '0:05'],
    [65, '1:05'],
    [3725, '1:02:05'],
    [NaN, '0:00'],
    [Infinity, '0:00'],
    [-3, '0:00'],
  ])('%s → %s', (seconds, text) => {
    expect(formatTime(seconds)).toBe(text);
  });
});

describe('seekByKey', () => {
  it('стрелки — 5 с, страницы — 15 с, края — Home / End', () => {
    expect(seekByKey('ArrowRight', 10, 60)).toBe(15);
    expect(seekByKey('ArrowLeft', 10, 60)).toBe(5);
    expect(seekByKey('PageUp', 10, 60)).toBe(25);
    expect(seekByKey('Home', 10, 60)).toBe(0);
    expect(seekByKey('End', 10, 60)).toBe(60);
  });

  it('не выходит за границы и пропускает чужие клавиши', () => {
    expect(seekByKey('ArrowLeft', 2, 60)).toBe(0);
    expect(seekByKey('ArrowRight', 58, 60)).toBe(60);
    expect(seekByKey('Enter', 10, 60)).toBeNull();
  });
});

describe('ratioAt', () => {
  it('доля дорожки под курсором с обрезкой краёв', () => {
    expect(ratioAt(150, 100, 200)).toBe(0.25);
    expect(ratioAt(0, 100, 200)).toBe(0);
    expect(ratioAt(999, 100, 200)).toBe(1);
    expect(ratioAt(150, 100, 0)).toBe(0);
  });
});

describe('nextRate', () => {
  it('×1 → ×1.5 → ×2 → ×1', () => {
    expect([nextRate(1), nextRate(1.5), nextRate(2)]).toEqual([1.5, 2, 1]);
  });
});
