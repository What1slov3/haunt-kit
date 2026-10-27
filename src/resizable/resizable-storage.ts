import type { PanelSize } from './resizable-math';

const PREFIX = 'haunt.resizable.';

const isPanelSize = (value: unknown): value is PanelSize =>
  (typeof value === 'number' && Number.isFinite(value) && value >= 0) ||
  (typeof value === 'string' && /^\d+(\.\d+)?(px|%)$/.test(value));

/**
 * Сохранённая раскладка, если она подходит к текущим панелям. Хранилище пишет кто угодно (другая версия
 * приложения, руками в DevTools), поэтому всё, что не массив размеров нужной длины, — как будто ничего нет.
 */
export function parseLayout(raw: string | null, count: number): PanelSize[] | null {
  if (!raw) return null;

  try {
    const value: unknown = JSON.parse(raw);

    return Array.isArray(value) && value.length === count && value.every(isPanelSize)
      ? value
      : null;
  } catch {
    return null;
  }
}

export function readLayout(id: string, count: number): PanelSize[] | null {
  try {
    return parseLayout(localStorage.getItem(PREFIX + id), count);
  } catch {
    // localStorage недоступен (приватный режим, запрет куки) — раскладка по умолчанию
    return null;
  }
}

export function writeLayout(id: string, layout: readonly PanelSize[]): void {
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(layout));
  } catch {
    // см. readLayout; переполненное хранилище — тоже не повод ронять перетаскивание
  }
}
