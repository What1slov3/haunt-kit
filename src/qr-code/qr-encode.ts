/*
 * QR-код по ISO/IEC 18004 в узком профиле: режим byte (UTF-8), уровень коррекции M, версии 1–10
 * (21–57 модулей, до 213 байт) — приглашения и ссылки. Чистые функции без DOM: матрица — массив строк
 * из true/false, рисует её компонент. Модуль грузится лениво (QrCode), в стартовый чанк не входит.
 *
 * Порядок как в стандарте: биты данных → блоки и Reed–Solomon → чередование → размещение змейкой →
 * восемь масок и выбор по штрафу → формат (и версия с 7-й).
 */

export type QrMatrix = boolean[][];

export interface QrCodeData {
  version: number;
  mask: number;
  /** Сторона в модулях, без тихой зоны: 17 + 4 · версия */
  size: number;
  modules: QrMatrix;
}

export const QR_MAX_VERSION = 10;

/* Таблицы уровня M для версий 1–10 (ISO/IEC 18004, таблица 9); индекс 0 не используется */
const EC_CODEWORDS_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const EC_BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];

/* Центры выравнивающих узоров по строкам и столбцам (приложение E) */
const ALIGNMENT_CENTERS: readonly (readonly number[])[] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

export function qrSize(version: number): number {
  return 17 + version * 4;
}

export function alignmentCenters(version: number): readonly number[] {
  return ALIGNMENT_CENTERS[version] ?? [];
}

/** Модули под данные и коррекцию: вся площадь минус узоры, формат и версия */
export function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;

  if (version >= 2) {
    const count = Math.floor(version / 7) + 2;

    result -= (25 * count - 10) * count - 55;

    if (version >= 7) result -= 36;
  }

  return result;
}

export function totalCodewords(version: number): number {
  return Math.floor(rawDataModules(version) / 8);
}

export function ecCodewordsPerBlock(version: number): number {
  return EC_CODEWORDS_PER_BLOCK[version] ?? 0;
}

export function ecBlocks(version: number): number {
  return EC_BLOCKS[version] ?? 0;
}

export function dataCodewords(version: number): number {
  return totalCodewords(version) - ecCodewordsPerBlock(version) * ecBlocks(version);
}

/** Длина поля «число байт»: 8 бит до 9-й версии, 16 — с 10-й */
function countBits(version: number): number {
  return version <= 9 ? 8 : 16;
}

/** Сколько байт помещается в версию в режиме byte */
export function byteCapacity(version: number): number {
  return Math.floor((dataCodewords(version) * 8 - 4 - countBits(version)) / 8);
}

/** Наименьшая версия, в которую помещаются данные; null — не влезает даже в 10-ю */
export function chooseVersion(byteLength: number): number | null {
  for (let version = 1; version <= QR_MAX_VERSION; version++) {
    if (byteLength <= byteCapacity(version)) return version;
  }

  return null;
}

/* --- Поле Галуа GF(256), порождающий многочлен x⁸ + x⁴ + x³ + x² + 1 (0x11d) ------------- */

function gfMultiply(x: number, y: number): number {
  let z = 0;

  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }

  return z;
}

/** Порождающий многочлен степени degree: ∏ (x − αⁱ), i = 0…degree−1; старший коэффициент опущен */
export function rsGenerator(degree: number): number[] {
  const result = Array.from({ length: degree }, () => 0);
  let root = 1;

  result[degree - 1] = 1;

  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j] ?? 0, root) ^ (result[j + 1] ?? 0);
    }

    root = gfMultiply(root, 0x02);
  }

  return result;
}

/** Байты коррекции: остаток от деления данных на порождающий многочлен */
export function rsRemainder(data: readonly number[], degree: number): number[] {
  const generator = rsGenerator(degree);
  const result = Array.from({ length: degree }, () => 0);

  for (const byte of data) {
    const factor = byte ^ (result.shift() ?? 0);

    result.push(0);
    generator.forEach((coefficient, index) => {
      result[index] = (result[index] ?? 0) ^ gfMultiply(coefficient, factor);
    });
  }

  return result;
}

/* --- Биты данных ----------------------------------------------------------------------- */

