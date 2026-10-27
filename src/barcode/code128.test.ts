import { describe, expect, it } from 'vitest';

import {
  barsFromModules,
  CODE128_PATTERNS,
  code128Checksum,
  code128Layout,
  code128Modules,
  encodeCode128B,
  isCode128B,
} from './code128';

const bits = (values: number[]) =>
  code128Modules(values)
    .map((dark) => (dark ? '1' : '0'))
    .join('');

describe('таблица Code 128', () => {
  it('107 символов, все разные', () => {
    expect(CODE128_PATTERNS).toHaveLength(107);
    expect(new Set(CODE128_PATTERNS).size).toBe(107);
  });

  it('символ — 11 модулей, стоп — 13; ширины 1–4', () => {
    CODE128_PATTERNS.forEach((pattern, value) => {
      const widths = Array.from(pattern, Number);

      expect(widths.every((width) => width >= 1 && width <= 4)).toBe(true);
      expect(widths.reduce((sum, width) => sum + width, 0)).toBe(value === 106 ? 13 : 11);
    });
  });

  // Проверка чётности из стандарта: сумма ширин штрихов у каждого символа чётная — опечатку в одной цифре
  // таблица не переживёт
  it('сумма штрихов чётная', () => {
    for (const pattern of CODE128_PATTERNS.slice(0, 106)) {
      const bars = Array.from(pattern, Number).filter((_, index) => index % 2 === 0);

      expect(bars.reduce((sum, width) => sum + width, 0) % 2).toBe(0);
    }
  });

  // Опорные символы — битовые строки из таблиц стандарта (1 — модуль штриха)
  it('совпадает с эталонными битовыми строками', () => {
    expect(bits([0])).toBe('11011001100');
    expect(bits([1])).toBe('11001101100');
    expect(bits([33])).toBe('10100011000');
    expect(bits([34])).toBe('10001011000');
    expect(bits([103])).toBe('11010000100');
    expect(bits([104])).toBe('11010010000');
    expect(bits([105])).toBe('11010011100');
    expect(bits([106])).toBe('1100011101011');
  });
});

describe('encodeCode128B', () => {
  it('набор B — только печатный ASCII', () => {
    expect(isCode128B('HAUNT-0042 ~')).toBe(true);
    expect(isCode128B('привет')).toBe(false);
    expect(isCode128B('a\nb')).toBe(false);
    expect(encodeCode128B('ё')).toBeNull();
  });

  // Пример из описания стандарта: P J J 1 2 3 C → 48 42 42 17 18 19 35;
  // 104 + 48·1 + 42·2 + 42·3 + 17·4 + 18·5 + 19·6 + 35·7 = 879, 879 mod 103 = 55
  it('контрольный символ — взвешенная сумма по модулю 103', () => {
    expect(code128Checksum(104, [48, 42, 42, 17, 18, 19, 35])).toBe(55);
    expect(encodeCode128B('PJJ123C')).toEqual([104, 48, 42, 42, 17, 18, 19, 35, 55, 106]);
  });

  // «Wikipedia»: 104 + 55 + 73·2 + 75·3 + 73·4 + 80·5 + 69·6 + 68·7 + 73·8 + 65·9 = 3281, mod 103 = 88
  it('считает контрольный символ длинной строки', () => {
    expect(encodeCode128B('Wikipedia')?.at(-2)).toBe(88);
  });

  it('«A»: старт B, A, контрольный 34 (104 + 33 = 137 mod 103), стоп', () => {
    const values = encodeCode128B('A');

    expect(values).toEqual([104, 33, 34, 106]);
    expect(bits(values ?? [])).toBe(
      '11010010000' + '10100011000' + '10001011000' + '1100011101011',
    );
  });

  it('пустая строка — не код', () => {
    expect(encodeCode128B('')).toBeNull();
  });
});

describe('раскладка', () => {
  it('склеивает соседние модули в штрихи', () => {
    expect(barsFromModules([true, true, false, true, false, false, true])).toEqual([
      { x: 0, width: 2 },
      { x: 3, width: 1 },
      { x: 6, width: 1 },
    ]);
  });

  it('ширина — модули символов плюс две тихие зоны; первый штрих после тихой зоны', () => {
    const layout = code128Layout('A');

    // 4 символа: 11 · 3 + 13 = 46 модулей, тихие зоны по 10
    expect(layout?.width).toBe(66);
    expect(layout?.bars[0]).toEqual({ x: 10, width: 2 });
  });

  it('строка вне набора — нет раскладки', () => {
    expect(code128Layout('код')).toBeNull();
  });
});
