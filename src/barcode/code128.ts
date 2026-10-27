/*
 * Code 128, набор B (ISO/IEC 15417): печатный ASCII 32–126. Символ — 11 модулей: три штриха и три
 * пробела шириной 1–4; стоп — 13 модулей (лишний штрих 2 в конце). Контрольный символ — сумма
 * значений с весами по позиции, по модулю 103.
 */

/** Ширины «штрих, пробел, штрих, пробел, штрих, пробел» для значений 0–105 и стоп (106) */
// Таблица стандарта по десять в строке — так её сверяют глазами
// prettier-ignore
export const CODE128_PATTERNS: readonly string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

export const CODE128_START_B = 104;
export const CODE128_STOP = 106;

/** Тихая зона по стандарту — не меньше 10 модулей с каждой стороны */
export const CODE128_QUIET_ZONE = 10;

/** Строка кодируется набором B целиком: только печатный ASCII (пробел … `~`) */
export function isCode128B(text: string): boolean {
  return /^[\x20-\x7e]*$/.test(text);
}

/** Контрольный символ: старт с весом 1 и данные с весами 1, 2, 3… — сумма по модулю 103 */
export function code128Checksum(start: number, data: readonly number[]): number {
  return data.reduce((sum, value, index) => sum + value * (index + 1), start) % 103;
}

/**
 * Значения символов: старт B, данные (код символа − 32), контрольный, стоп. null — строка пустая или в
 * ней есть символ вне набора B (кириллица, перевод строки): частичный код хуже, чем никакой.
 */
export function encodeCode128B(text: string): number[] | null {
  if (!text || !isCode128B(text)) return null;

  const data = Array.from(text, (char) => char.charCodeAt(0) - 32);

  return [CODE128_START_B, ...data, code128Checksum(CODE128_START_B, data), CODE128_STOP];
}

/** Модули символов подряд: true — штрих, false — пробел (без тихих зон) */
export function code128Modules(values: readonly number[]): boolean[] {
  const modules: boolean[] = [];

  for (const value of values) {
    const pattern = CODE128_PATTERNS[value];

    if (pattern === undefined) throw new RangeError(`Code 128: нет символа ${value}`);

    Array.from(pattern).forEach((width, index) => {
      for (let i = 0; i < Number(width); i++) modules.push(index % 2 === 0);
    });
  }

  return modules;
}

export interface BarcodeBar {
  /** Начало штриха в модулях от левого края */
  x: number;
  /** Ширина в модулях */
  width: number;
}

/** Соседние модули-штрихи склеены в один прямоугольник: в SVG меньше узлов и нет щелей сглаживания */
export function barsFromModules(modules: readonly boolean[], offset = 0): BarcodeBar[] {
  const bars: BarcodeBar[] = [];
  let start = -1;

  modules.forEach((dark, index) => {
    if (dark && start < 0) start = index;

    if (!dark && start >= 0) {
      bars.push({ x: start + offset, width: index - start });
      start = -1;
    }
  });

  if (start >= 0) bars.push({ x: start + offset, width: modules.length - start });

  return bars;
}

export interface Code128Layout {
  bars: BarcodeBar[];
  /** Ширина вместе с тихими зонами, в модулях */
  width: number;
}

/** Готовая раскладка для SVG: штрихи со сдвигом на тихую зону и полная ширина */
export function code128Layout(text: string, quietZone = CODE128_QUIET_ZONE): Code128Layout | null {
  const values = encodeCode128B(text);

  if (!values) return null;

  const modules = code128Modules(values);

  return { bars: barsFromModules(modules, quietZone), width: modules.length + quietZone * 2 };
}
