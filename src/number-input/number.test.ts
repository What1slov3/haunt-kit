import { describe, expect, it } from 'vitest';

import {
  clamp,
  formatNumber,
  parseNumber,
  precisionOf,
  sanitizeNumberText,
  stepNumber,
} from './number';

describe('precisionOf', () => {
  it('считает знаки после запятой у шага', () => {
    expect(precisionOf(1)).toBe(0);
    expect(precisionOf(0.25)).toBe(2);
    expect(precisionOf(0.1)).toBe(1);
  });
});

describe('clamp', () => {
  it('зажимает в границы, любая граница необязательна', () => {
    expect(clamp(120, { min: 0, max: 99 })).toBe(99);
    expect(clamp(-3, { min: 0 })).toBe(0);
    expect(clamp(5, {})).toBe(5);
  });
});

describe('parseNumber', () => {
  it('понимает запятую как десятичный разделитель', () => {
    expect(parseNumber(' 1,5 ')).toBe(1.5);
  });

  it('пустое, «-» и мусор — не число', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('-')).toBeNull();
    expect(parseNumber('1.2.3')).toBeNull();
  });
});

describe('formatNumber', () => {
  it('держит число знаков шага', () => {
    expect(formatNumber(1.5, 2)).toBe('1.50');
    expect(formatNumber(7, 0)).toBe('7');
    expect(formatNumber(null, 0)).toBe('');
  });
});

describe('sanitizeNumberText', () => {
  it('оставляет цифры, один разделитель и минус в начале', () => {
    expect(sanitizeNumberText('-1a2,3.4-', true, true)).toBe('-12,34');
  });

  it('без отрицательных и дробей — только цифры', () => {
    expect(sanitizeNumberText('-1.5', false, false)).toBe('15');
  });
});

describe('stepNumber', () => {
  it('прибавляет шаг и зажимает в границы', () => {
    expect(stepNumber(98, 5, 1, { max: 99 })).toBe(99);
    expect(stepNumber(3, -10, 1, { min: 0 })).toBe(0);
  });

  it('округляет до точности шага — без хвостов плавающей точки', () => {
    expect(stepNumber(0.1, 0.2, 0.1, {})).toBe(0.3);
  });

  it('с пустого поля начинает с нижней границы', () => {
    expect(stepNumber(null, 1, 1, { min: 5 })).toBe(5);
    expect(stepNumber(null, -1, 1, {})).toBe(0);
  });
});
