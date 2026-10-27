/*
 * Автодополнение CommandLine чистыми функциями: подсказки из списка, общий префикс, что подставит Tab.
 * История ↑ / ↓ — та же, что у строки ввода LogView (log-view/log-view-history.ts).
 */

import { filterOptions } from '../combobox/combobox-filter';

export interface CommandSuggestion {
  /** Что встанет в строку при выборе */
  value: string;
  /** Подпись в списке; по умолчанию — value */
  label?: string;
  /** Пояснение справа: что делает команда */
  description?: string;
}

export const toSuggestion = (item: string | CommandSuggestion): CommandSuggestion =>
  typeof item === 'string' ? { value: item } : item;

/**
 * Подсказки из готового списка под набранное: начало строки — выше (ранжирование как у Combobox),
 * не больше `limit`. Пустая строка — подсказок нет: список не должен висеть над пустым приглашением.
 */
export function matchSuggestions(
  items: readonly (string | CommandSuggestion)[],
  query: string,
  limit: number,
): CommandSuggestion[] {
  if (query.trim() === '') return [];

  const options = items
    .map(toSuggestion)
    .map((item) => ({ ...item, label: item.label ?? item.value }));

  return filterOptions(options, query)
    .filter((item) => item.value !== query)
    .slice(0, Math.max(0, limit))
    .map(({ value, label, description }) => ({ value, label, description }));
}

/** Общее начало строк (без учёта регистра — по первой строке) */
export function commonPrefix(values: readonly string[]): string {
  const [first, ...rest] = values;

  if (first === undefined) return '';

  let length = first.length;

  for (const value of rest) {
    let index = 0;

    while (
      index < length &&
      index < value.length &&
      first[index]?.toLowerCase() === value[index]?.toLowerCase()
    ) {
      index += 1;
    }

    length = index;
  }

  return first.slice(0, length);
}

/**
 * Что подставит Tab: выбранную стрелками подсказку; иначе общее начало всех подсказок, если оно длиннее
 * набранного (как bash); иначе первую. Подсказок нет — null, и Tab уводит фокус как обычно.
 */
export function completion(
  value: string,
  suggestions: readonly CommandSuggestion[],
  active: number | null,
): string | null {
  if (suggestions.length === 0) return null;

  const chosen = active === null ? undefined : suggestions[active];

  if (chosen) return chosen.value;

  const values = suggestions.map((item) => item.value);
  const prefix = commonPrefix(values);
  const startsWith = values.every((item) => item.toLowerCase().startsWith(value.toLowerCase()));

  if (startsWith && prefix.length > value.length) return value + prefix.slice(value.length);

  return values[0] ?? null;
}
