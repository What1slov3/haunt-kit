import { describe, expect, it } from 'vitest';

import { areaFromPoint, hueFromPoint, nudgeArea, nudgeHue } from './hsv-controls';

const box = { left: 10, top: 20, width: 200, height: 100 };

describe('areaFromPoint', () => {
  it('вправо — насыщеннее, вверх — ярче', () => {
    expect(areaFromPoint(10, 20, box)).toEqual({ s: 0, v: 1 });
    expect(areaFromPoint(210, 120, box)).toEqual({ s: 1, v: 0 });
    expect(areaFromPoint(110, 70, box)).toEqual({ s: 0.5, v: 0.5 });
  });

  it('за краем — край', () => {
    expect(areaFromPoint(-100, 500, box)).toEqual({ s: 0, v: 0 });
    expect(areaFromPoint(1000, -50, box)).toEqual({ s: 1, v: 1 });
  });

  it('нулевой размер — без деления на ноль', () => {
    expect(areaFromPoint(5, 5, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ s: 0, v: 0 });
  });
});

describe('hueFromPoint', () => {
  it('доля ширины в градусы, правый край — 359, а не 360', () => {
    expect(hueFromPoint(10, box)).toBe(0);
    expect(hueFromPoint(110, box)).toBe(180);
    expect(hueFromPoint(500, box)).toBe(359);
  });
});

describe('nudgeArea', () => {
  it('стрелки — 1 %, Shift — 10 %', () => {
    expect(nudgeArea({ s: 0.5, v: 0.5 }, 'ArrowRight', false)).toEqual({ s: 0.51, v: 0.5 });
    expect(nudgeArea({ s: 0.5, v: 0.5 }, 'ArrowUp', true)).toEqual({ s: 0.5, v: 0.6 });
    expect(nudgeArea({ s: 0.5, v: 0.5 }, 'PageDown', false)).toEqual({ s: 0.5, v: 0.4 });
  });

  it('прижимается к краям, Home / End — насыщенность', () => {
    expect(nudgeArea({ s: 0.995, v: 0 }, 'ArrowRight', false)).toEqual({ s: 1, v: 0 });
    expect(nudgeArea({ s: 0.5, v: 0 }, 'ArrowDown', false)).toEqual({ s: 0.5, v: 0 });
    expect(nudgeArea({ s: 0.5, v: 0.3 }, 'Home', false)).toEqual({ s: 0, v: 0.3 });
    expect(nudgeArea({ s: 0.5, v: 0.3 }, 'End', false)).toEqual({ s: 1, v: 0.3 });
  });

  it('чужая клавиша — null', () => {
    expect(nudgeArea({ s: 0, v: 0 }, 'Enter', false)).toBeNull();
  });
});

describe('nudgeHue', () => {
  it('стрелки — 1°, Shift и PageUp — 10°, края 0 и 359', () => {
    expect(nudgeHue(100, 'ArrowRight', false)).toBe(101);
    expect(nudgeHue(100, 'ArrowDown', true)).toBe(90);
    expect(nudgeHue(355, 'PageUp', false)).toBe(359);
    expect(nudgeHue(3, 'ArrowLeft', true)).toBe(0);
    expect(nudgeHue(100, 'End', false)).toBe(359);
    expect(nudgeHue(100, 'Tab', false)).toBeNull();
  });
});
