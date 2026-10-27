export type PinType = 'numeric' | 'alphanumeric';

export interface PinEdit {
  value: string;
  /** Ячейка, в которую переходит фокус после правки */
  focus: number;
}

/**
 * Только допустимые символы: цифры или латиница с цифрами. Буквы — в верхнем регистре: код читают
 * с экрана, а «l» и «I» в нижнем регистре моно-шрифта путаются.
 */
export function sanitizePin(text: string, type: PinType): string {
  if (type === 'numeric') return text.replace(/\D/g, '');

  return text.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

/**
 * Ввод с ячейки index: символы ложатся по порядку, заменяя стоящие. Код не бывает с дырами — ввод в
 * ячейку дальше заполненных начинается с первой пустой. Вставка не короче всего кода заполняет
 * его целиком с начала: так вставляют код из письма, где бы ни стоял фокус.
 */
export function insertPin(
  value: string,
  index: number,
  text: string,
  length: number,
  type: PinType,
): PinEdit {
  const chars = sanitizePin(text, type);

  if (!chars) return { value, focus: Math.min(index, value.length, length - 1) };

  if (chars.length >= length) return { value: chars.slice(0, length), focus: length - 1 };

  const start = Math.min(index, value.length);
  const next = (value.slice(0, start) + chars + value.slice(start + chars.length)).slice(0, length);

  return { value: next, focus: Math.min(start + chars.length, length - 1) };
}

/** Backspace: заполненная ячейка очищается, с пустой фокус уходит назад и очищает предыдущую */
export function removePin(value: string, index: number): PinEdit {
  if (index < value.length) {
    return { value: value.slice(0, index) + value.slice(index + 1), focus: index };
  }

  if (value.length === 0) return { value, focus: 0 };

  return { value: value.slice(0, -1), focus: value.length - 1 };
}
