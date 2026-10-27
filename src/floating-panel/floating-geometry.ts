/*
 * Геометрия FloatingPanel чистыми функциями: границы окна, прилипание к краям и углам, якорь (к какому
 * краю прижата панель — так она остаётся в углу, когда окно меняет размер), изменение размера за угол,
 * шаг стрелками. Координаты — в px от левого верхнего угла окна.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export type Rect = Point & Size;

/** К какому краю прижата панель по оси; null — свободно, держит координату */
export type AnchorEdge = 'start' | 'end' | null;

/**
 * Место панели: координата и прижатые края. Прижатая к правому краю (`x: 'end'`) при сужении окна едет
 * вместе с краем, свободная — остаётся, пока влезает
 */
export interface Placement extends Point {
  anchorX: AnchorEdge;
  anchorY: AnchorEdge;
}

export interface SnapOptions {
  /** Отступ от края окна, на котором панель стоит прижатой */
  margin: number;
  /** Ближе этого к краю (px) — прилипает */
  threshold: number;
}

export type ResizeCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

/** Размер в своих границах и не больше окна за вычетом отступов */
export function clampSize(size: Size, min: Size, max: Size, viewport: Size, margin: number): Size {
  return {
    width: clamp(size.width, min.width, Math.min(max.width, viewport.width - margin * 2)),
    height: clamp(size.height, min.height, Math.min(max.height, viewport.height - margin * 2)),
  };
}

/** Точка, при которой панель целиком в окне с отступом `margin` */
export function clampPoint(point: Point, size: Size, viewport: Size, margin: number): Point {
  return {
    x: clamp(point.x, margin, viewport.width - size.width - margin),
    y: clamp(point.y, margin, viewport.height - size.height - margin),
  };
}

function snapAxis(
  position: number,
  length: number,
  extent: number,
  { margin, threshold }: SnapOptions,
): { value: number; anchor: AnchorEdge } {
  const end = extent - length - margin;

  if (position - margin <= threshold) return { value: margin, anchor: 'start' };
  if (end - position <= threshold) return { value: end, anchor: 'end' };

  return { value: position, anchor: null };
}

/**
 * Куда встанет отпущенная панель: у края ближе `threshold` — прижата к нему (две оси — угол), иначе там,
 * где отпустили, но в пределах окна
 */
export function snapPlacement(
  point: Point,
  size: Size,
  viewport: Size,
  options: SnapOptions,
): Placement {
  const inside = clampPoint(point, size, viewport, options.margin);
  const x = snapAxis(inside.x, size.width, viewport.width, options);
  const y = snapAxis(inside.y, size.height, viewport.height, options);

  return { x: x.value, y: y.value, anchorX: x.anchor, anchorY: y.anchor };
}

/**
 * Точка панели при данном окне: прижатая к краю — у края, свободная — на своей координате, но не за
 * окном. Вызывается на каждый resize окна и при смене размера панели
 */
export function resolvePlacement(
  placement: Placement,
  size: Size,
  viewport: Size,
  margin: number,
): Point {
  const x =
    placement.anchorX === 'start'
      ? margin
      : placement.anchorX === 'end'
        ? viewport.width - size.width - margin
        : placement.x;
  const y =
    placement.anchorY === 'start'
      ? margin
      : placement.anchorY === 'end'
        ? viewport.height - size.height - margin
        : placement.y;

  return clampPoint({ x, y }, size, viewport, margin);
}

/** Начальное место в углу: так голос по умолчанию встаёт справа внизу */
export function cornerPlacement(corner: ResizeCorner): Placement {
  return {
    x: 0,
    y: 0,
    anchorX: corner.endsWith('left') ? 'start' : 'end',
    anchorY: corner.startsWith('top') ? 'start' : 'end',
  };
}

/**
 * Новый прямоугольник при перетаскивании угла `corner` на (dx, dy) от прямоугольника `start`.
 * Противоположный угол стоит на месте; размер — в границах, и панель не выходит за окно.
 */
export function resizeFromCorner(
  start: Rect,
  corner: ResizeCorner,
  dx: number,
  dy: number,
  min: Size,
  max: Size,
  viewport: Size,
  margin: number,
): Rect {
  const left = corner.endsWith('left');
  const top = corner.startsWith('top');
  // Предел роста — до края окна со стороны тянущегося угла
  const room = {
    width: left ? start.x + start.width - margin : viewport.width - margin - start.x,
    height: top ? start.y + start.height - margin : viewport.height - margin - start.y,
  };
  const width = clamp(start.width + (left ? -dx : dx), min.width, Math.min(max.width, room.width));
  const height = clamp(
    start.height + (top ? -dy : dy),
    min.height,
    Math.min(max.height, room.height),
  );

  return {
    x: left ? start.x + start.width - width : start.x,
    y: top ? start.y + start.height - height : start.y,
    width,
    height,
  };
}

/** Стрелка с клавиатуры: шаг в сторону, панель остаётся в окне. Не стрелка — null */
export function moveByKey(
  point: Point,
  key: string,
  step: number,
  size: Size,
  viewport: Size,
  margin: number,
): Point | null {
  const delta: Record<string, Point> = {
    ArrowLeft: { x: -step, y: 0 },
    ArrowRight: { x: step, y: 0 },
    ArrowUp: { x: 0, y: -step },
    ArrowDown: { x: 0, y: step },
  };
  const move = delta[key];

  if (!move) return null;

  return clampPoint({ x: point.x + move.x, y: point.y + move.y }, size, viewport, margin);
}
