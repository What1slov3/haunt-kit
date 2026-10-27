/*
 * Геометрия и клавиатура палитры: квадрат насыщенность × яркость и полоса оттенка. Чистые функции —
 * компонент только переводит указатель и клавиши в них.
 */

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface SatValue {
  s: number;
  v: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Точка в квадрате: вправо — насыщеннее, вверх — ярче. За краем — край, а не потеря цвета */
export function areaFromPoint(x: number, y: number, box: Box): SatValue {
  return {
    s: box.width > 0 ? clamp((x - box.left) / box.width, 0, 1) : 0,
    v: box.height > 0 ? 1 - clamp((y - box.top) / box.height, 0, 1) : 0,
  };
}

/** Точка на полосе в оттенок 0–359: 360 — тот же красный, что 0, и ручка не должна туда прыгать */
export function hueFromPoint(x: number, box: Box): number {
  return box.width > 0 ? clamp(((x - box.left) / box.width) * 360, 0, 359) : 0;
}

/** Шаг стрелок — 1 %, с Shift и PageUp / PageDown — 10 % */
const STEP = 0.01;
const BIG_STEP = 0.1;

/**
 * Клавиши квадрата по образцу двумерного слайдера: ← → — насыщенность, ↑ ↓ — яркость, PageUp / PageDown —
 * яркость крупно, Home / End — насыщенность к краю. null — клавиша не наша.
 */
export function nudgeArea({ s, v }: SatValue, key: string, shift: boolean): SatValue | null {
  const step = shift ? BIG_STEP : STEP;
  const moves: Record<string, SatValue> = {
    ArrowLeft: { s: s - step, v },
    ArrowRight: { s: s + step, v },
    ArrowDown: { s, v: v - step },
    ArrowUp: { s, v: v + step },
    PageDown: { s, v: v - BIG_STEP },
    PageUp: { s, v: v + BIG_STEP },
    Home: { s: 0, v },
    End: { s: 1, v },
  };
  const next = moves[key];

  return next ? { s: clamp(next.s, 0, 1), v: clamp(next.v, 0, 1) } : null;
}

/** Клавиши полосы оттенка: стрелки — на 1°, с Shift и PageUp / PageDown — на 10°, Home / End — к краям */
export function nudgeHue(h: number, key: string, shift: boolean): number | null {
  const step = shift ? 10 : 1;
  const moves: Record<string, number> = {
    ArrowLeft: h - step,
    ArrowDown: h - step,
    ArrowRight: h + step,
    ArrowUp: h + step,
    PageDown: h - 10,
    PageUp: h + 10,
    Home: 0,
    End: 359,
  };
  const next = moves[key];

  return next === undefined ? null : clamp(next, 0, 359);
}
