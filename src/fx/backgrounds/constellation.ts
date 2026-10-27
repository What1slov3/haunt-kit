/*
 * Созвездие — ядро фона `constellation`. Точки медленно дрейфуют и переходят через край; линии
 * появляются только у курсора: соединяются пары точек, обе из которых близко к нему, и чем ближе —
 * тем ярче. Без курсора фон — просто редкие точки, ничего не мельтешит.
 */

/** x, y, vx, vy — px и px/с */
export const STRIDE = 4;

export function seedPoints(
  count: number,
  width: number,
  height: number,
  rand: () => number,
): Float32Array {
  const points = new Float32Array(count * STRIDE);

  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    const speed = 2 + rand() * 5;

    points[i * STRIDE] = rand() * width;
    points[i * STRIDE + 1] = rand() * height;
    points[i * STRIDE + 2] = Math.cos(angle) * speed;
    points[i * STRIDE + 3] = Math.sin(angle) * speed;
  }

  return points;
}

/** Дрейф на dt секунд с переходом через край — плотность по полю постоянна */
export function driftPoints(points: Float32Array, width: number, height: number, dt: number): void {
  for (let o = 0; o < points.length; o += STRIDE) {
    let x = points[o]! + points[o + 2]! * dt;
    let y = points[o + 1]! + points[o + 3]! * dt;

    if (x < 0) x += width;
    if (x > width) x -= width;
    if (y < 0) y += height;
    if (y > height) y -= height;

    points[o] = x;
    points[o + 1] = y;
  }
}

export interface Link {
  a: number;
  b: number;
  /** 0…1: насколько близко к курсору и друг к другу */
  strength: number;
}

/**
 * Связи у курсора: точки в радиусе `reach` от него соединяются, если между ними не дальше `span`.
 * Перебор пар — только среди близких к курсору (их десяток-два), а не O(n²) по всему полю.
 */
export function linksNear(
  points: Float32Array,
  cx: number,
  cy: number,
  reach: number,
  span: number,
): Link[] {
  const near: { index: number; closeness: number }[] = [];

  for (let o = 0, i = 0; o < points.length; o += STRIDE, i++) {
    const distance = Math.hypot(points[o]! - cx, points[o + 1]! - cy);

    if (distance < reach) near.push({ index: i, closeness: 1 - distance / reach });
  }

  const links: Link[] = [];

  for (let i = 0; i < near.length; i++) {
    for (let j = i + 1; j < near.length; j++) {
      const a = near[i]!;
      const b = near[j]!;
      const between = Math.hypot(
        points[a.index * STRIDE]! - points[b.index * STRIDE]!,
        points[a.index * STRIDE + 1]! - points[b.index * STRIDE + 1]!,
      );

      if (between >= span) continue;

      links.push({
        a: a.index,
        b: b.index,
        strength: Math.min(a.closeness, b.closeness) * (1 - between / span),
      });
    }
  }

  return links;
}
