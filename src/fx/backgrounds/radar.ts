/*
 * Радар — ядро фона `radar`. Луч обходит круг за `period`; за лучом тянется затухающий след; метки
 * вспыхивают, когда луч проходит через них, и гаснут до следующего оборота. Углы — радианы, 0 —
 * направо, по часовой (как ось y canvas вниз).
 */

const TAU = Math.PI * 2;

/** Угол луча в момент `time` (с), оборот за `period` секунд */
export function sweepAngle(time: number, period: number): number {
  return ((((time / period) % 1) + 1) % 1) * TAU;
}

/** На сколько радиан угол `angle` отстаёт от луча: 0 — луч прямо на нём, почти TAU — луч вот-вот придёт */
export function lagBehind(sweep: number, angle: number): number {
  return (((sweep - angle) % TAU) + TAU) % TAU;
}

/**
 * Яркость метки 0…1: вспышка, когда луч на ней, и экспоненциальное затухание за `decay` долей
 * оборота. После полного оборота метка почти не видна — вспыхнет снова.
 */
export function blipIntensity(sweep: number, angle: number, decay = 0.6): number {
  const lag = lagBehind(sweep, angle) / TAU;

  return Math.exp(-lag / (decay / 4));
}

export interface Blip {
  angle: number;
  /** Доля радиуса 0…1 */
  radius: number;
  /** Время появления (с) — внешние метки от шины живут ограниченно */
  bornAt: number;
  /** Сколько живёт, с; Infinity — постоянная */
  ttl: number;
}

/** Постоянные метки по seed: немного, вразброс по кольцам */
export function seedBlips(count: number, rand: () => number): Blip[] {
  return Array.from({ length: count }, () => ({
    angle: rand() * TAU,
    radius: 0.2 + rand() * 0.75,
    bornAt: 0,
    ttl: Infinity,
  }));
}

/** Метка из точки экрана относительно центра радара; null — вне круга */
export function blipFromPoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  radius: number,
  now: number,
  ttl = 6,
): Blip | null {
  const distance = Math.hypot(x - cx, y - cy);

  if (distance > radius || radius <= 0) return null;

  return {
    angle: (Math.atan2(y - cy, x - cx) + TAU) % TAU,
    radius: distance / radius,
    bornAt: now,
    ttl,
  };
}
