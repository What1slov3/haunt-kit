import { describe, expect, it } from 'vitest';

import {
  byteCapacity,
  chooseVersion,
  dataCodewords,
  ecBlocks,
  ecCodewordsPerBlock,
  encodeDataCodewords,
  encodeQr,
  formatBits,
  maskPenalty,
  maskPenaltyParts,
  qrSize,
  rsRemainder,
  totalCodewords,
  versionBits,
  type QrMatrix,
} from './qr-encode';

/*
 * Эталоны — из ISO/IEC 18004 и вычислений по нему, а не из другой библиотеки (зависимостей у кита нет):
 * - таблицы ёмкости и блоков уровня M (таблица 9), коды формата (приложение C) и версии (приложение D);
 * - пример коррекции «01234567» 1-M из приложения I и «HELLO WORLD» 1-M (широко разобранный пример
 *   из учебника thonky.com, посчитан по тому же стандарту);
 * - матрицу целиком проверяет независимый декодер ниже: своя таблица логарифмов GF(256), свои области
 *   узоров, своё чтение змейкой. Он снимает маску по коду формата, собирает блоки, требует нулевых
 *   синдромов Reed–Solomon и разбирает режим byte обратно в строку.
 */

describe('таблицы версий 1–10, уровень M', () => {
  // ISO/IEC 18004, таблица 9: всего слов / слов коррекции на блок / число блоков
  const table: [number, number, number, number][] = [
    [1, 26, 10, 1],
    [2, 44, 16, 1],
    [3, 70, 26, 1],
    [4, 100, 18, 2],
    [5, 134, 24, 2],
    [6, 172, 16, 4],
    [7, 196, 18, 4],
    [8, 242, 22, 4],
    [9, 292, 22, 5],
    [10, 346, 26, 5],
  ];

  it.each(table)(
    'версия %i: %i слов, по %i коррекции в %i блоках',
    (version, total, ec, blocks) => {
      expect(totalCodewords(version)).toBe(total);
      expect(ecCodewordsPerBlock(version)).toBe(ec);
      expect(ecBlocks(version)).toBe(blocks);
    },
  );

  // Ёмкость режима byte уровня M из таблицы 7
  it('ёмкость в байтах', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(byteCapacity)).toEqual([
      14, 26, 42, 62, 84, 106, 122, 152, 180, 213,
    ]);
  });

  it('выбирает наименьшую версию, длиннее 213 байт — нет', () => {
    expect(chooseVersion(14)).toBe(1);
    expect(chooseVersion(15)).toBe(2);
    expect(chooseVersion(213)).toBe(10);
    expect(chooseVersion(214)).toBeNull();
    expect(encodeQr('x'.repeat(214))).toBeNull();
  });
});

describe('Reed–Solomon', () => {
  it('приложение I: «01234567», 1-M', () => {
    const data = [16, 32, 12, 86, 97, 128, 236, 17, 236, 17, 236, 17, 236, 17, 236, 17];

    expect(rsRemainder(data, 10)).toEqual([165, 36, 212, 193, 237, 54, 199, 135, 44, 85]);
  });

  it('«HELLO WORLD», 1-M', () => {
    const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];

    expect(rsRemainder(data, 10)).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  });
});

describe('формат и версия', () => {
  // Приложение C, уровень M, маски 0–7
  it('коды формата', () => {
    const expected = [
      '101010000010010',
      '101000100100101',
      '101111001111100',
      '101101101001011',
      '100010111111001',
      '100000011001110',
      '100111110010111',
      '100101010100000',
    ];

    expect(
      [0, 1, 2, 3, 4, 5, 6, 7].map((mask) => formatBits(mask).toString(2).padStart(15, '0')),
    ).toEqual(expected);
  });

  // Приложение D
  it('коды версий 7–10', () => {
    expect([7, 8, 9, 10].map(versionBits)).toEqual([0x07c94, 0x085bc, 0x09a99, 0x0a4d3]);
  });
});

