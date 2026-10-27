import { graphemes } from '../text-utils';

/*
 * Разбивка текста для TextReveal — чистые функции. Пробелы остаются текстом между словами: перенос
 * строк идёт, как в обычном абзаце. Слово — неразрывный блок, внутри него символы (режим `char`).
 */

export type RevealToken =
  | { type: 'space'; text: string }
  | {
      type: 'word';
      text: string;
      chars: string[];
      /** Номер слова в тексте */
      word: number;
      /** Номер первого символа слова среди всех непробельных символов */
      charStart: number;
    };

export function splitReveal(text: string): RevealToken[] {
  const tokens: RevealToken[] = [];
  let word = 0;
  let charStart = 0;

  for (const part of text.split(/(\s+)/u)) {
    if (!part) continue;

    if (/^\s+$/u.test(part)) {
      tokens.push({ type: 'space', text: part });
      continue;
    }

    const chars = graphemes(part);

    tokens.push({ type: 'word', text: part, chars, word: word++, charStart });
    charStart += chars.length;
  }

  return tokens;
}

/**
 * Номера строк по вертикальным позициям слов (offsetTop): слова с одной высотой — одна строка.
 * `tolerance` — разница в пикселях, которую ещё считаем той же строкой (эмодзи, другой кегль в строке).
 */
export function groupLines(tops: readonly number[], tolerance = 2): number[] {
  const lines: number[] = [];
  let line = -1;
  let lineTop = -Infinity;

  for (const top of tops) {
    if (top - lineTop > tolerance) {
      line += 1;
      lineTop = top;
    }

    lines.push(Math.max(line, 0));
  }

  return lines;
}