/** Кодовые слова данных: режим 0100, длина, байты, терминатор, добивка до байта и 0xEC / 0x11 */
export function encodeDataCodewords(bytes: Uint8Array, version: number): number[] {
  const capacityBits = dataCodewords(version) * 8;
  const bits: number[] = [];
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };

  push(0b0100, 4);
  push(bytes.length, countBits(version));
  bytes.forEach((byte) => push(byte, 8));
  push(0, Math.min(4, capacityBits - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);

  const codewords: number[] = [];

  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bits.slice(i, i + 8).reduce((byte, bit) => (byte << 1) | bit, 0));
  }

  for (let pad = 0xec; codewords.length < capacityBits / 8; pad ^= 0xec ^ 0x11) {
    codewords.push(pad);
  }

  return codewords;
}

/**
 * Блоки, коррекция и чередование. Короткие блоки идут первыми; длинные на байт длиннее. Порядок вывода —
 * i-й байт данных каждого блока по очереди, затем i-й байт коррекции каждого блока.
 */
export function interleaveWithEc(data: readonly number[], version: number): number[] {
  const blocks = ecBlocks(version);
  const ecLength = ecCodewordsPerBlock(version);
  const total = totalCodewords(version);
  const shortBlocks = blocks - (total % blocks);
  const shortDataLength = Math.floor(total / blocks) - ecLength;
  const dataBlocks: number[][] = [];
  const ecList: number[][] = [];

  for (let i = 0, offset = 0; i < blocks; i++) {
    const length = shortDataLength + (i < shortBlocks ? 0 : 1);
    const block = data.slice(offset, offset + length);

    offset += length;
    dataBlocks.push(block);
    ecList.push(rsRemainder(block, ecLength));
  }

  const result: number[] = [];

  for (let i = 0; i <= shortDataLength; i++) {
    for (const block of dataBlocks) {
      const byte = block[i];

      if (byte !== undefined) result.push(byte);
    }
  }

  for (let i = 0; i < ecLength; i++) {
    for (const block of ecList) result.push(block[i] ?? 0);
  }

  return result;
}

/* --- Матрица --------------------------------------------------------------------------- */

/** Формат: 2 бита уровня (M = 00) и 3 бита маски + BCH(15, 5), маска 0x5412 */
export function formatBits(mask: number): number {
  const data = (0b00 << 3) | mask;
  let remainder = data;

  for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);

  return ((data << 10) | remainder) ^ 0x5412;
}

/** Версия (с 7-й): 6 бит номера + BCH(18, 6) */
export function versionBits(version: number): number {
  let remainder = version;

  for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);

  return (version << 12) | remainder;
}

const bit = (value: number, index: number) => ((value >>> index) & 1) !== 0;

interface Canvas {
  size: number;
  modules: QrMatrix;
  /** Модули узоров, формата и версии: маска их не трогает, данные их обходят */
  reserved: boolean[][];
}

function createCanvas(version: number): Canvas {
  const size = qrSize(version);
  const grid = () => Array.from({ length: size }, () => Array.from({ length: size }, () => false));

  return { size, modules: grid(), reserved: grid() };
}

function setFunction(canvas: Canvas, x: number, y: number, dark: boolean): void {
  const row = canvas.modules[y];
  const reservedRow = canvas.reserved[y];

  if (!row || !reservedRow || x < 0 || x >= canvas.size) return;

  row[x] = dark;
  reservedRow[x] = true;
}

/** Поисковый узор 7×7 с разделителем: центр (cx, cy), всё в квадрате 9×9 вокруг */
function drawFinder(canvas: Canvas, cx: number, cy: number): void {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));

      setFunction(canvas, cx + dx, cy + dy, distance !== 2 && distance !== 4);
    }
  }
}

