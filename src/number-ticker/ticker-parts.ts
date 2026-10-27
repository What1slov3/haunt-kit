export interface TickerPart {
  /** Ключ — позиция с конца: разряд единиц остаётся тем же элементом, когда число растёт 999 → 1 000 */
  key: string;
  char: string;
  /** Цифра 0–9 — катится; null — знак, разделитель, единица — стоит */
  digit: number | null;
}

/** Разобрать отформатированное число на цифры и всё остальное (разделители разрядов, знак, %, «тыс.») */
export function tickerParts(formatted: string): TickerPart[] {
  const chars = [...formatted];

  return chars.map((char, index) => ({
    key: `p${chars.length - index}`,
    char,
    digit: /^[0-9]$/.test(char) ? Number(char) : null,
  }));
}
