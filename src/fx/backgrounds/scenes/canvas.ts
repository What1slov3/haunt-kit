import type { Rgb } from '../scene';

/*
 * Общее для сцен Canvas 2D: размер холста с учётом плотности пикселей и строка цвета из байтов.
 */

export function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Фон: Canvas 2D недоступен');

  return ctx;
}

/** Буфер холста под CSS-размер × `scale`; рисование дальше — в CSS px */
export function fitCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
): void {
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

export function rgba(color: Rgb, alpha: number): string {
  return `rgb(${color[0]} ${color[1]} ${color[2]} / ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Число корзин прозрачности: отрезки одной корзины — одним stroke(), а не по вызову на отрезок */
export const ALPHA_BUCKETS = 6;

export function bucketOf(alpha: number): number {
  return Math.max(0, Math.min(ALPHA_BUCKETS - 1, Math.floor(alpha * ALPHA_BUCKETS)));
}
