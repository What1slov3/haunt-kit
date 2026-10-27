import { describe, expect, it } from 'vitest';

import { noiseOffset, noiseTile } from './noise-tile';

describe('noiseTile', () => {
  it('серый шум с полной альфой нужного размера', () => {
    const tile = noiseTile(16);

    expect(tile).toHaveLength(16 * 16 * 4);

    for (let index = 0; index < tile.length; index += 4) {
      expect(tile[index]).toBe(tile[index + 1]);
      expect(tile[index]).toBe(tile[index + 2]);
      expect(tile[index + 3]).toBe(255);
    }
  });

  it('среднее — около середины, разброс — во весь диапазон', () => {
    const tile = noiseTile(64);
    const values = Array.from({ length: tile.length / 4 }, (_, index) => tile[index * 4]!);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;

    expect(mean).toBeGreaterThan(118);
    expect(mean).toBeLessThan(138);
    expect(Math.min(...values)).toBeLessThan(10);
    expect(Math.max(...values)).toBeGreaterThan(245);
  });

  it('детерминирован по seed', () => {
    expect(noiseTile(8, 3)).toEqual(noiseTile(8, 3));
    expect(noiseTile(8, 3)).not.toEqual(noiseTile(8, 4));
  });
});

describe('noiseOffset', () => {
  it('целые пиксели в пределах плитки, разные на соседних кадрах', () => {
    const offsets = Array.from({ length: 20 }, (_, frame) => noiseOffset(frame, 128));

    for (const { x, y } of offsets) {
      expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(128);
    }

    expect(new Set(offsets.map(({ x, y }) => `${x}:${y}`)).size).toBeGreaterThan(15);
  });
});
