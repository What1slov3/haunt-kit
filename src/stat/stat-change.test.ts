import { describe, expect, it } from 'vitest';

import { changeTone, formatChange } from './stat-change';

// Intl ставит неразрывные пробелы (разряды, перед %) — сравниваем с обычными
const plain = (text: string) => text.replace(/\s/g, ' ');

describe('formatChange', () => {
  it('проценты — из процентов, со знаком и десятыми', () => {
    expect(plain(formatChange(12.5, 'percent'))).toBe('+12,5 %');
    expect(plain(formatChange(-3.04, 'percent'))).toBe('-3 %');
  });

  it('число — со знаком и разрядами', () => {
    expect(plain(formatChange(1240, 'number'))).toBe('+1 240');
    expect(plain(formatChange(-7, 'number'))).toBe('-7');
  });

  it('ноль — без знака', () => {
    expect(plain(formatChange(0, 'percent'))).toBe('0 %');
  });

  it('локаль параметром', () => {
    expect(plain(formatChange(12.5, 'percent', 'en'))).toBe('+12.5%');
  });
});

describe('changeTone', () => {
  it('рост хорош по умолчанию', () => {
    expect(changeTone(5)).toBe('success');
    expect(changeTone(-5)).toBe('danger');
  });

  it('для «меньше — лучше» тон наоборот', () => {
    expect(changeTone(5, 'down')).toBe('danger');
    expect(changeTone(-5, 'down')).toBe('success');
  });

  it('ноль — нейтрально', () => {
    expect(changeTone(0)).toBe('neutral');
    expect(changeTone(0, 'down')).toBe('neutral');
  });
});
