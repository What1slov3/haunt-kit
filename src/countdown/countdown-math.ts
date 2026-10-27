export type CountdownUnit = 'days' | 'hours' | 'minutes' | 'seconds';

export const COUNTDOWN_UNITS: readonly CountdownUnit[] = ['days', 'hours', 'minutes', 'seconds'];

const UNIT_MS: Record<CountdownUnit, number> = {
  days: 86_400_000,
  hours: 3_600_000,
  minutes: 60_000,
  seconds: 1000,
};

export interface CountdownPart {
  unit: CountdownUnit;
  value: number;
}

export interface CountdownSplit {
  parts: CountdownPart[];
  /** Время вышло: событие началось */
  done: boolean;
}

export interface SplitOptions {
  /** Какие единицы показывать; старшая вбирает остаток (без дней 50 часов — это 50 ч) */
  units?: readonly CountdownUnit[];
  /** Убрать ведущие нули (`0 дн`), но оставить не меньше `minParts` единиц */
  trim?: boolean;
  minParts?: number;
}

const ordered = (units: readonly CountdownUnit[]) =>
  COUNTDOWN_UNITS.filter((unit) => units.includes(unit));

/**
 * Оставшееся время по единицам. Округление вверх до младшей единицы: «1 с» видно до последнего мгновения,
 * а ноль наступает ровно в момент события, не на секунду раньше.
 */
export function splitDuration(ms: number, options: SplitOptions = {}): CountdownSplit {
  const units = ordered(options.units ?? COUNTDOWN_UNITS);
  const smallest = units.at(-1) ?? 'seconds';
  const step = UNIT_MS[smallest];
  const remaining = Number.isFinite(ms) && ms > 0 ? Math.ceil(ms / step) * step : 0;
  let rest = remaining;

  let parts = units.map((unit) => {
    const value = Math.floor(rest / UNIT_MS[unit]);

    rest -= value * UNIT_MS[unit];

    return { unit, value };
  });

  if (options.trim) {
    const keep = Math.max(1, options.minParts ?? 2);

    while (parts.length > keep && parts[0]?.value === 0) parts = parts.slice(1);
  }

  return { parts, done: remaining === 0 };
}

/**
 * Через сколько мс сменится показ: при округлении вверх число меняется, когда остаток пересекает кратное
 * младшей единице. Таймер ставится ровно на этот момент, а не раз в секунду наугад.
 */
export function nextTick(ms: number, units: readonly CountdownUnit[] = COUNTDOWN_UNITS): number {
  const step = UNIT_MS[ordered(units).at(-1) ?? 'seconds'];

  if (!(ms > 0)) return step;

  return ms % step || step;
}

/** Цифры единицы: старшая — как есть, остальные — две цифры («2 · 03 · 07») */
export function padPart(part: CountdownPart, leading: boolean): string {
  return leading ? String(part.value) : String(part.value).padStart(2, '0');
}