describe('биты данных', () => {
  // «A», версия 1: 0100 | 00000001 | 01000001 | 0000 → 0x40 0x14 0x10, дальше добивка EC 11 EC…
  it('режим byte, длина, терминатор и добивка', () => {
    expect(encodeDataCodewords(new TextEncoder().encode('A'), 1)).toEqual([
      0x40, 0x14, 0x10, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11,
      0xec,
    ]);
  });

  it('с 10-й версии длина — 16 бит', () => {
    const codewords = encodeDataCodewords(new Uint8Array(200).fill(0x61), 10);

    // 0100 | 0000 0000 1100 1000 | 0110 0001…
    expect(codewords.slice(0, 3)).toEqual([0x40, 0x0c, 0x86]);
    expect(codewords).toHaveLength(dataCodewords(10));
  });
});

describe('штраф маски', () => {
  const blank = (size: number): QrMatrix =>
    Array.from({ length: size }, () => Array.from({ length: size }, () => false));

  // Пустая 21×21: ряды 21 · 2 · (3 + 16) = 798; блоки 20 · 20 · 3 = 1200; тёмных 0 % → 10 · 10 = 100
  it('считает правила 1, 2, 4 по стандарту', () => {
    expect(maskPenalty(blank(21))).toBe(798 + 1200 + 100);
  });

  it('правило 3: узор 1:1:3:1:1 у светлого края — 40, без светлых краёв — 0', () => {
    const matrix = blank(21);
    const row = matrix[10] ?? [];

    // 1 0 1 1 1 0 1 в столбцах 7–13, по краям светлое
    [7, 9, 10, 11, 13].forEach((x) => (row[x] = true));
    expect(maskPenaltyParts(matrix).finderLike).toBe(40);

    // Тёмные модули в четырёх слева и справа — узор уже не похож на поисковый
    [5, 15].forEach((x) => (row[x] = true));
    expect(maskPenaltyParts(matrix).finderLike).toBe(0);
  });

  it('правило 4: каждые полные 5 % отклонения — 10', () => {
    const matrix = blank(20);

    // 400 модулей, тёмных 130 = 32.5 %: отклонение 17.5 % — три полных шага
    for (let i = 0; i < 130; i++) (matrix[Math.floor(i / 20)] ?? [])[i % 20] = true;
    expect(maskPenaltyParts(matrix).balance).toBe(30);
  });
});

/* --- Независимый декодер: проверяет размещение, маску, чередование и коррекцию ----------- */

const EXP: number[] = [];
const LOG: number[] = [];

for (let i = 0, value = 1; i < 255; i++) {
  EXP[i] = value;
  LOG[value] = i;
  value <<= 1;
  if (value & 0x100) value ^= 0x11d;
}

const gfMul = (a: number, b: number) =>
  a === 0 || b === 0 ? 0 : (EXP[((LOG[a] ?? 0) + (LOG[b] ?? 0)) % 255] ?? 0);

/** Синдромы кодового слова: значения многочлена в α⁰…α^(ec−1) — у верного слова все нули */
function syndromes(codeword: number[], ec: number): number[] {
  return Array.from({ length: ec }, (_, j) =>
    codeword.reduce((sum, byte) => gfMul(sum, EXP[j] ?? 0) ^ byte, 0),
  );
}

/* Центры выравнивающих узоров — для версий в тестах, из приложения E */
const ALIGNMENT: Record<number, number[]> = { 1: [], 2: [6, 18], 5: [6, 30], 7: [6, 22, 38] };