function drawAlignment(canvas: Canvas, cx: number, cy: number): void {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      setFunction(canvas, cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
}

function drawFormat(canvas: Canvas, mask: number): void {
  const bits = formatBits(mask);
  const { size } = canvas;

  // Первая копия — вокруг левого верхнего поискового узора
  for (let i = 0; i <= 5; i++) setFunction(canvas, 8, i, bit(bits, i));
  setFunction(canvas, 8, 7, bit(bits, 6));
  setFunction(canvas, 8, 8, bit(bits, 7));
  setFunction(canvas, 7, 8, bit(bits, 8));
  for (let i = 9; i < 15; i++) setFunction(canvas, 14 - i, 8, bit(bits, i));

  // Вторая — разрезана между правым верхним и левым нижним узорами
  for (let i = 0; i < 8; i++) setFunction(canvas, size - 1 - i, 8, bit(bits, i));
  for (let i = 8; i < 15; i++) setFunction(canvas, 8, size - 15 + i, bit(bits, i));

  // Тёмный модуль: всегда чёрный, не часть формата
  setFunction(canvas, 8, size - 8, true);
}

function drawVersion(canvas: Canvas, version: number): void {
  if (version < 7) return;

  const bits = versionBits(version);

  for (let i = 0; i < 18; i++) {
    const a = canvas.size - 11 + (i % 3);
    const b = Math.floor(i / 3);

    setFunction(canvas, a, b, bit(bits, i));
    setFunction(canvas, b, a, bit(bits, i));
  }
}

function drawFunctionPatterns(canvas: Canvas, version: number): void {
  const { size } = canvas;

  for (let i = 0; i < size; i++) {
    setFunction(canvas, 6, i, i % 2 === 0);
    setFunction(canvas, i, 6, i % 2 === 0);
  }

  drawFinder(canvas, 3, 3);
  drawFinder(canvas, size - 4, 3);
  drawFinder(canvas, 3, size - 4);

  const centers = alignmentCenters(version);
  const last = centers.length - 1;

  centers.forEach((cy, i) => {
    centers.forEach((cx, j) => {
      // Три угла заняты поисковыми узорами
      const onFinder = (i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0);

      if (!onFinder) drawAlignment(canvas, cx, cy);
    });
  });

  // Место под формат резервируется заранее (маска 0), настоящий формат пишется после выбора маски
  drawFormat(canvas, 0);
  drawVersion(canvas, version);
}

/** Змейка: пары столбцов справа налево, вверх и вниз по очереди, столбец 6 (тайминг) пропускается */
function drawCodewords(canvas: Canvas, codewords: readonly number[]): void {
  const { size } = canvas;
  let index = 0;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;

    for (let vertical = 0; vertical < size; vertical++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vertical : vertical;
        const row = canvas.modules[y];

        if (!row || canvas.reserved[y]?.[x]) continue;

        // Остаток (remainder bits) после последнего слова — светлые модули
        if (index < codewords.length * 8) {
          row[x] = bit(codewords[index >>> 3] ?? 0, 7 - (index & 7));
          index++;
        }
      }
    }
  }
}

/** Условие маски: true — модуль (x — столбец, y — строка) инвертируется */
export function maskApplies(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    case 7:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      throw new RangeError(`QR: нет маски ${mask}`);
  }
}

function applyMask(canvas: Canvas, mask: number): QrMatrix {
  return canvas.modules.map((row, y) =>
    row.map((dark, x) => (canvas.reserved[y]?.[x] ? dark : dark !== maskApplies(mask, x, y))),
  );
}

/* --- Штраф маски (ISO/IEC 18004, 7.8.3): N1 = 3, N2 = 3, N3 = 40, N4 = 10 ------------------ */

const at = (matrix: QrMatrix, x: number, y: number) => matrix[y]?.[x] ?? false;

/** Правило 1: ряды из 5+ одинаковых модулей по строкам и столбцам — 3 + (длина − 5) */
function penaltyRuns(matrix: QrMatrix): number {
  const size = matrix.length;
  let penalty = 0;

  for (const horizontal of [true, false]) {
    for (let a = 0; a < size; a++) {
      let run = 1;

      for (let b = 1; b <= size; b++) {
        const same =
          b < size &&
          (horizontal
            ? at(matrix, b, a) === at(matrix, b - 1, a)
            : at(matrix, a, b) === at(matrix, a, b - 1));

        if (same) {
          run++;
          continue;
        }

        if (run >= 5) penalty += 3 + run - 5;

        run = 1;
      }
    }
  }

  return penalty;
}

