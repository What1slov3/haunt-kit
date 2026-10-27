import { describe, expect, it } from 'vitest';

import { initialBudget, recordFrameCost, takeFrame, type BudgetState } from './frame-budget';

function run(costs: number[], budgetMs = 4): BudgetState {
  return costs.reduce((state, cost) => recordFrameCost(state, cost, { budgetMs }), initialBudget);
}

describe('recordFrameCost', () => {
  it('дешёвый кадр — без пропусков', () => {
    expect(run([1, 2, 1]).skip).toBe(0);
  });

  it('первый замер берётся как есть', () => {
    expect(run([12]).average).toBe(12);
  });

  it('стабильно втрое дороже бюджета — рисуется каждый третий кадр', () => {
    expect(run([12, 12, 12, 12]).skip).toBe(2);
  });

  it('разовый всплеск гаснет: после дешёвых кадров пропусков нет', () => {
    const afterSpike = run([1, 1, 40]);

    expect(afterSpike.skip).toBeGreaterThan(0);
    expect(run([1, 1, 40, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]).skip).toBe(0);
  });

  it('пропуск ограничен сверху: эффект не замирает совсем', () => {
    expect(run([500], 4).skip).toBe(7);
    expect(recordFrameCost(initialBudget, 500, { budgetMs: 4, maxSkip: 3 }).skip).toBe(3);
  });
});

describe('takeFrame', () => {
  it('пропускает ровно skip кадров, потом рисует', () => {
    let state: BudgetState = { average: 12, skip: 2, samples: 3 };
    const decisions: boolean[] = [];

    for (let i = 0; i < 3; i++) {
      const next = takeFrame(state);

      decisions.push(next.run);
      state = next.state;
    }

    expect(decisions).toEqual([false, false, true]);
  });
});
