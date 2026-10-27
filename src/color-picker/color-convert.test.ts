import { describe, expect, it } from 'vitest';

import {
  formatHsl,
  formatRgb,
  hexToHsv,
  hexToRgb,
  hslToRgb,
  hsvToHex,
  hsvToRgb,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  type Rgb,
} from './color';

describe('rgbToHex', () => {
  it('нижний регистр, два знака на канал', () => {
    expect(rgbToHex([11, 127, 119])).toBe('#0b7f77');
    expect(rgbToHex([0, 0, 0])).toBe('#000000');
  });

  it('дробные каналы округляет, выход за 0–255 прижимает', () => {
    expect(rgbToHex([254.6, 0.4, 127.5])).toBe('#ff0080');
    expect(rgbToHex([300, -4, 255.0000001])).toBe('#ff00ff');
  });
});

describe('rgb ↔ hsv', () => {
  it('опорные цвета', () => {
    expect(rgbToHsv([255, 0, 0])).toEqual({ h: 0, s: 1, v: 1 });
    expect(rgbToHsv([0, 255, 0])).toEqual({ h: 120, s: 1, v: 1 });
    expect(rgbToHsv([0, 0, 255])).toEqual({ h: 240, s: 1, v: 1 });
    expect(rgbToHsv([255, 0, 255])).toEqual({ h: 300, s: 1, v: 1 });
  });

  it('серый — без оттенка и насыщенности', () => {
    expect(rgbToHsv([128, 128, 128])).toEqual({ h: 0, s: 0, v: 128 / 255 });
    expect(rgbToHsv([0, 0, 0])).toEqual({ h: 0, s: 0, v: 0 });
  });

  it('hsvToRgb — обратная, каналы целые', () => {
    expect(hsvToRgb({ h: 0, s: 1, v: 1 })).toEqual([255, 0, 0]);
    expect(hsvToRgb({ h: 60, s: 1, v: 1 })).toEqual([255, 255, 0]);
    expect(hsvToRgb({ h: 210, s: 0.5, v: 0.8 })).toEqual([102, 153, 204]);
    expect(hsvToRgb({ h: 0, s: 0, v: 1 })).toEqual([255, 255, 255]);
  });

  it('туда и обратно без потерь по всем пресетам и случайным цветам', () => {
    const samples: Rgb[] = [
      [110, 92, 230],
      [11, 127, 119],
      [255, 216, 77],
      [1, 2, 3],
      [250, 250, 249],
    ];

    for (const rgb of samples) expect(hsvToRgb(rgbToHsv(rgb))).toEqual(rgb);
  });
});

describe('rgb ↔ hsl', () => {
  it('опорные цвета', () => {
    expect(rgbToHsl([255, 0, 0])).toEqual({ h: 0, s: 1, l: 0.5 });
    expect(rgbToHsl([255, 255, 255])).toEqual({ h: 0, s: 0, l: 1 });
  });

  it('туда и обратно без потерь', () => {
    const samples: Rgb[] = [
      [110, 92, 230],
      [11, 127, 119],
      [255, 216, 77],
      [0, 0, 0],
      [128, 128, 128],
    ];

    for (const rgb of samples) expect(hslToRgb(rgbToHsl(rgb))).toEqual(rgb);
  });
});

describe('hex ↔ hsv', () => {
  it('hsvToHex прижимает s и v к 0–1', () => {
    expect(hsvToHex({ h: 0, s: 1.2, v: 1 })).toBe('#ff0000');
    expect(hsvToHex({ h: 120, s: 1, v: -0.1 })).toBe('#000000');
  });

  it('у серого и чёрного оттенок и насыщенность берутся из прежнего', () => {
    const previous = { h: 200, s: 0.7, v: 0.5 };

    expect(hexToHsv('#808080', previous)).toEqual({ h: 200, s: 0, v: 128 / 255 });
    expect(hexToHsv('#000000', previous)).toEqual({ h: 200, s: 0.7, v: 0 });
    expect(hexToHsv('#ff0000', previous)).toEqual({ h: 0, s: 1, v: 1 });
  });

  it('без прежнего и с мусором — как есть', () => {
    expect(hexToHsv('#00ff00')).toEqual({ h: 120, s: 1, v: 1 });
    expect(hexToHsv('nope')).toEqual({ h: 0, s: 0, v: 0 });
  });

  it('hex → hsv → hex — тот же hex', () => {
    for (const hex of ['#6e5ce6', '#0b7f77', '#ffd84d', '#123456', '#fefefe']) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
      expect(rgbToHex(hexToRgb(hex)!)).toBe(hex);
    }
  });
});

describe('подписи', () => {
  it('rgb и hsl — целые, проценты округлены', () => {
    expect(formatRgb('#0b7f77')).toBe('rgb(11, 127, 119)');
    expect(formatHsl('#0b7f77')).toBe('hsl(176, 84%, 27%)');
    expect(formatHsl('#ff0000')).toBe('hsl(0, 100%, 50%)');
    expect(formatRgb('nope')).toBeNull();
  });
});
