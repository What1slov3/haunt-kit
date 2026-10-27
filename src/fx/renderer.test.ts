import { describe, expect, it } from 'vitest';

import { pickRenderer, resolveStrategy, type RendererContext } from './renderer';

const full = { webgl: 'gl', canvas2d: 'cpu', static: 'still' };
const canvasOnly = { canvas2d: 'cpu', static: 'still' };
const staticOnly = { static: 'still' };

const context = (patch: Partial<RendererContext> = {}): RendererContext => ({
  override: null,
  support: 'hardware',
  webglUsable: true,
  ...patch,
});

describe('pickRenderer', () => {
  it('на GPU берёт шейдер', () => {
    expect(pickRenderer(full, context())).toBe('webgl');
  });

  it('программный растеризатор сам по себе не выбирается — только принудительно', () => {
    expect(pickRenderer(full, context({ support: 'software' }))).toBe('canvas');
    expect(pickRenderer(full, context({ support: 'software', override: 'webgl' }))).toBe('webgl');
  });

  it('без WebGL и при потерянном контексте — запасной Canvas 2D', () => {
    expect(pickRenderer(full, context({ support: 'none' }))).toBe('canvas');
    expect(pickRenderer(full, context({ webglUsable: false, override: 'webgl' }))).toBe('canvas');
  });

  it('нет пути — сползает вниз до статичного кадра', () => {
    expect(pickRenderer(canvasOnly, context({ override: 'webgl' }))).toBe('canvas');
    expect(pickRenderer(staticOnly, context({ override: 'canvas' }))).toBe('static');
    expect(pickRenderer(staticOnly, context())).toBe('static');
  });

  it('static принудительно — всегда static', () => {
    expect(pickRenderer(full, context({ override: 'static' }))).toBe('static');
  });

  it('canvas принудительно — мимо WebGL', () => {
    expect(pickRenderer(full, context({ override: 'canvas' }))).toBe('canvas');
  });
});

describe('resolveStrategy', () => {
  it('отдаёт реализацию пути, недостающую — ниже по цепочке', () => {
    expect(resolveStrategy(full, 'webgl')).toBe('gl');
    expect(resolveStrategy(canvasOnly, 'webgl')).toBe('cpu');
    expect(resolveStrategy(full, 'static')).toBe('still');
  });
});
