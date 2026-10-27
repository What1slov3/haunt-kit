import { describe, expect, it } from 'vitest';

import {
  CENTERED,
  clampCrop,
  clampScale,
  cropRegion,
  cropTransform,
  exportSize,
  panCrop,
  pixelRatio,
  visibleFraction,
  zoomCrop,
} from './crop-math';

const landscape = { width: 800, height: 400 };
const portrait = { width: 300, height: 600 };
const mask = { width: 200, height: 200 };

describe('visibleFraction', () => {
  it('при scale 1 короткая сторона видна целиком, длинная — частью', () => {
    expect(visibleFraction(landscape, 1, 1)).toEqual({ width: 0.5, height: 1 });
    expect(visibleFraction(portrait, 1, 1)).toEqual({ width: 1, height: 0.5 });
  });

  it('увеличение делит обе доли', () => {
    expect(visibleFraction(landscape, 1, 2)).toEqual({ width: 0.25, height: 0.5 });
  });

  it('маска шире картинки по соотношению — видна вся ширина', () => {
    expect(visibleFraction({ width: 400, height: 400 }, 2, 1)).toEqual({
      width: 1,
      height: 0.5,
    });
  });

  it('пустая картинка — всё', () => {
    expect(visibleFraction({ width: 0, height: 0 }, 1, 1)).toEqual({ width: 1, height: 1 });
  });
});

describe('clampScale', () => {
  it('не меньше покрытия и не больше предела', () => {
    expect(clampScale(0.4)).toBe(1);
    expect(clampScale(9, 4)).toBe(4);
    expect(clampScale(2.5, 4)).toBe(2.5);
    expect(clampScale(Number.NaN)).toBe(1);
  });
});

describe('clampCrop', () => {
  it('край картинки не заходит внутрь маски', () => {
    // Видна половина ширины: центр не левее 0.25 и не правее 0.75
    expect(clampCrop({ x: 0, y: 0.5, scale: 1 }, landscape, 1)).toEqual({
      x: 0.25,
      y: 0.5,
      scale: 1,
    });
    expect(clampCrop({ x: 1, y: 0.5, scale: 1 }, landscape, 1).x).toBe(0.75);
  });

  it('по оси, где видно всё, центр стоит посередине', () => {
    expect(clampCrop({ x: 0.5, y: 0.1, scale: 1 }, landscape, 1).y).toBe(0.5);
  });

  it('масштаб меньше покрытия поднимается до 1', () => {
    expect(clampCrop({ x: 0.5, y: 0.5, scale: 0.5 }, landscape, 1).scale).toBe(1);
  });

  it('с увеличением свободы больше', () => {
    expect(clampCrop({ x: 0.1, y: 0.1, scale: 2 }, landscape, 1)).toEqual({
      x: 0.125,
      y: 0.25,
      scale: 2,
    });
  });
});

describe('pixelRatio', () => {
  it('покрытие — по короткой стороне', () => {
    expect(pixelRatio(landscape, mask, 1)).toBe(0.5);
    expect(pixelRatio(portrait, mask, 2)).toBeCloseTo(4 / 3);
  });
});

describe('panCrop', () => {
  it('картинка едет за указателем — центр кадра в обратную сторону', () => {
    // 0.5 экранного пикселя на пиксель: 50 px экрана — 100 px картинки — 0.125 ширины
    const next = panCrop(CENTERED, { x: 50, y: 0 }, landscape, mask);

    expect(next.x).toBeCloseTo(0.375);
    expect(next.y).toBe(0.5);
  });

  it('упирается в край', () => {
    expect(panCrop(CENTERED, { x: 1000, y: 0 }, landscape, mask).x).toBe(0.25);
  });
});

describe('zoomCrop', () => {
  it('из центра — центр на месте', () => {
    expect(zoomCrop(CENTERED, 2, { x: 0, y: 0 }, landscape, mask)).toEqual({
      x: 0.5,
      y: 0.5,
      scale: 2,
    });
  });

  it('точка под курсором остаётся под курсором', () => {
    const focus = { x: 60, y: -40 };
    const before = CENTERED;
    const after = zoomCrop(before, 2, focus, landscape, mask);
    const pointOf = (crop: typeof before) => {
      const ratio = pixelRatio(landscape, mask, crop.scale);

      return {
        x: crop.x * landscape.width + focus.x / ratio,
        y: crop.y * landscape.height + focus.y / ratio,
      };
    };

    expect(pointOf(after).x).toBeCloseTo(pointOf(before).x);
    expect(pointOf(after).y).toBeCloseTo(pointOf(before).y);
  });

  it('уменьшение у края возвращает картинку на маску', () => {
    const zoomed = { x: 0.125, y: 0.25, scale: 2 };

    expect(zoomCrop(zoomed, 1, { x: 0, y: 0 }, landscape, mask)).toEqual({
      x: 0.25,
      y: 0.5,
      scale: 1,
    });
  });

  it('за предел не уходит', () => {
    expect(zoomCrop(CENTERED, 10, { x: 0, y: 0 }, landscape, mask, 3).scale).toBe(3);
  });
});

describe('cropTransform', () => {
  it('центр кадра — в центре маски', () => {
    const view = cropTransform({ x: 0.5, y: 0.5, scale: 2 }, landscape, mask);

    expect(view).toEqual({ width: 400, height: 200, x: -400, y: -200, scale: 2 });
    // Центр картинки после scale(2) — (400, 200) от угла, сдвиг (−400, −200) ставит его в начало координат
    expect(view.x + (view.width * view.scale) / 2).toBe(0);
  });
});

describe('cropRegion', () => {
  it('область исходника в его пикселях', () => {
    expect(cropRegion(CENTERED, landscape, 1)).toEqual({ x: 200, y: 0, width: 400, height: 400 });
    expect(cropRegion({ x: 0.25, y: 0.5, scale: 2 }, landscape, 1)).toEqual({
      x: 100,
      y: 100,
      width: 200,
      height: 200,
    });
  });

  it('соотношение маски сохраняется', () => {
    const region = cropRegion(CENTERED, { width: 1000, height: 1000 }, 2);

    expect(region.width / region.height).toBe(2);
  });
});

describe('exportSize', () => {
  it('ширина из size, высота по соотношению', () => {
    expect(exportSize(256, 1)).toEqual({ width: 256, height: 256 });
    expect(exportSize(960, 3)).toEqual({ width: 960, height: 320 });
    expect(exportSize(0.2, 1)).toEqual({ width: 1, height: 1 });
  });
});
