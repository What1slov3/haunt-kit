import { enStrings } from './en';
import { ruStrings } from './ru';
import type { UiStrings, UiStringsOverride } from './ui-strings-types';

const dictionaries: Record<string, UiStrings> = { en: enStrings, ru: ruStrings };

/**
 * Словарь по локали Intl: `ru-RU` → ru, `en-GB` → en. Для языка без своего словаря — английский: продукт
 * не только для РФ (решение 0012), а свой язык приложение передаёт целиком через `strings`.
 */
export function stringsForLocale(locale: string): UiStrings {
  const language = locale.split(/[-_]/)[0]?.toLowerCase() ?? '';

  return dictionaries[language] ?? enStrings;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeDeep(base: Record<string, unknown>, patch: Record<string, unknown>) {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;

    const current = result[key];

    result[key] =
      isPlainObject(current) && isPlainObject(value) ? mergeDeep(current, value) : value;
  }

  return result;
}

/** Словарь с частичной перезаписью поверх: вложенные объекты сливаются, функции и массивы заменяются */
export function mergeUiStrings(base: UiStrings, override?: UiStringsOverride): UiStrings {
  if (!override) return base;

  return mergeDeep(
    base as unknown as Record<string, unknown>,
    override as Record<string, unknown>,
  ) as unknown as UiStrings;
}
