import type { ReactNode } from 'react';

/*
 * Строка поиска с фильтрами: `from:@anna in:#general has:file before:2026-10-01 привет`. Фильтр — слово
 * `ключ:значение` с известным ключом и годным значением; значение с пробелами — в кавычках
 * (`in:"voice lounge"`). Всё остальное — свободный текст. Разбор и сборка — чистые функции: строку
 * можно хранить в адресе страницы и восстановить те же чипы.
 */

export interface SearchValueOption {
  /** Что встанет после `ключ:` (без `valuePrefix`) */
  value: string;
  label?: string;
  description?: string;
  icon?: ReactNode;
}

/** Подсказки значений: массив или функция с отменой — запрос меняется на каждый символ */
export type SearchValueSource =
  | readonly SearchValueOption[]
  | ((
      query: string,
      signal: AbortSignal,
    ) => readonly SearchValueOption[] | Promise<readonly SearchValueOption[]>);

export interface SearchKey {
  /** Ключ до двоеточия: `from`, `in`, `has` */
  key: string;
  /** Что значит ключ — вторая подпись в подсказке: «от участника» */
  label?: string;
  /** Знак перед значением: `@` у участника, `#` у канала — в запросе он не обязателен */
  valuePrefix?: string;
  values?: SearchValueSource;
  /** Годится ли значение; нет — слово остаётся свободным текстом */
  validate?: (value: string) => boolean;
  /** Подсказка формата, когда предлагать нечего: «ГГГГ-ММ-ДД» */
  placeholder?: string;
}

export interface SearchFilter {
  key: string;
  value: string;
}

export interface SearchQueryValue {
  filters: SearchFilter[];
  text: string;
}

export interface QueryToken {
  raw: string;
  start: number;
  end: number;
  /** Кавычка открыта и не закрыта — слово ещё набирается */
  open: boolean;
}

/** Слова строки с позициями; пробел внутри кавычек слово не рвёт, `\"` — кавычка внутри */
export function tokenizeQuery(input: string): QueryToken[] {
  const tokens: QueryToken[] = [];
  let index = 0;

  while (index < input.length) {
    while (index < input.length && /\s/u.test(input[index]!)) index++;

    if (index >= input.length) break;

    const start = index;
    let quoted = false;

    while (index < input.length && (quoted || !/\s/u.test(input[index]!))) {
      if (input[index] === '\\' && quoted) index++;
      else if (input[index] === '"') quoted = !quoted;

      index++;
    }

    tokens.push({ raw: input.slice(start, index), start, end: index, open: quoted });
  }

  return tokens;
}