function functionArea(version: number): boolean[][] {
  const size = qrSize(version);
  const area = Array.from({ length: size }, () => Array.from({ length: size }, () => false));
  const mark = (x0: number, y0: number, w: number, h: number) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) (area[y] ?? [])[x] = true;
  };

  // Поисковые узоры с разделителями и полосами формата; тайминг; тёмный модуль входит в левый нижний
  mark(0, 0, 9, 9);
  mark(size - 8, 0, 8, 9);
  mark(0, size - 8, 9, 8);
  mark(6, 0, 1, size);
  mark(0, 6, size, 1);

  const centers = ALIGNMENT[version] ?? [];

  for (const cy of centers) {
    for (const cx of centers) {
      const corner =
        (cx === 6 && cy === 6) || (cx === 6 && cy === size - 7) || (cx === size - 7 && cy === 6);

      if (!corner) mark(cx - 2, cy - 2, 5, 5);
    }
  }

  if (version >= 7) {
    mark(size - 11, 0, 3, 6);
    mark(0, size - 11, 6, 3);
  }

  return area;
}

const FORMAT_M = [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0];

function decode(matrix: QrMatrix): { text: string; mask: number; version: number } {
  const size = matrix.length;
  const version = (size - 17) / 4;
  const get = (x: number, y: number) => matrix[y]?.[x] ?? false;

  // Формат, первая копия по приложению C: биты 14…9 — строка 8, столбцы 0–5; 8 — (7, 8); 7 — (8, 8);
  // 6 — (8, 7); 5…0 — столбец 8, строки 5…0
  const positions: [number, number][] = [
    [0, 8],
    [1, 8],
    [2, 8],
    [3, 8],
    [4, 8],
    [5, 8],
    [7, 8],
    [8, 8],
    [8, 7],
    [8, 5],
    [8, 4],
    [8, 3],
    [8, 2],
    [8, 1],
    [8, 0],
  ];
  const format = positions.reduce((value, [x, y]) => (value << 1) | (get(x, y) ? 1 : 0), 0);
  const mask = FORMAT_M.indexOf(format);

  expect(mask).toBeGreaterThanOrEqual(0);
  expect(get(8, size - 8)).toBe(true);

  const area = functionArea(version);
  const conditions = [
    (x: number, y: number) => (x + y) % 2 === 0,
    (_: number, y: number) => y % 2 === 0,
    (x: number) => x % 3 === 0,
    (x: number, y: number) => (x + y) % 3 === 0,
    (x: number, y: number) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
    (x: number, y: number) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x: number, y: number) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x: number, y: number) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const bits: number[] = [];

  // Змейка: столбцы парами справа налево, первая пара — вверх, пропуская столбец тайминга
  let upward = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--;

    for (let step = 0; step < size; step++) {
      const y = upward ? size - 1 - step : step;

      for (const x of [right, right - 1]) {
        if (area[y]?.[x]) continue;

        bits.push(get(x, y) !== (conditions[mask]?.(x, y) ?? false) ? 1 : 0);
      }
    }

    upward = !upward;
  }

  const total = totalCodewords(version);
  const codewords = Array.from({ length: total }, (_, i) =>
    bits.slice(i * 8, i * 8 + 8).reduce((byte, b) => (byte << 1) | b, 0),
  );

  // Обратное чередование: блоки по таблице 9, короткие первыми
  const blocks = ecBlocks(version);
  const ec = ecCodewordsPerBlock(version);
  const longBlocks = total % blocks;
  const shortData = Math.floor(total / blocks) - ec;
  const data: number[][] = Array.from({ length: blocks }, () => []);
  const ecc: number[][] = Array.from({ length: blocks }, () => []);
  let k = 0;

  for (let i = 0; i <= shortData; i++) {
    for (let b = 0; b < blocks; b++) {
      if (i < shortData || b >= blocks - longBlocks) data[b]?.push(codewords[k++] ?? -1);
    }
  }

  for (let i = 0; i < ec; i++) for (let b = 0; b < blocks; b++) ecc[b]?.push(codewords[k++] ?? -1);

  data.forEach((block, b) => {
    expect(syndromes([...block, ...(ecc[b] ?? [])], ec).every((s) => s === 0)).toBe(true);
  });

  // Режим byte: 0100, длина 8 или 16 бит, байты
  const stream = data
    .flat()
    .flatMap((byte) => Array.from({ length: 8 }, (_, i) => (byte >>> (7 - i)) & 1));
  const read = (from: number, length: number) =>
    stream.slice(from, from + length).reduce((value, b) => (value << 1) | b, 0);
  const lengthBits = version <= 9 ? 8 : 16;

  expect(read(0, 4)).toBe(0b0100);

  const count = read(4, lengthBits);
  const bytes = Uint8Array.from({ length: count }, (_, i) => read(4 + lengthBits + i * 8, 8));

  return { text: new TextDecoder().decode(bytes), mask, version };
}

