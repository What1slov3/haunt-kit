export interface NumberBounds {
  min?: number;
  max?: number;
}

/** Знаков после запятой у шага: 0.25 → 2. Ими округляется результат, чтобы 0.1 + 0.2 не давало хвост */
export function precisionOf(step: number): number {
  const [, fraction = ''] = String(step).split('.');

  return fraction.length;
}

export function clamp(value: number, { min, max }: NumberBounds): number {
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;

  return value;
}

/** Ввод человека: запятая равна точке, пустое и «-» — не число */
export function parseNumber(text: string): number | null {
  const normalized = text.trim().replace(',', '.');

  if (normalized === '' || normalized === '-' || normalized === '.') return null;

  const value = Number(normalized);

  return Number.isFinite(value) ? value : null;
}

export function formatNumber(value: number | null, precision: number): string {
  if (value === null) return '';

  return precision > 0 ? value.toFixed(precision) : String(Math.round(value));
}

/** Оставляет в вводе только то, из чего может получиться число: цифры, один разделитель, минус в начале */
export function sanitizeNumberText(
  text: string,
  allowNegative: boolean,
  allowFraction: boolean,
): string {
  let result = '';
  let hasSeparator = false;

  for (const [index, char] of Array.from(text).entries()) {
    if (/\d/.test(char)) {
      result += char;
    } else if (char === '-' && allowNegative && index === 0) {
      result += char;
    } else if ((char === '.' || char === ',') && allowFraction && !hasSeparator) {
      hasSeparator = true;
      result += char;
    }
  }

  return result;
}

/**
 * Шаг от текущего значения. Без значения шаг начинается с нижней границы (или с нуля), а не
 * прибавляется к нулю: «+» на пустом поле с min 5 даёт 5, а не 1.
 */
export function stepNumber(
  current: number | null,
  delta: number,
  step: number,
  bounds: NumberBounds,
): number {
  const precision = precisionOf(step);

  if (current === null) return clamp(bounds.min ?? 0, bounds);

  const next = Number((current + delta).toFixed(precision));

  return clamp(next, bounds);
}
