import { describe, expect, it } from 'vitest';

import {
  clampOffset,
  clampScale,
  fitSize,
  IDENTITY,
  isZoomed,
  MAX_SCALE,
  panBy,
  wheelFactor,
  zoomAt,
} from './lightbox-math';

const stage = { width: 1000, height: 600 };
const image = { width: 800, height: 450 };

describe('fitSize', () => {
  it('вписывает по узкой стороне с сохранением пропорций', () => {
    expect(fitSize({ width: 4000, height: 1000 }, stage)).toEqual({ width: 1000, height: 250 });
    expect(fitSize({ width: 1000, height: 3000 }, stage)).toEqual({ width: 200, height: 600 });
  });

  it('не увеличивает маленькую картинку', () => {
    expect(fitSize({ width: 300, height: 200 }, stage)).toEqual({ width: 300, height: 200 });
  });

  it('нулевые размеры — нулевой результат', () => {
    expect(fitSize({ width: 0, height: 10 }, stage)).toEqual({ width: 0, height: 0 });
  });
});

describe('clampScale', () => {
  it('держит масштаб в [1, MAX]', () => {
    expect(clampScale(0.2)).toBe(1);
    expect(clampScale(3)).toBe(3);
    expect(clampScale(100)).toBe(MAX_SCALE);
  });
});

describe('clampOffset', () => {
  it('на масштабе 1 картинка меньше сцены — всегда по центру', () => {
    expect(clampOffset({ scale: 1, x: 120, y: -40 }, image, stage)).toEqual(IDENTITY);
  });

  it('край увеличенной картинки не заходит внутрь сцены', () => {
    // 800·2 = 1600: по x запас (1600 − 1000) / 2 = 300; 450·2 = 900: по y (900 − 600) / 2 = 150
    expect(clampOffset({ scale: 2, x: 900, y: -900 }, image, stage)).toEqual({
      scale: 2,
      x: 300,
      y: -150,
    });
  });

  it('ось, где картинка всё ещё уже сцены, остаётся по центру', () => {
    expect(clampOffset({ scale: 1.2, x: 50, y: 80 }, image, stage)).toEqual({
      scale: 1.2,
      x: 0,
      y: 0,
    });
  });
});

describe('zoomAt', () => {
  it('в центре — масштаб без сдвига', () => {
    expect(zoomAt(IDENTITY, 2, { x: 0, y: 0 }, image, stage)).toEqual({ scale: 2, x: 0, y: 0 });
  });

  it('точка под курсором остаётся под курсором', () => {
    const point = { x: 200, y: 100 };
    const view = zoomAt(IDENTITY, 2, point, image, stage);
    // Точка картинки под курсором — (p − t) / s; до масштаба (t = 0, s = 1) это сама p
    const after = { x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale };

    expect(view).toEqual({ scale: 2, x: -200, y: -100 });
    expect(after).toEqual(point);
  });

  it('сдвиг к курсору ограничен краями', () => {
    expect(zoomAt(IDENTITY, 2, { x: 500, y: 300 }, image, stage)).toEqual({
      scale: 2,
      x: -300,
      y: -150,
    });
  });

  it('уход к масштабу 1 и ниже — исходный вид', () => {
    expect(zoomAt({ scale: 3, x: 100, y: 50 }, 0.5, { x: 10, y: 10 }, image, stage)).toBe(IDENTITY);
  });

  it('масштаб не больше максимума', () => {
    expect(zoomAt(IDENTITY, 50, { x: 0, y: 0 }, image, stage).scale).toBe(MAX_SCALE);
  });
});

describe('panBy', () => {
  it('сдвигает от состояния нажатия и упирается в края', () => {
    const start = { scale: 2, x: 100, y: 0 };

    expect(panBy(start, { x: 50, y: 20 }, image, stage)).toEqual({ scale: 2, x: 150, y: 20 });
    expect(panBy(start, { x: 5000, y: 5000 }, image, stage)).toEqual({ scale: 2, x: 300, y: 150 });
  });
});

describe('wheelFactor', () => {
  it('прокрутка вниз уменьшает, вверх — увеличивает, обратимо', () => {
    expect(wheelFactor(100)).toBeLessThan(1);
    expect(wheelFactor(-100)).toBeGreaterThan(1);
    expect(wheelFactor(100) * wheelFactor(-100)).toBeCloseTo(1);
  });

  it('строки и страницы переводятся в пиксели', () => {
    expect(wheelFactor(3, 1)).toBeCloseTo(wheelFactor(48));
    expect(wheelFactor(1, 2)).toBeCloseTo(wheelFactor(400));
  });
});

describe('isZoomed', () => {
  it('исходный вид не считается увеличенным', () => {
    expect(isZoomed(IDENTITY)).toBe(false);
    expect(isZoomed({ scale: 1.5, x: 0, y: 0 })).toBe(true);
  });
});
