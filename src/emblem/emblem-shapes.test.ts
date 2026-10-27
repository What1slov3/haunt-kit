import { describe, expect, it } from 'vitest';

import { emblemFromSeed } from './emblem-shapes';
import { createRandom, hashSeed } from './seed';

const numbers = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('seed', () => {
  // Эталон FNV-1a 32: пустая строка — смещение базиса, «a» — 0xe40c292c
  it('FNV-1a', () => {
    expect(hashSeed('')).toBe(0x811c9dc5);
    expect(hashSeed('a')).toBe(0xe40c292c);
  });

  it('генератор повторяется при одном seed и даёт [0, 1)', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const values = Array.from({ length: 100 }, () => a());

    expect(values).toEqual(Array.from({ length: 100 }, () => b()));
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });
});

describe('emblemFromSeed', () => {
  it('детерминирована: одна строка — один знак', () => {
    expect(emblemFromSeed('night-raid')).toEqual(emblemFromSeed('night-raid'));
  });

  it('разные строки — разные знаки', () => {
    const seeds = ['night-raid', 'haunt', 'space-0042', 'Лаборатория', 'a', 'b'];
    const signatures = new Set(seeds.map((seed) => JSON.stringify(emblemFromSeed(seed))));

    expect(signatures.size).toBe(seeds.length);
  });

  it('порядок симметрии 3–8, внешнее кольцо и ровно один акцент', () => {
    for (let i = 0; i < 200; i++) {
      const emblem = emblemFromSeed(`seed-${i}`);

      expect([3, 4, 5, 6, 8]).toContain(emblem.order);
      expect(emblem.parts[0]?.kind).toBe('ring');
      expect(emblem.parts.filter((part) => part.accent)).toHaveLength(1);
    }
  });

  it('все точки внутри поля 100 × 100', () => {
    for (let i = 0; i < 200; i++) {
      for (const part of emblemFromSeed(`bounds-${i}`).parts) {
        for (const value of numbers(part.d)) {
          expect(Math.abs(value)).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  // Снимок держит регресс: смена генератора меняет эмблемы всех пространств, это должно быть решением
  it('снимок одного знака', () => {
    const emblem = emblemFromSeed('haunt');

    expect({
      order: emblem.order,
      parts: emblem.parts.map((part) => `${part.kind}${part.accent ? '*' : ''}: ${part.d}`),
    }).toMatchInlineSnapshot(`
      {
        "order": 6,
        "parts": [
          "ring: M 50 4.5 A 45.5 45.5 0 1 1 50 95.5 A 45.5 45.5 0 1 1 50 4.5",
          "chevron*: M 44.73 17.61 L 50 10 L 55.27 17.61",
          "arc: M 45.21 26.42 A 24.06 24.06 0 0 1 54.79 26.42",
          "core: M 50 37.72 A 12.28 12.28 0 1 1 50 62.28 A 12.28 12.28 0 1 1 50 37.72",
        ],
      }
    `);
  });
});
