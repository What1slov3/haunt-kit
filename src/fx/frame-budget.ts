/*
 * Бюджет кадра эффекта — чистые функции, без DOM и часов. Планировщик меряет, сколько занял кадр
 * эффекта, и по скользящему среднему решает, сколько следующих кадров пропустить: дорогой эффект
 * (фильтр видео на CPU, большой холст) рисуется реже, но не отнимает кадр у прокрутки и ввода.
 */

export interface BudgetState {
  /** Скользящее среднее стоимости кадра, мс */
  average: number;
  /** Сколько следующих кадров пропустить */
  skip: number;
  /** Сколько кадров измерено: первый замер берётся как есть, без сглаживания с нулём */
  samples: number;
}

export interface BudgetOptions {
  /** Доля кадра на этот эффект, мс */
  budgetMs: number;
  /** Вес нового замера в среднем: 0.25 — разовый всплеск (сборка мусора) гаснет за несколько кадров */
  smoothing?: number;
  /** Не реже чем раз в maxSkip + 1 кадров: эффект не должен «замереть» совсем */
  maxSkip?: number;
}

export const initialBudget: BudgetState = { average: 0, skip: 0, samples: 0 };

const DEFAULT_SMOOTHING = 0.25;
const DEFAULT_MAX_SKIP = 7;

/**
 * Учесть стоимость выполненного кадра. Если среднее выше бюджета, эффект пропускает столько кадров,
 * чтобы в среднем на кадр экрана приходилось не больше бюджета: среднее 3× бюджета — рисуем каждый
 * третий кадр (пропуск 2).
 */
export function recordFrameCost(
  state: BudgetState,
  cost: number,
  options: BudgetOptions,
): BudgetState {
  const smoothing = options.smoothing ?? DEFAULT_SMOOTHING;
  const maxSkip = options.maxSkip ?? DEFAULT_MAX_SKIP;
  const average = state.samples === 0 ? cost : state.average + (cost - state.average) * smoothing;
  const ratio = average / Math.max(options.budgetMs, 0.01);
  const skip = ratio > 1 ? Math.min(maxSkip, Math.ceil(ratio) - 1) : 0;

  return { average, skip, samples: state.samples + 1 };
}

/** Решение на кадр: рисовать или пропустить (и уменьшить счётчик пропусков) */
export function takeFrame(state: BudgetState): { run: boolean; state: BudgetState } {
  if (state.skip > 0) return { run: false, state: { ...state, skip: state.skip - 1 } };

  return { run: true, state };
}
