import { describe, expect, it } from 'vitest';

import {
  boardCells,
  FLAP_DIGITS,
  FLAP_TIME,
  flapCell,
  flapFrame,
  flapPath,
  planFlaps,
} from './flap-queue';

const timing = { flipMs: 80, staggerMs: 40, maxFlips: 20 };

describe('flapPath', () => {
  it('идёт вперёд по барабану и кончается целью', () => {
    expect(flapPath('3', '6', FLAP_DIGITS)).toEqual(['4', '5', '6']);
  });

  it('назад — через начало барабана, как настоящее табло', () => {
    expect(flapPath('8', '1', FLAP_DIGITS)).toEqual(['9', ' ', '0', '1']);
  });

  it('тот же символ — ничего не перекидывается', () => {
    expect(flapPath('5', '5', FLAP_DIGITS)).toEqual([]);
  });

  it('символ вне барабана — одним шагом', () => {
    expect(flapPath('1', 'Ж', FLAP_DIGITS)).toEqual(['Ж']);
  });

  it('неизвестный исходный — от начала барабана', () => {
    expect(flapPath('Ж', '2', FLAP_DIGITS)).toEqual(['0', '1', '2']);
  });

  it('длинный путь обрезается до последних maxFlips шагов', () => {
    expect(flapPath('0', '9', FLAP_DIGITS, 3)).toEqual(['7', '8', '9']);
  });
});

describe('boardCells', () => {
  it('число выравнивается по правому краю', () => {
    expect(boardCells('42', 4)).toEqual([' ', ' ', '4', '2']);
  });

  it('код — по левому', () => {
    expect(boardCells('A7', 3, 'start')).toEqual(['A', '7', ' ']);
  });

  it('длиннее табло — обрезается', () => {
    expect(boardCells('12345', 3)).toEqual(['1', '2', '3']);
  });
});

describe('planFlaps', () => {
  it('ячейки стартуют по очереди, неизменные очередь не держат', () => {
    const plan = planFlaps([...'12:30'], [...'12:45'], FLAP_TIME, timing);

    expect(plan.cells.map((cell) => cell.path.length > 0)).toEqual([
      false,
      false,
      false,
      true,
      true,
    ]);
    expect(plan.cells[3]!.start).toBe(0);
    expect(plan.cells[4]!.start).toBe(40);
  });

  it('длительность — конец самой поздней ячейки', () => {
    const plan = planFlaps([...'00'], [...'19'], FLAP_DIGITS, timing);

    // Вторая ячейка: 0 → 9 — 9 шагов, старт через 40 мс
    expect(plan.duration).toBe(40 + 9 * 80);
  });

  it('новое значение длиннее — недостающие ячейки идут от пустого флажка', () => {
    const plan = planFlaps([...'9'], [...'10'], FLAP_DIGITS, timing);

    expect(plan.cells[1]).toEqual({ from: ' ', path: ['0'], start: 40 });
  });
});

describe('flapFrame + flapCell', () => {
  const plan = planFlaps([...'3'], [...'5'], FLAP_DIGITS, timing);
  const cell = plan.cells[0]!;

  it('шаги идут по flipMs и стоят на последнем', () => {
    expect(flapFrame(plan, 0)).toEqual([1]);
    expect(flapFrame(plan, 79)).toEqual([1]);
    expect(flapFrame(plan, 80)).toEqual([2]);
    expect(flapFrame(plan, 10_000)).toEqual([2]);
  });

  it('ещё не начавшая ячейка стоит на исходном символе', () => {
    const late = planFlaps([...'11'], [...'22'], FLAP_DIGITS, timing);

    expect(flapFrame(late, 10)).toEqual([1, 0]);
    expect(flapCell(late.cells[1]!, 0)).toEqual({ current: '1', next: null });
  });

  it('каждый шаг — с прошлого символа на следующий', () => {
    expect(flapCell(cell, 1)).toEqual({ current: '3', next: '4' });
    expect(flapCell(cell, 2)).toEqual({ current: '4', next: '5' });
  });
});
