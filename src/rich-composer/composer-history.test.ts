import { describe, expect, it } from 'vitest';

import {
  emptyHistory,
  HISTORY_LIMIT,
  MERGE_WINDOW_MS,
  recordEdit,
  redoHistory,
  undoHistory,
  type ComposerHistoryEntry,
} from './composer-history';
import { caretAt } from './composer-model';

const entry = (value: string): ComposerHistoryEntry => ({
  doc: value ? [{ type: 'text', text: value }] : [],
  selection: caretAt(value.length),
});

describe('recordEdit', () => {
  it('набор подряд — один шаг', () => {
    let history = recordEdit(emptyHistory, entry(''), { kind: 'insert', text: 'п' }, 0);

    history = recordEdit(history, entry('п'), { kind: 'insert', text: 'р' }, 100);

    expect(history.past).toEqual([entry('')]);
  });

  it('пробел закрывает шаг', () => {
    let history = recordEdit(emptyHistory, entry(''), { kind: 'insert', text: 'а' }, 0);

    history = recordEdit(history, entry('а'), { kind: 'insert', text: ' ' }, 50);
    history = recordEdit(history, entry('а '), { kind: 'insert', text: 'б' }, 100);

    expect(history.past).toEqual([entry(''), entry('а ')]);
  });

  it('пауза и смена вида правки — новый шаг', () => {
    let history = recordEdit(emptyHistory, entry(''), { kind: 'insert', text: 'а' }, 0);

    history = recordEdit(history, entry('а'), { kind: 'insert', text: 'б' }, MERGE_WINDOW_MS + 1);
    history = recordEdit(history, entry('аб'), { kind: 'delete' }, MERGE_WINDOW_MS + 2);

    expect(history.past).toHaveLength(3);
  });

  it('токен и вставка — всегда отдельный шаг', () => {
    let history = recordEdit(emptyHistory, entry(''), { kind: 'other' }, 0);

    history = recordEdit(history, entry('x'), { kind: 'other' }, 1);

    expect(history.past).toHaveLength(2);
  });

  it('новая правка стирает будущее', () => {
    const recorded = recordEdit(emptyHistory, entry(''), { kind: 'other' }, 0);
    const undone = undoHistory(recorded, entry('a'))!;
    const next = recordEdit(undone.history, entry(''), { kind: 'other' }, 10);

    expect(next.future).toEqual([]);
  });

  it('длина истории ограничена', () => {
    let history = emptyHistory;

    for (let index = 0; index < HISTORY_LIMIT + 10; index++) {
      history = recordEdit(history, entry(String(index)), { kind: 'other' }, index);
    }

    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.past[0]).toEqual(entry('10'));
  });
});

describe('undo / redo', () => {
  it('отмена возвращает прошлое, повтор — то, что отменили', () => {
    const history = recordEdit(emptyHistory, entry('а'), { kind: 'other' }, 0);
    const undone = undoHistory(history, entry('аб'))!;

    expect(undone.entry).toEqual(entry('а'));

    const redone = redoHistory(undone.history, undone.entry)!;

    expect(redone.entry).toEqual(entry('аб'));
    expect(redone.history.past).toEqual([entry('а')]);
  });

  it('пустая история — null', () => {
    expect(undoHistory(emptyHistory, entry(''))).toBeNull();
    expect(redoHistory(emptyHistory, entry(''))).toBeNull();
  });
});
