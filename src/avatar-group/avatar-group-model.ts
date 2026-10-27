import { ruStrings } from '../strings/ru';

export interface OverflowSplit<T> {
  visible: T[];
  hidden: T[];
}

/** Первые `max` — аватарами, остальные — в «+N»; без `max` (или при max ≥ длины) видны все */
export function splitOverflow<T>(items: readonly T[], max?: number): OverflowSplit<T> {
  if (max === undefined || items.length <= max) return { visible: [...items], hidden: [] };

  const limit = Math.max(0, Math.floor(max));

  return { visible: items.slice(0, limit), hidden: items.slice(limit) };
}

/**
 * Список скрытых имён для подсказки «+N»: длинный список обрезается, иначе подсказка вырастает
 * на полэкрана. `more` — как сказать остаток («и ещё 3»).
 */
export function hiddenNamesLabel(
  names: readonly string[],
  limit = 8,
  more: (count: number) => string = ruStrings.avatarGroup.andMore,
): string {
  if (names.length <= limit) return names.join(', ');

  return `${names.slice(0, limit).join(', ')} ${more(names.length - limit)}`;
}
