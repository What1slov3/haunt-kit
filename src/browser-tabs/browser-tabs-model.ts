/*
 * Логика BrowserTabs чистыми функциями: группы закреплённых и обычных вкладок, соседи по кругу, кого
 * открыть после закрытия, куда встанет перетаскиваемая. Геометрия перетаскивания — та же, что у
 * SortableList (sortable-math), только по оси X: прямоугольник вкладки — { top: left, height: width }.
 */

import { shiftFor, stepDistance, targetIndex, type ItemRect } from '../sortable-list/sortable-math';

export interface TabLike {
  id: string;
  pinned?: boolean;
}

/**
 * Границы, в которых может стоять вкладка index: закреплённые — только среди закреплённых в начале,
 * обычные — после них. Иначе перетаскивание смешало бы группы, а закреплённые — всегда слева.
 */
export function groupRange(tabs: readonly TabLike[], index: number): [number, number] {
  const pinnedCount = tabs.filter((tab) => tab.pinned).length;

  return tabs[index]?.pinned ? [0, Math.max(0, pinnedCount - 1)] : [pinnedCount, tabs.length - 1];
}

/** Соседняя вкладка по кругу: Ctrl+Tab с последней — на первую */
export function cycleIndex(count: number, current: number, delta: number): number {
  if (count <= 0) return -1;

  return (((current + delta) % count) + count) % count;
}

/**
 * Какую вкладку открыть, когда закрывают `closingId`. Закрывают неактивную — активная остаётся; активную —
 * соседку справа, а у последней — слева, как в браузере: взгляд остаётся на том же месте полосы.
 */
export function tabAfterClose(
  tabs: readonly TabLike[],
  closingId: string,
  activeId: string | null,
): string | null {
  if (closingId !== activeId) return activeId;

  const index = tabs.findIndex((tab) => tab.id === closingId);

  if (index === -1) return activeId;

  return tabs[index + 1]?.id ?? tabs[index - 1]?.id ?? null;
}

/** Вкладка в снимке перетаскивания: левый край от начала полосы и ширина */
export interface TabRect {
  left: number;
  width: number;
}

const asItems = (rects: readonly TabRect[]): ItemRect[] =>
  rects.map((rect) => ({ top: rect.left, height: rect.width }));

/** Куда встанет перетаскиваемая вкладка при её центре `center`, не выходя из своей группы */
export function dropIndex(
  rects: readonly TabRect[],
  from: number,
  center: number,
  range: readonly [number, number],
): number {
  const index = targetIndex(asItems(rects), from, center);

  return Math.min(Math.max(index, range[0]), range[1]);
}

/** Сдвиг соседки index, пока вкладка from стоит на месте to: те, что между, уступают место */
export function tabShift(rects: readonly TabRect[], index: number, from: number, to: number) {
  return shiftFor(index, from, to, stepDistance(asItems(rects), from));
}

/**
 * Сдвиг перетаскиваемой вкладки за курсором: до краёв её группы и ещё на полвкладки за них. Без запаса
 * центр упирался бы ровно в центр крайней соседки и не переходил его — на крайнее место не встать.
 */
export function clampDragOffset(
  rects: readonly TabRect[],
  from: number,
  offset: number,
  range: readonly [number, number],
): number {
  const dragged = rects[from];
  const first = rects[range[0]];
  const last = rects[range[1]];

  if (!dragged || !first || !last) return offset;

  const slack = dragged.width / 2;
  const min = first.left - dragged.left - slack;
  const max = last.left + last.width - (dragged.left + dragged.width) + slack;

  return Math.min(Math.max(offset, min), max);
}
