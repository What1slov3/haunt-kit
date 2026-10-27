/*
 * Контур Собеля: градиент яркости двумя ядрами 3×3 — по горизонтали и вертикали — и его длина. Ровные
 * места дают ноль, перепады — линию: фото превращается в «чертёж». Тот же расчёт делает шейдер `edge`.
 *
 *   Gx = | -1 0 1 |    Gy = | -1 -2 -1 |
 *        | -2 0 2 |         |  0  0  0 |
 *        | -1 0 1 |         |  1  2  1 |
 */

/** Длина градиента в каждой точке; за краем поле продолжается крайним значением */
export function sobel(field: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  const at = (x: number, y: number) =>
    field[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))]!;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tl = at(x - 1, y - 1);
      const t = at(x, y - 1);
      const tr = at(x + 1, y - 1);
      const l = at(x - 1, y);
      const r = at(x + 1, y);
      const bl = at(x - 1, y + 1);
      const b = at(x, y + 1);
      const br = at(x + 1, y + 1);
      const gx = tr + 2 * r + br - tl - 2 * l - bl;
      const gy = bl + 2 * b + br - tl - 2 * t - tr;

      out[y * width + x] = Math.hypot(gx, gy);
    }
  }

  return out;
}

/** Сила линии 0…1: перепад яркости 0.25 через пиксель (gx = 1) — уже полная линия */
export function edgeStrength(magnitude: number, gain = 1): number {
  return Math.min(1, magnitude * gain);
}
