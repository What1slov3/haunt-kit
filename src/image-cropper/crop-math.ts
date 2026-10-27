/*
 * Геометрия обрезки. Состояние не зависит от размера на экране: `scale` — множитель над «покрытием»
 * (1 — картинка ровно закрывает маску по короткой стороне), `x` / `y` — центр видимой области в долях ширины
 * и высоты картинки. Так одно и то же `Crop` даёт тот же кадр в окне 240 px и при экспорте в 1024 px.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Crop {
  /** Центр кадра по горизонтали, доля ширины картинки 0…1 */
  x: number;
  /** Центр кадра по вертикали, доля высоты картинки 0…1 */
  y: number;
  /** Масштаб над покрытием маски: 1 — картинка ровно закрывает маску */
  scale: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const CENTERED: Crop = { x: 0.5, y: 0.5, scale: 1 };
export const DEFAULT_MAX_SCALE = 4;
/** Шаг кнопок и клавиш `+` / `-` */
export const ZOOM_STEP = 1.25;

const valid = (size: Size) => size.width > 0 && size.height > 0;

/**
 * Доля картинки, которую видно в маске по каждой оси. При scale 1 короткая (относительно маски) сторона
 * видна целиком, длинная — частью; увеличение делит обе.
 */
export function visibleFraction(image: Size, aspect: number, scale: number): Size {
  if (!valid(image) || aspect <= 0 || scale <= 0) return { width: 1, height: 1 };

  const relative = (aspect * image.height) / image.width;

  return { width: Math.min(1, relative) / scale, height: Math.min(1, 1 / relative) / scale };
}

export function clampScale(scale: number, maxScale = DEFAULT_MAX_SCALE): number {
  if (!Number.isFinite(scale)) return 1;

  return Math.min(Math.max(scale, 1), Math.max(1, maxScale));
}

/** Картинка всегда закрывает маску: масштаб не меньше покрытия, центр не подпускает край картинки внутрь */
export function clampCrop(
  crop: Crop,
  image: Size,
  aspect: number,
  maxScale = DEFAULT_MAX_SCALE,
): Crop {
  const scale = clampScale(crop.scale, maxScale);
  const visible = visibleFraction(image, aspect, scale);
  const clamp = (value: number, half: number) =>
    Number.isFinite(value) ? Math.min(Math.max(value, half), 1 - half) : 0.5;

  return { scale, x: clamp(crop.x, visible.width / 2), y: clamp(crop.y, visible.height / 2) };
}

/** Экранных пикселей на пиксель картинки при этом масштабе и размере маски */
export function pixelRatio(image: Size, mask: Size, scale: number): number {
  if (!valid(image) || !valid(mask)) return 0;

  return Math.max(mask.width / image.width, mask.height / image.height) * scale;
}

/**
 * Сдвиг перетаскиванием от кадра на момент нажатия. Картинка едет за указателем — центр кадра в
 * обратную сторону.
 */
export function panCrop(
  start: Crop,
  delta: Point,
  image: Size,
  mask: Size,
  maxScale = DEFAULT_MAX_SCALE,
): Crop {
  const ratio = pixelRatio(image, mask, start.scale);

  if (ratio === 0) return start;

  return clampCrop(
    {
      scale: start.scale,
      x: start.x - delta.x / (ratio * image.width),
      y: start.y - delta.y / (ratio * image.height),
    },
    image,
    mask.width / mask.height,
    maxScale,
  );
}

/**
 * Новый масштаб так, чтобы точка картинки под курсором осталась под ним. `focus` — от центра маски в экранных
 * пикселях; точка картинки там — центр + focus / k, после масштаба центр′ = точка − focus / k′.
 */
export function zoomCrop(
  crop: Crop,
  nextScale: number,
  focus: Point,
  image: Size,
  mask: Size,
  maxScale = DEFAULT_MAX_SCALE,
): Crop {
  const scale = clampScale(nextScale, maxScale);
  const before = pixelRatio(image, mask, crop.scale);
  const after = pixelRatio(image, mask, scale);

  if (before === 0 || after === 0) return { ...crop, scale };

  const shift = 1 / before - 1 / after;

  return clampCrop(
    {
      scale,
      x: crop.x + (focus.x * shift) / image.width,
      y: crop.y + (focus.y * shift) / image.height,
    },
    image,
    mask.width / mask.height,
    maxScale,
  );
}

/**
 * Вид в окне: картинка в размере покрытия (`width` × `height`), левый верхний угол — в центре маски, затем
 * `translate(x, y) scale(scale)` с началом трансформации в углу. Движется только transform.
 */
export function cropTransform(crop: Crop, image: Size, mask: Size) {
  const cover = pixelRatio(image, mask, 1);
  const ratio = cover * crop.scale;

  return {
    width: image.width * cover,
    height: image.height * cover,
    x: -crop.x * image.width * ratio,
    y: -crop.y * image.height * ratio,
    scale: crop.scale,
  };
}

/** Область исходной картинки в её пикселях — то, что уйдёт в экспорт */
export function cropRegion(crop: Crop, image: Size, aspect: number): Rect {
  const visible = visibleFraction(image, aspect, crop.scale);
  const width = visible.width * image.width;
  const height = visible.height * image.height;

  return {
    x: crop.x * image.width - width / 2,
    y: crop.y * image.height - height / 2,
    width,
    height,
  };
}

/** Размер результата: `size` — ширина, высота — по соотношению маски, не меньше пикселя */
export function exportSize(size: number, aspect: number): Size {
  const width = Math.max(1, Math.round(size));

  return { width, height: Math.max(1, Math.round(width / (aspect > 0 ? aspect : 1))) };
}

export function sameCrop(a: Crop, b: Crop): boolean {
  return a.x === b.x && a.y === b.y && a.scale === b.scale;
}
