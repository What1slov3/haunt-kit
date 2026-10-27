import { describe, expect, it } from 'vitest';

import { graphemes, seededRandom } from './text-utils';

describe('graphemes', () => {
  it('эмодзи с модификатором — один символ', () => {
    expect(graphemes('a👍🏽b')).toEqual(['a', '👍🏽', 'b']);
  });

  it('кириллица и пробелы — по символу', () => {
    expect(graphemes('да нет')).toHaveLength(6);
  });
});

describe('seededRandom', () => {
  it('тот же seed — та же последовательность в пределах 0…1', () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    const values = Array.from({ length: 50 }, () => a());

    expect(values).toEqual(Array.from({ length: 50 }, () => b()));
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('разные seed — разные последовательности', () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)());
  });
});
