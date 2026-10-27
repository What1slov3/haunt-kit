/*
 * Логика тура без React: переходы между шагами, поиск цели и геометрия «окна» в затемнении. Компонент —
 * тонкий слой над этим (решение 13a в docs/ui-kit.md).
 */

import type { ReactNode } from 'react';

/** Цель шага: CSS-селектор или функция — когда элемент проще достать ссылкой, чем описать селектором */
export type TourTarget = string | (() => Element | null);

export type TourSide = 'top' | 'right' | 'bottom' | 'left';

export interface TourStep {
  /** Ключ шага; по умолчанию — номер */
  id?: string;
  /** Что подсветить; без цели (или цель не нашлась) — карточка по центру, затемнение без окна */
  target?: TourTarget;
  title: ReactNode;
  content?: ReactNode;
  /** С какой стороны цели карточка; у края экрана Radix развернёт её сам */
  side?: TourSide;
  align?: 'start' | 'center' | 'end';
  /** Цель принимает клики (попробовать кнопку на шаге); по умолчанию — как у тура */
  clickable?: boolean;
  /** Поле «окна» вокруг цели, px; по умолчанию — как у тура */
  padding?: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export type TourMove = { type: 'step'; index: number } | { type: 'finish' };

export function resolveTarget(
  target: TourTarget | undefined,
  root: ParentNode = document,
): Element | null {
  if (!target) return null;
  if (typeof target === 'function') return target();

  try {
    return root.querySelector(target);
  } catch {
    // Кривой селектор в данных шага — шаг без цели, а не упавший экран
    return null;
  }
}

export function clampStep(index: number, count: number): number {
  return Math.min(Math.max(0, Math.floor(index)), Math.max(0, count - 1));
}

/** «Далее» на последнем шаге — это «Готово» */
export function nextMove(index: number, count: number): TourMove {
  return index >= count - 1 ? { type: 'finish' } : { type: 'step', index: index + 1 };
}

export function previousIndex(index: number): number {
  return Math.max(0, index - 1);
}

/** Прогресс моно-строкой: `2 / 5` */
export function progressLabel(index: number, count: number): string {
  return `${index + 1} / ${count}`;
}

export function padRect(rect: Rect, padding: number): Rect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

/** Цель видна целиком с запасом `margin` — иначе к ней надо прокрутить */
export function isRectVisible(rect: Rect, viewport: Viewport, margin = 0): boolean {
  return (
    rect.y >= margin &&
    rect.x >= margin &&
    rect.y + rect.height <= viewport.height - margin &&
    rect.x + rect.width <= viewport.width - margin
  );
}

/** Без цели карточка встаёт под этой точкой: по центру экрана, на трети высоты */
export function centerAnchor(viewport: Viewport): Rect {
  return { x: viewport.width / 2, y: viewport.height / 3, width: 0, height: 0 };
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Затемнение с окном — один путь `evenodd`: прямоугольник экрана и скруглённый прямоугольник окна. Без
 * цели окно схлопывается в точку в центре, а не пропадает: у пути остаётся тот же набор команд, и
 * переход между шагами интерполируется браузером (path() анимируется, только если команды совпадают).
 */
export function spotlightPath(hole: Rect | null, viewport: Viewport, radius: number): string {
  const { width: w, height: h } = viewport;
  const { x, y, width, height } = hole ?? { x: w / 2, y: h / 2, width: 0, height: 0 };
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const [left, top, right, bottom] = [x, y, x + width, y + height].map(round) as [
    number,
    number,
    number,
    number,
  ];
  const rr = round(r);

  return [
    `M0 0H${round(w)}V${round(h)}H0Z`,
    `M${round(left + r)} ${top}`,
    `H${round(right - r)}`,
    `A${rr} ${rr} 0 0 1 ${right} ${round(top + r)}`,
    `V${round(bottom - r)}`,
    `A${rr} ${rr} 0 0 1 ${round(right - r)} ${bottom}`,
    `H${round(left + r)}`,
    `A${rr} ${rr} 0 0 1 ${left} ${round(bottom - r)}`,
    `V${round(top + r)}`,
    `A${rr} ${rr} 0 0 1 ${round(left + r)} ${top}`,
    'Z',
  ].join('');
}

export function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (!a || !b) return a === b;

  return (
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}
