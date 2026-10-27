/*
 * Общие мелочи текстовых и частичных эффектов: разбивка на графемы и детерминированный генератор
 * случайных чисел. Графемы — а не `[...text]`: эмодзи с модификаторами и флаги — один символ на табло и
 * в печатной машинке, иначе половина эмодзи «печатается» отдельным квадратиком.
 */

let segmenter: Intl.Segmenter | null | undefined;

/** Строка → графемы (видимые символы). Без Intl.Segmenter — по кодовым точкам */
export function graphemes(text: string): string[] {
  if (segmenter === undefined) {
    segmenter =
      typeof Intl !== 'undefined' && 'Segmenter' in Intl
        ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
        : null;
  }

  if (!segmenter) return [...text];

  return Array.from(segmenter.segment(text), (part) => part.segment);
}

/**
 * Детерминированный генератор 0…1 (mulberry32): тот же seed — та же раскладка частиц и дрожи, поэтому
 * кадр повторяем в тестах и на скриншотах.
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const isSpace = (char: string) => /^\s+$/u.test(char);