function unquote(value: string): string | null {
  if (!value.startsWith('"')) return value.includes('"') ? null : value;
  if (value.length < 2 || !value.endsWith('"') || value.endsWith('\\"')) return null;

  return value.slice(1, -1).replace(/\\(["\\])/g, '$1');
}

const KEY = /^([\p{L}_][\p{L}\p{N}_-]*):(.*)$/su;

/** Слово как фильтр: известный ключ, непустое годное значение; иначе null */
export function parseFilter(raw: string, keys: readonly SearchKey[]): SearchFilter | null {
  const match = KEY.exec(raw);

  if (!match) return null;

  const definition = keys.find((item) => item.key.toLowerCase() === match[1]!.toLowerCase());
  const value = unquote(match[2]!);

  if (!definition || !value) return null;
  if (definition.validate && !definition.validate(value)) return null;

  return { key: definition.key, value };
}

/** Строка → фильтры и свободный текст (слова текста через один пробел) */
export function parseSearchQuery(input: string, keys: readonly SearchKey[]): SearchQueryValue {
  const filters: SearchFilter[] = [];
  const text: string[] = [];

  for (const token of tokenizeQuery(input)) {
    const filter = token.open ? null : parseFilter(token.raw, keys);

    if (filter) filters.push(filter);
    else text.push(token.raw);
  }

  return { filters, text: text.join(' ') };
}

export function formatFilter(filter: SearchFilter): string {
  const needsQuotes = /[\s"]/u.test(filter.value) || filter.value === '';
  const value = needsQuotes ? `"${filter.value.replace(/(["\\])/g, '\\$1')}"` : filter.value;

  return `${filter.key}:${value}`;
}

/** Фильтры, затем текст — порядок один, так одна и та же выборка даёт одну и ту же строку */
export function formatSearchQuery(value: SearchQueryValue): string {
  return [...value.filters.map(formatFilter), value.text.trim()].filter(Boolean).join(' ');
}

/**
 * Готовые фильтры из набираемого текста: слово-фильтр, за которым уже стоит пробел, становится чипом.
 * Последнее слово без пробела ещё набирается и остаётся в тексте — `in:#gen` не должен стать чипом.
 * Текст вокруг сохраняется как был, кроме пробелов на месте ушедших слов.
 */
export function absorbFilters(
  draft: string,
  keys: readonly SearchKey[],
  { all = false }: { all?: boolean } = {},
): { filters: SearchFilter[]; rest: string } {
  const filters: SearchFilter[] = [];
  let rest = '';
  let cursor = 0;

  for (const token of tokenizeQuery(draft)) {
    const finished = all || token.end < draft.length;
    const filter = finished && !token.open ? parseFilter(token.raw, keys) : null;

    if (!filter) continue;

    filters.push(filter);
    rest += draft.slice(cursor, token.start);
    // Пробел после ушедшего слова тоже уходит, чтобы на его месте не копились пробелы
    cursor = token.end;

    while (cursor < draft.length && /\s/u.test(draft[cursor]!)) cursor++;
  }

  rest += draft.slice(cursor);

  return { filters, rest: filters.length > 0 ? rest.replace(/^\s+/u, '') : rest };
}

export type SearchContext =
  | { kind: 'key'; query: string; token: QueryToken }
  | { kind: 'value'; key: SearchKey; query: string; token: QueryToken };

/**
 * Что подсказывать у курсора: ключи (слово без двоеточия, в том числе пустое — список всех ключей) или
 * значения известного ключа (`from:ан`). Курсор посреди чужого слова или после кавычки — ничего.
 */
export function searchContext(
  draft: string,
  caret: number,
  keys: readonly SearchKey[],
): SearchContext | null {
  const token =
    tokenizeQuery(draft).find((item) => caret >= item.start && caret <= item.end) ??
    ({ raw: '', start: caret, end: caret, open: false } satisfies QueryToken);
  const before = token.raw.slice(0, caret - token.start);
  const colon = before.indexOf(':');

  if (colon === -1) {
    if (/["\s]/u.test(before)) return null;

    return { kind: 'key', query: before.toLowerCase(), token };
  }

  const definition = keys.find(
    (item) => item.key.toLowerCase() === before.slice(0, colon).toLowerCase(),
  );

  if (!definition) return null;

  let query = before.slice(colon + 1).replace(/^"/, '');

  if (definition.valuePrefix && query.startsWith(definition.valuePrefix)) {
    query = query.slice(definition.valuePrefix.length);
  }

  return { kind: 'value', key: definition, query, token };
}

/** Ключи под набранное начало: по ключу, затем по подписи */
export function matchKeys(keys: readonly SearchKey[], query: string): SearchKey[] {
  const needle = query.toLowerCase();

  if (!needle) return [...keys];

  return keys.filter(
    (item) =>
      item.key.toLowerCase().startsWith(needle) || item.label?.toLowerCase().includes(needle),
  );
}

/** Статичные значения под запрос: начало значения или подписи */
export function matchValues(
  options: readonly SearchValueOption[],
  query: string,
): SearchValueOption[] {
  const needle = query.toLocaleLowerCase();

  if (!needle) return [...options];

  return options.filter(
    (option) =>
      option.value.toLocaleLowerCase().startsWith(needle) ||
      option.label?.toLocaleLowerCase().includes(needle),
  );
}

/** Заменить слово [start, end) черновика и вернуть позицию курсора за вставкой */
export function replaceToken(
  draft: string,
  token: QueryToken,
  replacement: string,
): { draft: string; caret: number } {
  const next = draft.slice(0, token.start) + replacement + draft.slice(token.end);

  return { draft: next, caret: token.start + replacement.length };
}
