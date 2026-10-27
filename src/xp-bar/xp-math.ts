export interface XpProgress {
  level: number;
  /** Опыт внутри текущего уровня */
  xp: number;
  /** Сколько нужно на следующий уровень; 0 — уровень последний */
  xpToNext: number;
}

/** Доля полосы 0–1; на последнем уровне (`xpToNext` 0) — полная */
export function xpRatio(xp: number, xpToNext: number): number {
  if (!(xpToNext > 0)) return 1;

  return Math.min(Math.max(xp / xpToNext, 0), 1);
}

export interface LevelOptions {
  /** С какого уровня начинается счёт */
  startLevel?: number;
  /** Последний уровень: дальше опыт не копится в уровень */
  maxLevel?: number;
}

// Защита от кривой без роста: требование 0 на каждом уровне иначе крутило бы цикл бесконечно
const LEVEL_GUARD = 10_000;

/**
 * Уровень по сумме опыта. `requirement(level)` — сколько опыта нужно, чтобы с `level` перейти на следующий:
 * кривую задаёт приложение (линейная, квадратичная, таблица), полоса о ней не знает.
 */
export function levelFromTotal(
  total: number,
  requirement: (level: number) => number,
  { startLevel = 1, maxLevel = Infinity }: LevelOptions = {},
): XpProgress {
  let level = startLevel;
  let rest = Math.max(0, total);

  for (let step = 0; step < LEVEL_GUARD && level < maxLevel; step++) {
    const need = requirement(level);

    if (!(need > 0) || rest < need) return { level, xp: rest, xpToNext: Math.max(0, need) };

    rest -= need;
    level += 1;
  }

  return { level, xp: rest, xpToNext: 0 };
}
