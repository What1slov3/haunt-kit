import { describe, expect, it } from 'vitest';

import { memberRows, messageRows, seededRandom } from './skeleton-rows';

describe('seededRandom', () => {
  it('тот же seed — та же последовательность в [0, 1)', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const first = [a(), a(), a()];

    expect([b(), b(), b()]).toEqual(first);
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('другой seed — другая последовательность', () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)());
  });
});

describe('messageRows', () => {
  it('ширины в своих пределах, последняя строка короче', () => {
    const rows = messageRows(20, { seed: 7 });

    for (const row of rows) {
      expect(row.name).toBeGreaterThanOrEqual(64);
      expect(row.name).toBeLessThanOrEqual(120);
      expect(row.lines.length).toBeGreaterThanOrEqual(1);
      expect(row.lines.length).toBeLessThanOrEqual(3);
      expect(row.lines.at(-1)!).toBeLessThanOrEqual(75);
    }
  });

  it('устойчивы по seed', () => {
    expect(messageRows(5, { seed: 3 })).toEqual(messageRows(5, { seed: 3 }));
  });

  it('без доли вложений — без вложений, с долей 1 — у всех', () => {
    expect(messageRows(10).some((row) => row.attachment)).toBe(false);
    expect(messageRows(10, { attachments: 1 }).every((row) => row.attachment)).toBe(true);
  });
});

describe('memberRows', () => {
  it('ширины 40–85 %', () => {
    expect(memberRows(30).every((width) => width >= 40 && width <= 85)).toBe(true);
    expect(memberRows(0)).toEqual([]);
  });
});
