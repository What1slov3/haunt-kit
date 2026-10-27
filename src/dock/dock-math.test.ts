import { describe, expect, it } from 'vitest';

import { dockGrowth, dockLayout, dockScale } from './dock-math';

const options = { size: 40, max: 1.6, range: 120 };
// Пять пунктов по 40 px с зазором 8: центры через 48
const centers = [20, 68, 116, 164, 212];

describe('dockScale', () => {
  it('под курсором — максимум, на границе и дальше — 1', () => {
    expect(dockScale(0, options)).toBeCloseTo(1.6);
    expect(dockScale(120, options)).toBe(1);
    expect(dockScale(-500, options)).toBe(1);
  });

  it('на полпути — половина прибавки, симметрично', () => {
    expect(dockScale(60, options)).toBeCloseTo(1.3);
    expect(dockScale(-60, options)).toBeCloseTo(1.3);
  });

  it('range 0 — без увеличения', () => {
    expect(dockScale(0, { ...options, range: 0 })).toBe(1);
  });
});

describe('dockLayout', () => {
  it('без курсора — покой', () => {
    expect(dockLayout(centers, null, options)).toEqual(
      centers.map(() => ({ scale: 1, offset: 0 })),
    );
  });

  it('курсор над средним — ряд раздвигается симметрично, средний на месте', () => {
    const layout = dockLayout(centers, 116, options);

    expect(layout[2]?.scale).toBeCloseTo(1.6);
    expect(layout[2]?.offset).toBeCloseTo(0);
    expect(layout[0]?.offset).toBeCloseTo(-(layout[4]?.offset ?? 0));
    expect(layout[1]?.offset).toBeLessThan(0);
    expect(layout[3]?.offset).toBeGreaterThan(0);
  });

  it('соседи не налезают: зазор между краями не меньше покоя', () => {
    const layout = dockLayout(centers, 90, options);

    for (let i = 1; i < centers.length; i += 1) {
      const a = layout[i - 1]!;
      const b = layout[i]!;
      const rightA = centers[i - 1]! + a.offset + (options.size * a.scale) / 2;
      const leftB = centers[i]! + b.offset - (options.size * b.scale) / 2;

      expect(leftB - rightA).toBeCloseTo(8);
    }
  });

  it('курсор у левого края — ряд растёт вправо', () => {
    const layout = dockLayout(centers, 0, options);

    expect(layout[0]?.offset).toBeGreaterThanOrEqual(0);
  });
});

describe('dockGrowth', () => {
  it('в покое — ноль', () => {
    expect(dockGrowth(dockLayout(centers, null, options), 40)).toEqual({ start: 0, end: 0 });
  });

  it('курсор посередине — растёт поровну в обе стороны, вместе — на всю прибавку', () => {
    const layout = dockLayout(centers, 116, options);
    const growth = dockGrowth(layout, 40);
    const total = layout.reduce((sum, item) => sum + (item.scale - 1) * 40, 0);

    expect(growth.start).toBeCloseTo(growth.end);
    expect(growth.start + growth.end).toBeCloseTo(total);
  });
});
