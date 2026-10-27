import { describe, expect, it } from 'vitest';

import { chamferPolygon, chamferRing, cutsFor } from './chamfer';

describe('cutsFor', () => {
  it('срезает только перечисленные углы', () => {
    expect(cutsFor(['tl', 'br'], 'var(--chamfer)')).toEqual({
      tl: 'var(--chamfer)',
      tr: '0px',
      br: 'var(--chamfer)',
      bl: '0px',
    });
  });
});

describe('chamferPolygon', () => {
  it('восемь вершин по часовой, срез — от кромки', () => {
    expect(chamferPolygon(cutsFor(['tl'], '10px'))).toBe(
      'polygon(10px 0px, calc(100% - 0px) 0px, 100% 0px, 100% calc(100% - 0px), calc(100% - 0px) 100%, 0px 100%, 0px calc(100% - 0px), 0px 10px)',
    );
  });
});

describe('chamferRing', () => {
  const ring = chamferRing(cutsFor(['tr'], '10px'), '1px');

  it('evenodd: внешний контур замкнут, затем внутренний', () => {
    const parts = ring
      .replace(/^polygon\(evenodd, /, '')
      .replace(/\)$/, '')
      .split(/, (?![^(]*\))/);

    expect(ring.startsWith('polygon(evenodd, ')).toBe(true);
    // 8 + возврат + 8 + возврат
    expect(parts).toHaveLength(18);
    expect(parts[8]).toBe(parts[0]);
    expect(parts[17]).toBe(parts[9]);
  });

  // Срез 45° со смещением на рамку b короче на (2 − √2)·b ≈ 0.5858·b: линия остаётся параллельной
  it('внутренний срез короче на (2 − √2) · толщину и не уходит в минус', () => {
    expect(ring).toContain('max(0px, 10px - 0.5858 * 1px)');
    expect(ring).toContain('max(0px, 0px - 0.5858 * 1px)');
  });
});
