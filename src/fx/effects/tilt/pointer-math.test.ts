import { describe, expect, it } from 'vitest';

import { magneticOffset, tiltAt } from './pointer-math';

const rect = { left: 100, top: 100, width: 200, height: 100 };

describe('tiltAt', () => {
  it('в центре — ровно, блик посередине', () => {
    expect(tiltAt(rect, 200, 150, 10)).toEqual({
      rotateX: -0,
      rotateY: 0,
      glareX: 0.5,
      glareY: 0.5,
    });
  });

  it('правый верхний угол — наклон на максимум к курсору', () => {
    expect(tiltAt(rect, 300, 100, 10)).toEqual({ rotateX: 10, rotateY: 10, glareX: 1, glareY: 0 });
  });

  it('за пределами — как на краю, не больше максимума', () => {
    expect(tiltAt(rect, 1000, 1000, 8)).toMatchObject({ rotateX: -8, rotateY: 8 });
  });

  it('нулевой размер — без наклона', () => {
    expect(tiltAt({ ...rect, width: 0, height: 0 }, 0, 0, 8)).toMatchObject({ rotateY: 0 });
  });
});

describe('magneticOffset', () => {
  const options = { strength: 0.3, max: 6, reach: 20 };
  const button = { left: 0, top: 0, width: 80, height: 28 };

  it('тянется к курсору на долю расстояния', () => {
    expect(magneticOffset(button, 50, 14, options)).toEqual({ x: 3, y: 0 });
  });

  it('не дальше max', () => {
    const offset = magneticOffset(button, 95, 40, options)!;

    expect(Math.hypot(offset.x, offset.y)).toBeCloseTo(6);
  });

  it('вне зоны — null', () => {
    expect(magneticOffset(button, 200, 14, options)).toBeNull();
    expect(magneticOffset(button, 40, -21, options)).toBeNull();
  });
});
