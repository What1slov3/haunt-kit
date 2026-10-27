export interface RingGeometry {
  /** Радиус средней линии обода: обводка ложится поровну внутрь и наружу, поэтому минус половина толщины */
  radius: number;
  circumference: number;
  /** stroke-dashoffset для доли `ratio`: 0 — полное кольцо, circumference — пусто */
  offset: number;
}

export function ringGeometry(size: number, thickness: number, ratio: number): RingGeometry {
  const radius = Math.max(0, (size - thickness) / 2);
  const circumference = 2 * Math.PI * radius;
  const clamped = Number.isNaN(ratio) ? 0 : Math.min(1, Math.max(0, ratio));

  return { radius, circumference, offset: circumference * (1 - clamped) };
}
