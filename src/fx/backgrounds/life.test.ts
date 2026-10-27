import { describe, expect, it } from 'vitest';

import { GLIDER, isStagnant, seedLife, stamp, stepLife } from './life';
import { random } from './noise';

const COLS = 8;
const ROWS = 8;

function grid(cells: [number, number][]): Uint8Array {
  const out = new Uint8Array(COLS * ROWS);

  for (const [x, y] of cells) out[y * COLS + x] = 1;

  return out;
}

/** Живые клетки по строкам, слева направо */
function alive(cells: Uint8Array): [number, number][] {
  const out: [number, number][] = [];

  cells.forEach((value, i) => {
    if (value) out.push([i % COLS, Math.floor(i / COLS)]);
  });

  return out;
}

describe('stepLife', () => {
  it('блок стоит', () => {
    const block = grid([
      [2, 2],
      [3, 2],
      [2, 3],
      [3, 3],
    ]);
    const next = new Uint8Array(COLS * ROWS);

    expect(stepLife(block, next, COLS, ROWS)).toBe(4);
    expect(Array.from(next)).toEqual(Array.from(block));
  });

  it('мигалка меняет ориентацию', () => {
    const next = new Uint8Array(COLS * ROWS);

    stepLife(
      grid([
        [3, 2],
        [3, 3],
        [3, 4],
      ]),
      next,
      COLS,
      ROWS,
    );

    expect(alive(next)).toEqual([
      [2, 3],
      [3, 3],
      [4, 3],
    ]);
  });

  it('тор: соседи через край', () => {
    const next = new Uint8Array(COLS * ROWS);

    // Вертикальная мигалка в нулевом столбце рождает клетку в последнем
    stepLife(
      grid([
        [0, 2],
        [0, 3],
        [0, 4],
      ]),
      next,
      COLS,
      ROWS,
    );

    expect(alive(next)).toEqual([
      [0, 3],
      [1, 3],
      [7, 3],
    ]);
  });

  it('глайдер через 4 поколения сдвигается на (1, 1)', () => {
    let cells = new Uint8Array(COLS * ROWS);
    let next = new Uint8Array(COLS * ROWS);

    stamp(cells, COLS, ROWS, 1, 1, GLIDER);

    const start = alive(cells);

    for (let i = 0; i < 4; i++) {
      stepLife(cells, next, COLS, ROWS);
      [cells, next] = [next, cells];
    }

    expect(alive(cells)).toEqual(start.map(([x, y]) => [x + 1, y + 1]));
  });
});

describe('seedLife и застой', () => {
  it('плотность примерно заданная', () => {
    const cells = seedLife(100, 100, 0.2, random(1));
    const count = cells.reduce((sum, value) => sum + value, 0);

    expect(count / 10000).toBeCloseTo(0.2, 1);
  });

  it('застой: то же поле два поколения назад или почти пусто', () => {
    const a = grid([[1, 1]]);

    expect(isStagnant(a, a.slice(), 10, 2)).toBe(true);
    expect(isStagnant(a, new Uint8Array(COLS * ROWS), 10, 2)).toBe(false);
    expect(isStagnant(a, new Uint8Array(COLS * ROWS), 1, 2)).toBe(true);
  });
});
