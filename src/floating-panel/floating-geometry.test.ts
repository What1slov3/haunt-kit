import { describe, expect, it } from 'vitest';

import {
  clampPoint,
  clampSize,
  cornerPlacement,
  moveByKey,
  resizeFromCorner,
  resolvePlacement,
  snapPlacement,
} from './floating-geometry';

const viewport = { width: 1200, height: 800 };
const size = { width: 320, height: 200 };
const snap = { margin: 12, threshold: 24 };

describe('snapPlacement', () => {
  it('у правого нижнего угла — прижата к обоим краям', () => {
    const placement = snapPlacement({ x: 860, y: 580 }, size, viewport, snap);

    expect(placement).toEqual({ x: 868, y: 588, anchorX: 'end', anchorY: 'end' });
  });

  it('у левого края — прижата слева, по высоте свободна', () => {
    const placement = snapPlacement({ x: 30, y: 300 }, size, viewport, snap);

    expect(placement).toEqual({ x: 12, y: 300, anchorX: 'start', anchorY: null });
  });

  it('посередине — где отпустили', () => {
    expect(snapPlacement({ x: 400, y: 300 }, size, viewport, snap)).toMatchObject({
      x: 400,
      y: 300,
      anchorX: null,
      anchorY: null,
    });
  });

  it('за окном — возвращается внутрь и прилипает', () => {
    expect(snapPlacement({ x: -500, y: 2000 }, size, viewport, snap)).toEqual({
      x: 12,
      y: 588,
      anchorX: 'start',
      anchorY: 'end',
    });
  });
});

describe('resolvePlacement', () => {
  it('прижатая к правому краю едет за краем при сужении окна', () => {
    const placement = { x: 868, y: 588, anchorX: 'end' as const, anchorY: 'end' as const };

    expect(resolvePlacement(placement, size, { width: 900, height: 600 }, 12)).toEqual({
      x: 568,
      y: 388,
    });
  });

  it('свободная держит координату, пока влезает', () => {
    const placement = { x: 400, y: 300, anchorX: null, anchorY: null };

    expect(resolvePlacement(placement, size, viewport, 12)).toEqual({ x: 400, y: 300 });
    expect(resolvePlacement(placement, size, { width: 600, height: 400 }, 12)).toEqual({
      x: 268,
      y: 188,
    });
  });

  it('угол по умолчанию', () => {
    expect(resolvePlacement(cornerPlacement('bottom-right'), size, viewport, 12)).toEqual({
      x: 868,
      y: 588,
    });
    expect(resolvePlacement(cornerPlacement('top-left'), size, viewport, 12)).toEqual({
      x: 12,
      y: 12,
    });
  });
});

describe('clampPoint и clampSize', () => {
  it('панель целиком в окне', () => {
    expect(clampPoint({ x: 2000, y: -10 }, size, viewport, 12)).toEqual({ x: 868, y: 12 });
  });

  it('размер в границах и не больше окна', () => {
    const min = { width: 200, height: 120 };
    const max = { width: 2000, height: 2000 };

    expect(clampSize({ width: 5000, height: 50 }, min, max, viewport, 12)).toEqual({
      width: 1176,
      height: 120,
    });
  });
});

describe('resizeFromCorner', () => {
  const start = { x: 400, y: 300, ...size };
  const min = { width: 200, height: 120 };
  const max = { width: 640, height: 480 };

  it('правый нижний растит вправо-вниз, левый верхний угол на месте', () => {
    expect(resizeFromCorner(start, 'bottom-right', 40, 30, min, max, viewport, 12)).toEqual({
      x: 400,
      y: 300,
      width: 360,
      height: 230,
    });
  });

  it('левый верхний растит влево-вверх, правый нижний угол на месте', () => {
    expect(resizeFromCorner(start, 'top-left', -40, -30, min, max, viewport, 12)).toEqual({
      x: 360,
      y: 270,
      width: 360,
      height: 230,
    });
  });

  it('не меньше минимума и не за окно', () => {
    expect(resizeFromCorner(start, 'top-left', 500, 0, min, max, viewport, 12)).toMatchObject({
      x: 520,
      width: 200,
    });
    expect(resizeFromCorner(start, 'bottom-right', 0, 1000, min, max, viewport, 12)).toMatchObject({
      height: 480,
    });
    expect(
      resizeFromCorner({ ...start, y: 500 }, 'bottom-right', 0, 1000, min, max, viewport, 12),
    ).toMatchObject({ height: 288 });
  });
});

describe('moveByKey', () => {
  it('стрелки двигают в окне, остальное — null', () => {
    expect(moveByKey({ x: 400, y: 300 }, 'ArrowLeft', 16, size, viewport, 12)).toEqual({
      x: 384,
      y: 300,
    });
    expect(moveByKey({ x: 12, y: 300 }, 'ArrowLeft', 16, size, viewport, 12)).toEqual({
      x: 12,
      y: 300,
    });
    expect(moveByKey({ x: 400, y: 300 }, 'Enter', 16, size, viewport, 12)).toBeNull();
  });
});
