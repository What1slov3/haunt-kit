/*
 * Геометрия просмотрщика: вписывание, масштаб к курсору, ограничение панорамы. Картинка стоит по центру
 * сцены в размере «вписано» и двигается только transform: `translate(x, y) scale(s)` с центром трансформации
 * в середине картинки. Все точки — в пикселях относительно центра сцены.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface View {
  scale: number;
  x: number;
  y: number;
}

export const IDENTITY: View = { scale: 1, x: 0, y: 0 };
export const MIN_SCALE = 1;
export const MAX_SCALE = 8;
/** Шаг кнопок и клавиш `+` / `-` */
export const ZOOM_STEP = 1.5;
/** Масштаб двойного клика */
export const DOUBLE_CLICK_SCALE = 2.5;

/** Вписать в сцену без увеличения: маленькая картинка показывается в своём размере, а не размытой */
export function fitSize(natural: Size, stage: Size): Size {
  if (natural.width <= 0 || natural.height <= 0 || stage.width <= 0 || stage.height <= 0) {
    return { width: 0, height: 0 };
  }

  const ratio = Math.min(stage.width / natural.width, stage.height / natural.height, 1);

  return { width: natural.width * ratio, height: natural.height * ratio };
}

export function clampScale(scale: number): number {
  return Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE);
}

/**
 * Сдвиг не открывает пустоту у края: по оси, где увеличенная картинка шире сцены, край картинки не заходит
 * внутрь сцены; где уже — картинка стоит по центру.
 */
export function clampOffset(view: View, image: Size, stage: Size): View {
  const limitX = Math.max(0, (image.width * view.scale - stage.width) / 2);
  const limitY = Math.max(0, (image.height * view.scale - stage.height) / 2);
  const clamp = (value: number, limit: number) =>
    limit === 0 ? 0 : Math.min(Math.max(value, -limit), limit);

  return { scale: view.scale, x: clamp(view.x, limitX), y: clamp(view.y, limitY) };
}

/**
 * Новый масштаб так, чтобы точка картинки под курсором осталась под курсором. Точка картинки
 * q = (p − t) / s, после масштаба p = t′ + s′·q, отсюда t′ = p − s′·(p − t) / s. Затем — ограничение панорамы.
 */
export function zoomAt(
  view: View,
  nextScale: number,
  point: Point,
  image: Size,
  stage: Size,
): View {
  const scale = clampScale(nextScale);

  if (scale === MIN_SCALE) return IDENTITY;

  const ratio = scale / view.scale;

  return clampOffset(
    { scale, x: point.x - (point.x - view.x) * ratio, y: point.y - (point.y - view.y) * ratio },
    image,
    stage,
  );
}

/** Сдвиг перетаскиванием от состояния на момент нажатия */
export function panBy(start: View, delta: Point, image: Size, stage: Size): View {
  return clampOffset(
    { scale: start.scale, x: start.x + delta.x, y: start.y + delta.y },
    image,
    stage,
  );
}

/**
 * Колесо → множитель масштаба. Экспонента: одинаковый поворот колеса даёт одинаковое относительное
 * изменение на любом масштабе. deltaMode 1 — строки (Firefox), 2 — страницы; переводим в пиксели.
 */
export function wheelFactor(deltaY: number, deltaMode = 0): number {
  const pixels = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 400 : deltaY;

  return Math.exp(-pixels * 0.002);
}

export function isZoomed(view: View): boolean {
  return view.scale !== 1 || view.x !== 0 || view.y !== 0;
}
