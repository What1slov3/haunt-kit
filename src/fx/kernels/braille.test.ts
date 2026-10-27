import { describe, expect, it } from 'vitest';

import { BRAILLE_BASE, brailleChar, brailleRows } from './braille';
import { solid } from './test-helpers';

const off = [false, false];
const on = [true, true];
const char = (bits: number) => String.fromCharCode(BRAILLE_BASE + bits);

describe('brailleChar', () => {
  it('пустая и полная клетка', () => {
    expect(brailleChar([off, off, off, off])).toBe('⠀');
    expect(brailleChar([on, on, on, on])).toBe('⣿');
  });

  it('биты точек по Unicode: 1 — верх слева, 4 — верх справа, 7 и 8 — нижний ряд', () => {
    expect(brailleChar([[true, false], off, off, off])).toBe(char(0x01));
    expect(brailleChar([[false, true], off, off, off])).toBe(char(0x08));
    expect(brailleChar([off, off, off, [true, false]])).toBe(char(0x40));
    expect(brailleChar([off, off, off, [false, true]])).toBe(char(0x80));
  });
});

describe('brailleRows', () => {
  it('знак на каждые 2×4 точки, неполная клетка у края тоже', () => {
    const rows = brailleRows(solid(5, 9, [255, 255, 255]), 5, 9);

    expect(rows).toHaveLength(3);
    // Третий знак — только левый столбец: точки 1, 2, 3, 7
    expect(rows[0]).toBe(`⣿⣿${char(0x47)}`);
  });

  it('чёрное — пустые знаки', () => {
    expect(brailleRows(solid(2, 4, [0, 0, 0]), 2, 4)).toEqual(['⠀']);
  });
});