/** Правило 2: каждый блок 2×2 одного цвета — 3 */
function penaltyBlocks(matrix: QrMatrix): number {
  const size = matrix.length;
  let penalty = 0;

  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const color = at(matrix, x, y);

      if (
        at(matrix, x + 1, y) === color &&
        at(matrix, x, y + 1) === color &&
        at(matrix, x + 1, y + 1) === color
      ) {
        penalty += 3;
      }
    }
  }

  return penalty;
}

const FINDER_LIKE = [true, false, true, true, true, false, true];

/**
 * Правило 3: узор 1:1:3:1:1, похожий на поисковый, с четырьмя светлыми модулями с любой стороны — 40.
 * Модули за краем символа считаются светлыми: там тихая зона.
 */
function penaltyFinderLike(matrix: QrMatrix): number {
  const size = matrix.length;
  let penalty = 0;
  const light = (get: (i: number) => boolean, from: number, to: number) => {
    for (let i = Math.max(from, 0); i < Math.min(to, size); i++) if (get(i)) return false;

    return true;
  };

  for (const horizontal of [true, false]) {
    for (let a = 0; a < size; a++) {
      const get = (i: number) => (horizontal ? at(matrix, i, a) : at(matrix, a, i));

      for (let i = 0; i + 6 < size; i++) {
        if (!FINDER_LIKE.every((dark, k) => get(i + k) === dark)) continue;

        if (light(get, i - 4, i) || light(get, i + 7, i + 11)) penalty += 40;
      }
    }
  }

  return penalty;
}

/** Правило 4: доля тёмных — каждые полные 5 % отклонения от 50 % дают 10 */
function penaltyBalance(matrix: QrMatrix): number {
  const total = matrix.length * matrix.length;
  const dark = matrix.reduce((sum, row) => sum + row.filter(Boolean).length, 0);

  return Math.floor((Math.abs(dark * 2 - total) * 10) / total) * 10;
}

export interface MaskPenaltyParts {
  runs: number;
  blocks: number;
  finderLike: number;
  balance: number;
}

/** Штраф по правилам по отдельности — для тестов правил */
export function maskPenaltyParts(matrix: QrMatrix): MaskPenaltyParts {
  return {
    runs: penaltyRuns(matrix),
    blocks: penaltyBlocks(matrix),
    finderLike: penaltyFinderLike(matrix),
    balance: penaltyBalance(matrix),
  };
}

export function maskPenalty(matrix: QrMatrix): number {
  const parts = maskPenaltyParts(matrix);

  return parts.runs + parts.blocks + parts.finderLike + parts.balance;
}

/* --- Сборка ---------------------------------------------------------------------------- */

export interface QrEncodeOptions {
  /** Маска вместо выбора по штрафу — для тестов и сверки с эталоном */
  mask?: number;
}

/** Матрица из байт; null — данные не помещаются в версию 10 */
export function encodeQrBytes(bytes: Uint8Array, options: QrEncodeOptions = {}): QrCodeData | null {
  const version = chooseVersion(bytes.length);

  if (version === null) return null;

  const canvas = createCanvas(version);

  drawFunctionPatterns(canvas, version);
  drawCodewords(canvas, interleaveWithEc(encodeDataCodewords(bytes, version), version));

  let best: { mask: number; modules: QrMatrix; penalty: number } | null = null;
  const masks = options.mask === undefined ? [0, 1, 2, 3, 4, 5, 6, 7] : [options.mask];

  for (const mask of masks) {
    drawFormat(canvas, mask);

    const modules = applyMask(canvas, mask);
    const penalty = maskPenalty(modules);

    // Строго меньше: при равном штрафе остаётся маска с меньшим номером
    if (!best || penalty < best.penalty) best = { mask, modules, penalty };
  }

  if (!best) return null;

  return { version, mask: best.mask, size: canvas.size, modules: best.modules };
}

/** Матрица из строки (UTF-8) */
export function encodeQr(text: string, options?: QrEncodeOptions): QrCodeData | null {
  return encodeQrBytes(new TextEncoder().encode(text), options);
}
