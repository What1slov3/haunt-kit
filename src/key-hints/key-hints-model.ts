/*
 * Раскладка меток KeyHints чистыми функциями: метки из алфавита (как в Vimium — ни одна не начало
 * другой, поэтому набор однозначен без Enter), порядок чтения, сопоставление набранного, место метки
 * в окне без наложений.
 */

/** Домашний ряд и соседи: буквы под пальцами, без похожих (i / l) и без f — она открывает подсказки */
export const DEFAULT_HINT_ALPHABET = 'sadjklewcmpgh';

/**
 * `count` меток из `alphabet`: короткие, пока хватает, и ни одна не префикс другой. Разворачиваем метки по
 * очереди — каждая развёрнутая уходит, вместо неё её продолжения; короткие остаются первыми.
 */
export function hintLabels(count: number, alphabet: string = DEFAULT_HINT_ALPHABET): string[] {
  const letters = [...new Set(alphabet.toLowerCase())];

  if (count <= 0 || letters.length === 0) return [];

  // Одна буква — метки «a», «aa», «aaa» были бы префиксами друг друга: однозначна только одна
  if (letters.length === 1) return count === 1 ? [letters[0] as string] : [];

  const hints = [''];
  let offset = 0;

  while (hints.length - offset < count || hints.length === 1) {
    const hint = hints[offset] ?? '';

    offset += 1;

    for (const letter of letters) hints.push(hint + letter);
  }

  return hints.slice(offset, offset + count);
}

export interface HintMatch {
  /** Индекс метки, набранной целиком; null — ещё не набрана */
  exact: number | null;
  /** Индексы меток, которые начинаются с набранного */
  candidates: number[];
}

export function matchHints(labels: readonly string[], typed: string): HintMatch {
  const candidates: number[] = [];
  let exact: number | null = null;

  labels.forEach((label, index) => {
    if (!label.startsWith(typed)) return;

    candidates.push(index);

    if (label === typed) exact = index;
  });

  return { exact, candidates };
}

export interface HintRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Порядок чтения: сверху вниз, в строке — слева направо. Элементы, чьи верхние края ближе `tolerance`, —
 * одна строка: кнопки разной высоты в одном тулбаре не должны путать порядок.
 */
export function readingOrder(rects: readonly HintRect[], tolerance = 8): number[] {
  return rects
    .map((rect, index) => ({ rect, index }))
    .sort((a, b) =>
      Math.abs(a.rect.top - b.rect.top) <= tolerance
        ? a.rect.left - b.rect.left
        : a.rect.top - b.rect.top,
    )
    .map((entry) => entry.index);
}

export interface HintPlacementOptions {
  viewport: { width: number; height: number };
  /** Ширина метки из n букв, px */
  labelWidth: (length: number) => number;
  labelHeight: number;
  /** Отступ от края окна */
  margin?: number;
}

/**
 * Левый верхний угол каждой метки: у левого верхнего угла элемента, внутри окна. Налезает на уже
 * поставленную — сдвигается вправо за неё: в плотном тулбаре метки соседних кнопок не должны закрывать
 * друг друга.
 */
export function placeHints(
  rects: readonly HintRect[],
  labels: readonly string[],
  { viewport, labelWidth, labelHeight, margin = 2 }: HintPlacementOptions,
): Array<{ x: number; y: number }> {
  const placed: HintRect[] = [];

  return rects.map((rect, index) => {
    const width = labelWidth(labels[index]?.length ?? 1);
    const clampX = (x: number) => Math.min(Math.max(x, margin), viewport.width - width - margin);
    const y = Math.min(Math.max(rect.top, margin), viewport.height - labelHeight - margin);
    let x = clampX(rect.left);

    for (const other of placed) {
      const overlaps =
        x < other.left + other.width &&
        x + width > other.left &&
        y < other.top + other.height &&
        y + labelHeight > other.top;

      if (overlaps) x = clampX(other.left + other.width + 1);
    }

    placed.push({ left: x, top: y, width, height: labelHeight });

    return { x, y };
  });
}

/** Буква по физической клавише: в русской раскладке «f» приходит как «а», а метки — латиница */
export function letterFromCode(code: string): string | null {
  const match = /^Key([A-Z])$/.exec(code);

  return match ? (match[1] as string).toLowerCase() : null;
}