const render = (matrix: QrMatrix) =>
  matrix.map((row) => row.map((dark) => (dark ? '#' : '.')).join(''));

describe('encodeQr', () => {
  it.each([
    ['HAUNT', 1],
    ['https://haunt.chat/i/7Kq2', 2],
    ['Приглашение в «Ночной рейд» — haunt.chat/i/ab12', 5],
    ['x'.repeat(120), 7],
  ])('«%s» → версия %i, читается обратно', (text, version) => {
    const qr = encodeQr(text);

    expect(qr?.version).toBe(version);
    expect(qr?.size).toBe(qrSize(version));
    expect(decode(qr?.modules ?? []).text).toBe(text);
  });

  it('при заданной маске читается обратно с ней же', () => {
    for (let mask = 0; mask < 8; mask++) {
      const qr = encodeQr('haunt', { mask });

      expect(qr?.mask).toBe(mask);
      expect(decode(qr?.modules ?? []).mask).toBe(mask);
    }
  });

  it('выбирает маску с наименьшим штрафом', () => {
    const chosen = encodeQr('https://haunt.chat/i/7Kq2');
    const penalties = [0, 1, 2, 3, 4, 5, 6, 7].map((mask) =>
      maskPenalty(encodeQr('https://haunt.chat/i/7Kq2', { mask })?.modules ?? []),
    );

    expect(chosen?.mask).toBe(penalties.indexOf(Math.min(...penalties)));
  });

  it('поисковые узоры и тайминг на месте', () => {
    const rows = render(encodeQr('HAUNT')?.modules ?? []);

    expect(rows.slice(0, 7).map((row) => row.slice(0, 7))).toEqual([
      '#######',
      '#.....#',
      '#.###.#',
      '#.###.#',
      '#.###.#',
      '#.....#',
      '#######',
    ]);
    expect(rows[6]?.slice(8, 13)).toBe('#.#.#');
  });

  /*
   * Снимок матрицы «HAUNT» (версия 1, маска выбрана по штрафу). Получен этим генератором и принят, потому
   * что его прочитал независимый декодер выше; держит регресс: любое изменение размещения или маски
   * сломает снимок раньше, чем телефон перестанет читать код.
   */
  it('снимок «HAUNT»', () => {
    expect(render(encodeQr('HAUNT')?.modules ?? [])).toMatchInlineSnapshot(`
      [
        "#######.##....#######",
        "#.....#....#..#.....#",
        "#.###.#...##..#.###.#",
        "#.###.#.#.###.#.###.#",
        "#.###.#.#...#.#.###.#",
        "#.....#.##.#..#.....#",
        "#######.#.#.#.#######",
        "........#.###........",
        "#...#.###.##.#####..#",
        "..##.#.#.#.##..#..###",
        "...#..######..###..#.",
        "..#..#..#....##.#....",
        ".#.#.###.#..###..###.",
        "........##..###..####",
        "#######.##..##.....#.",
        "#.....#..#.##..#...#.",
        "#.###.#.#.##..###.#.#",
        "#.###.#..#.##....#.##",
        "#.###.#..###..#####..",
        "#.....#..#...####....",
        "#######.##..####.##.#",
      ]
    `);
  });
});
