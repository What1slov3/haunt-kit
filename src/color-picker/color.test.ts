import { describe, expect, it } from 'vitest';

import { accentPresets } from '../theme/accent';

import {
  contrastLevel,
  contrastRatio,
  hexToRgb,
  parseHex,
  readableTextOn,
  relativeLuminance,
} from './color';

describe('parseHex', () => {
  it('принимает 6 и 3 знака, с решёткой и без, в любом регистре', () => {
    expect(parseHex('#6E5CE6')).toBe('#6e5ce6');
    expect(parseHex('6e5ce6')).toBe('#6e5ce6');
    expect(parseHex(' #F0a ')).toBe('#ff00aa');
  });

  it('остальное — не цвет', () => {
    expect(parseHex('#12345')).toBeNull();
    expect(parseHex('zzzzzz')).toBeNull();
    expect(parseHex('')).toBeNull();
  });
});

describe('hexToRgb', () => {
  it('раскладывает на каналы', () => {
    expect(hexToRgb('#0b7f77')).toEqual([11, 127, 119]);
  });

  it('мусор — null', () => {
    expect(hexToRgb('nope')).toBeNull();
  });
});

describe('relativeLuminance', () => {
  it('чёрный — 0, белый — 1', () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0);
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 10);
  });
});

describe('contrastRatio', () => {
  it('белый на чёрном — 21, цвет сам с собой — 1', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#6e5ce6', '#6e5ce6')).toBeCloseTo(1, 10);
  });

  it('не зависит от порядка цветов', () => {
    expect(contrastRatio('#000', '#777')).toBeCloseTo(contrastRatio('#777', '#000') ?? 0, 10);
  });

  it('эталон WCAG: #777 на белом ≈ 4.48', () => {
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it('все пресеты акцента дают белому тексту не меньше AA', () => {
    for (const preset of Object.values(accentPresets)) {
      expect(contrastRatio(preset.accent, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('contrastLevel', () => {
  it('пороги 3 / 4.5 / 7', () => {
    expect(contrastLevel(2.9)).toBe('fail');
    expect(contrastLevel(3)).toBe('AA-large');
    expect(contrastLevel(4.5)).toBe('AA');
    expect(contrastLevel(7)).toBe('AAA');
  });
});

describe('readableTextOn', () => {
  it('на тёмной заливке — белый текст, на светлой — тёмный', () => {
    expect(readableTextOn('#1f6fc2')).toBe('light');
    expect(readableTextOn('#ffd84d')).toBe('dark');
  });
});
