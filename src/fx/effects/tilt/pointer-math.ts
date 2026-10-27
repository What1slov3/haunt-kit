/*
 * Геометрия эффектов за курсором — чистые функции: наклон карточки (Tilt) и притяжение кнопки
 * (Magnetic). Прямоугольник — как getBoundingClientRect, координаты — клиентские.
 */

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TiltState {
  /** Поворот вокруг горизонтальной оси, градусы: курсор сверху — верх карточки «уходит» от зрителя */
  rotateX: number;
  rotateY: number;
  /** Положение блика, доли 0…1 */
  glareX: number;
  glareY: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Наклон за курсором: край под курсором уходит от зрителя, как под пальцем; за пределами — как на краю */
export function tiltAt(rect: RectLike, x: number, y: number, maxDeg: number): TiltState {
  const nx = rect.width ? clamp(((x - rect.left) / rect.width) * 2 - 1, -1, 1) : 0;
  const ny = rect.height ? clamp(((y - rect.top) / rect.height) * 2 - 1, -1, 1) : 0;

  return {
    rotateX: -ny * maxDeg,
    rotateY: nx * maxDeg,
    glareX: (nx + 1) / 2,
    glareY: (ny + 1) / 2,
  };
}

export interface MagneticOptions {
  /** Доля пути к курсору: 0.3 — кнопка проходит треть расстояния */
  strength: number;
  /** Наибольший сдвиг, px: «в меру», кнопка не убегает от своего места */
  max: number;
  /** Насколько за краем кнопки курсор ещё притягивает, px */
  reach: number;
}

/** Сдвиг кнопки к курсору; вне зоны притяжения — null (вернуться на место) */
export function magneticOffset(
  rect: RectLike,
  x: number,
  y: number,
  { strength, max, reach }: MagneticOptions,
): { x: number; y: number } | null {
  const inside =
    x >= rect.left - reach &&
    x <= rect.left + rect.width + reach &&
    y >= rect.top - reach &&
    y <= rect.top + rect.height + reach;

  if (!inside) return null;

  const dx = (x - (rect.left + rect.width / 2)) * strength;
  const dy = (y - (rect.top + rect.height / 2)) * strength;
  const length = Math.hypot(dx, dy);
  const scale = length > max ? max / length : 1;

  return { x: dx * scale, y: dy * scale };
}
