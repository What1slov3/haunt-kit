export interface CollapsedPath {
  /** Индексы, видимые до многоточия */
  before: number[];
  /** Индексы, свёрнутые в многоточие; пусто — сворачивать нечего */
  hidden: number[];
  /** Индексы после многоточия; последний — всегда текущая страница */
  after: number[];
}

const range = (from: number, to: number) =>
  Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i);

/**
 * Какие крошки показать при длинном пути. Многоточие считается за элемент: на экране не больше `maxItems`
 * элементов, и свёрнуто всегда хотя бы два — менять одну крошку на `…` бессмысленно. Начало пути
 * (`itemsBefore`, обычно корень — пространство) и текущая страница не сворачиваются никогда.
 */
export function collapseBreadcrumbs(
  count: number,
  maxItems: number,
  itemsBefore = 1,
): CollapsedPath {
  if (count <= maxItems) return { before: range(0, count), hidden: [], after: [] };

  const limit = Math.max(2, Math.floor(maxItems));
  // Одно место — многоточию, хотя бы одно — текущей странице
  const before = Math.min(Math.max(0, Math.floor(itemsBefore)), limit - 2);
  const after = limit - 1 - before;

  return {
    before: range(0, before),
    hidden: range(before, count - after),
    after: range(count - after, count),
  };
}
