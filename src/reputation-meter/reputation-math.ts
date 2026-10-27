export interface MeterSpan {
  /** Начало и конец заливки в долях шкалы 0–1 */
  start: number;
  end: number;
  /** Где ноль на шкале (0–1); null — ноль вне шкалы, заливка от минимума */
  zero: number | null;
}

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

/**
 * Заливка шкалы репутации. Если ноль внутри шкалы (−100…100), заливка идёт от нуля в сторону значения:
 * минус читается как минус, а не как «почти пустая полоса». Иначе — от минимума.
 */
export function meterSpan(value: number, min: number, max: number): MeterSpan {
  const range = max - min;

  if (!(range > 0)) return { start: 0, end: 0, zero: null };

  const at = clamp01((value - min) / range);

  if (min < 0 && max > 0) {
    const zero = -min / range;

    return { start: Math.min(zero, at), end: Math.max(zero, at), zero };
  }

  return { start: 0, end: at, zero: null };
}

export interface ReputationTier {
  /** С этого значения начинается ступень */
  from: number;
  label: string;
}

export interface TierPosition {
  tier: ReputationTier | null;
  next: ReputationTier | null;
}

/** Текущая и следующая ступень; ступени — в любом порядке */
export function tierOf(value: number, tiers: readonly ReputationTier[]): TierPosition {
  const sorted = [...tiers].sort((a, b) => a.from - b.from);
  let tier: ReputationTier | null = null;

  for (const item of sorted) {
    if (item.from > value) return { tier, next: item };

    tier = item;
  }

  return { tier, next: null };
}

/** Изменение за историю: последнее значение минус первое; короче двух точек — 0 */
export function historyDelta(history: readonly number[]): number {
  if (history.length < 2) return 0;

  return history[history.length - 1]! - history[0]!;
}
