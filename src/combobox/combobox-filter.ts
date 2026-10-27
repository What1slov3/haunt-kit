/** Пункт списка Combobox: значение, подпись и необязательные слова для поиска (ник, id) */
export interface ComboboxSearchable {
  label: string;
  /** Дополнительные слова для поиска: ник, транслит, id — в подписи их не видно */
  keywords?: readonly string[];
}

export interface TextSegment {
  text: string;
  match: boolean;
}

/*
 * Нормализация посимвольная: индексы совпадений в нормализованной строке должны совпадать с исходной,
 * иначе подсветка съедет. Символ, у которого нижний регистр длиннее одного знака («İ»), остаётся как есть.
 */
function normalizeChar(char: string): string {
  const lower = char.toLowerCase();

  if (lower === 'ё') return 'е';

  return lower.length === char.length ? lower : char;
}

/** Нижний регистр и «ё» → «е»; длина строки сохраняется */
export function normalize(text: string): string {
  return Array.from(text, normalizeChar).join('');
}

/** Слова запроса: «влад вагн» ищет пункты, где есть оба слова в любом порядке */
export function queryTokens(query: string): string[] {
  return normalize(query).trim().split(/\s+/).filter(Boolean);
}

/**
 * Насколько хорошо пункт подходит запросу: 0 — подпись начинается с запроса, 1 — какое-то слово
 * запроса стоит в начале слова подписи, 2 — просто входит в подпись, 3 — нашлось только в keywords;
 * null — не подходит. Каждое слово запроса должно найтись в подписи или в keywords.
 */
export function matchScore(option: ComboboxSearchable, query: string): number | null {
  const tokens = queryTokens(query);

  if (tokens.length === 0) return 0;

  const label = normalize(option.label);
  const keywords = (option.keywords ?? []).map(normalize);
  let inLabelOnly = true;

  for (const token of tokens) {
    if (label.includes(token)) continue;
    if (!keywords.some((keyword) => keyword.includes(token))) return null;

    inLabelOnly = false;
  }

  if (!inLabelOnly) return 3;
  if (label.startsWith(tokens.join(' '))) return 0;

  const wordStart = tokens.some((token) =>
    new RegExp(`(^|[\\s\\-_.@#])${escapeRegExp(token)}`).test(label),
  );

  return wordStart ? 1 : 2;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Пункты под запрос, лучшие сверху. Сортировка устойчивая: внутри одного балла порядок исходного
 * списка сохраняется — так он остаётся предсказуемым (по алфавиту, по ролям).
 */
export function filterOptions<T extends ComboboxSearchable>(
  options: readonly T[],
  query: string,
): T[] {
  if (queryTokens(query).length === 0) return [...options];

  return options
    .map((option, index) => ({ option, index, score: matchScore(option, query) }))
    .filter((entry): entry is { option: T; index: number; score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((entry) => entry.option);
}

/** Диапазоны [начало, конец) всех вхождений слов запроса в тексте, слитые и упорядоченные */
export function matchRanges(text: string, query: string): Array<[number, number]> {
  const haystack = normalize(text);
  const ranges: Array<[number, number]> = [];

  for (const token of queryTokens(query)) {
    let from = haystack.indexOf(token);

    while (from !== -1) {
      ranges.push([from, from + token.length]);
      from = haystack.indexOf(token, from + token.length);
    }
  }

  ranges.sort((a, b) => a[0] - b[0]);

  const merged: Array<[number, number]> = [];

  for (const range of ranges) {
    const last = merged.at(-1);

    if (last && range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push([...range]);
    }
  }

  return merged;
}

/** Текст, разбитый на куски с совпадением и без — для <mark> в подписи пункта */
export function highlightSegments(text: string, query: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const [start, end] of matchRanges(text, query)) {
    if (start > cursor) segments.push({ text: text.slice(cursor, start), match: false });

    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });

  return segments;
}
