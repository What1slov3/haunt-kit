/*
 * Логика перетаскивания SortableList — чистыми функциями. Во время перетаскивания DOM не переставляется:
 * прямоугольники строк сняты в начале, соседи раздвигаются transform-ами, порядок меняет только
 * onReorder в конце. Поэтому вся геометрия считается от снимка, а не от текущего DOM.
 */

import { ruStrings } from '../strings/ru';

/** Строка в снимке: верх от начала списка и высота */
export interface ItemRect {
  top: number;
  height: number;
}

/** Новый массив, где элемент from стоит на месте to; остальные сдвигаются */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];

  if (from < 0 || from >= next.length || from === to) return next;

  const [moved] = next.splice(from, 1);

  next.splice(Math.min(Math.max(0, to), next.length), 0, moved as T);

  return next;
}

export function clampIndex(index: number, count: number): number {
  return Math.min(Math.max(0, index), Math.max(0, count - 1));
}

/**
 * Куда встанет перетаскиваемая строка: столько соседей, сколько серединами выше её центра. Середина,
 * а не край, — строку не надо дотаскивать до конца соседа, хватает перевалить за его половину.
 */
export function targetIndex(
  rects: readonly ItemRect[],
  from: number,
  draggedCenter: number,
): number {
  let index = 0;

  rects.forEach((rect, position) => {
    if (position !== from && rect.top + rect.height / 2 < draggedCenter) index += 1;
  });

  return index;
}

/** На сколько раздвигается сосед: на высоту перетаскиваемой строки с зазором между строками */
export function stepDistance(rects: readonly ItemRect[], from: number): number {
  const current = rects[from];

  if (!current) return 0;

  const next = rects[from + 1];
  const previous = rects[from - 1];
  const gap = next
    ? next.top - (current.top + current.height)
    : previous
      ? current.top - (previous.top + previous.height)
      : 0;

  return current.height + Math.max(0, gap);
}

/** Сдвиг соседа index, пока строка from стоит на месте to: те, что между, уступают ей место */
export function shiftFor(index: number, from: number, to: number, distance: number): number {
  if (index === from) return 0;
  if (from < to && index > from && index <= to) return -distance;
  if (to < from && index >= to && index < from) return distance;

  return 0;
}

/**
 * Верх места, куда ляжет строка from на позиции to (для «призрака» и анимации приземления). Вниз —
 * нижней кромкой к нижней кромке строки to: соседи разной высоты, а стыкуется она с низом последнего.
 */
export function slotTop(rects: readonly ItemRect[], from: number, to: number): number {
  const dragged = rects[from];
  const target = rects[to];

  if (!dragged || !target) return dragged?.top ?? 0;
  if (to > from) return target.top + target.height - dragged.height;

  return target.top;
}

/**
 * Скорость автопрокрутки у края контейнера, px за кадр: 0 вне зоны, растёт к краю до `max`.
 * Отрицательная — вверх. Линейно: человек сам регулирует скорость, подводя курсор ближе.
 */
export function autoScrollSpeed(
  pointer: number,
  edgeStart: number,
  edgeEnd: number,
  zone = 48,
  max = 16,
): number {
  if (pointer < edgeStart + zone) {
    return -Math.round(max * Math.min(1, (edgeStart + zone - pointer) / zone));
  }

  if (pointer > edgeEnd - zone) {
    return Math.round(max * Math.min(1, (pointer - (edgeEnd - zone)) / zone));
  }

  return 0;
}

/** Фразы для скринридера: что взято, куда сдвинуто, чем кончилось. Позиции — с единицы */
export interface SortableMessages {
  picked: (label: string, position: number, total: number) => string;
  moved: (label: string, position: number, total: number) => string;
  dropped: (label: string, position: number, total: number) => string;
  cancelled: (label: string, position: number, total: number) => string;
  /** Подсказка у каждой перетаскиваемой строки (aria-describedby) */
  instructions: string;
}

/** Русские фразы; SortableList берёт фразы языка из UiStringsProvider */
export const defaultSortableMessages: SortableMessages = ruStrings.sortableList;
