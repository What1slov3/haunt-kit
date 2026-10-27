import { describe, expect, it } from 'vitest';

import {
  buildRows,
  diffLines,
  diffSequences,
  diffStats,
  diffWords,
  pairWordChanges,
  splitLines,
  splitRows,
  tokenizeWords,
  type DiffOp,
} from './diff';

const compact = (ops: DiffOp<string>[]) =>
  ops
    .map((op) => `${op.type === 'equal' ? ' ' : op.type === 'insert' ? '+' : '-'}${op.value}`)
    .join('');

/** Применяет сценарий к старой последовательности — должна получиться новая */
const apply = (ops: DiffOp<string>[]) =>
  ops.filter((op) => op.type !== 'delete').map((op) => op.value);
const source = (ops: DiffOp<string>[]) =>
  ops.filter((op) => op.type !== 'insert').map((op) => op.value);

describe('diffSequences (Майерс)', () => {
  it('классический пример из статьи: ABCABBA → CBABAC за 5 правок', () => {
    const a = [...'ABCABBA'];
    const b = [...'CBABAC'];
    const ops = diffSequences(a, b);

    expect(apply(ops)).toEqual(b);
    expect(source(ops)).toEqual(a);
    expect(ops.filter((op) => op.type !== 'equal')).toHaveLength(5);
  });

  it('пустые и одинаковые', () => {
    expect(diffSequences([], [])).toEqual([]);
    expect(compact(diffSequences([], ['a']))).toBe('+a');
    expect(compact(diffSequences(['a'], []))).toBe('-a');
    expect(compact(diffSequences(['a', 'b'], ['a', 'b']))).toBe(' a b');
  });

  it('индексы обеих сторон сохраняются через общие начало и конец', () => {
    const ops = diffSequences(['x', 'a', 'y'], ['x', 'b', 'y']);

    expect(ops).toEqual([
      { type: 'equal', value: 'x', oldIndex: 0, newIndex: 0 },
      { type: 'delete', value: 'a', oldIndex: 1, newIndex: null },
      { type: 'insert', value: 'b', oldIndex: null, newIndex: 1 },
      { type: 'equal', value: 'y', oldIndex: 2, newIndex: 2 },
    ]);
  });

  it('случайные последовательности восстанавливаются', () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;

      return seed / 2 ** 31;
    };

    for (let run = 0; run < 50; run += 1) {
      const a = Array.from(
        { length: Math.floor(random() * 20) },
        () => 'abc'[Math.floor(random() * 3)]!,
      );
      const b = Array.from(
        { length: Math.floor(random() * 20) },
        () => 'abc'[Math.floor(random() * 3)]!,
      );
      const ops = diffSequences(a, b);

      expect(apply(ops)).toEqual(b);
      expect(source(ops)).toEqual(a);
    }
  });
});

describe('строки и слова', () => {
  it('завершающий перевод строки не даёт пустой строки', () => {
    expect(splitLines('a\nb\n')).toEqual(['a', 'b']);
    expect(splitLines('')).toEqual([]);
    expect(diffStats(diffLines('a\nb\n', 'a\nc\nd\n'))).toEqual({ added: 2, removed: 1 });
  });

  it('слова любого алфавита, пробелы и знаки — отдельно', () => {
    expect(tokenizeWords('Привет, мир!')).toEqual(['Привет', ',', ' ', 'мир', '!']);
  });

  it('разница по словам склеена кусками', () => {
    expect(diffWords('встреча в пятницу', 'встреча в субботу!')).toEqual([
      { type: 'equal', text: 'встреча в ' },
      { type: 'delete', text: 'пятницу' },
      { type: 'insert', text: 'субботу!' },
    ]);
  });
});

describe('buildRows', () => {
  const old = Array.from({ length: 20 }, (_, index) => `line ${index + 1}`).join('\n');
  const next = old.replace('line 10', 'line ten');

  it('длинные неизменённые участки сворачиваются, контекст остаётся', () => {
    const rows = buildRows(diffLines(old, next), 2);
    const folds = rows.filter((row) => row.kind === 'fold');

    expect(folds).toHaveLength(2);
    expect(folds[0]).toMatchObject({ id: 1 });
    expect(folds[0]!.kind === 'fold' && folds[0]!.lines).toHaveLength(7);
    expect(rows.filter((row) => row.kind === 'line')).toHaveLength(6);
  });

  it('номера строк по сторонам', () => {
    const rows = buildRows(diffLines('a\nb', 'a\nx\nb'), 3, false);

    expect(rows).toEqual([
      { kind: 'line', type: 'equal', text: 'a', oldNumber: 1, newNumber: 1 },
      { kind: 'line', type: 'insert', text: 'x', oldNumber: null, newNumber: 2 },
      { kind: 'line', type: 'equal', text: 'b', oldNumber: 2, newNumber: 3 },
    ]);
  });

  it('короткий участок не сворачивается', () => {
    expect(
      buildRows(diffLines('a\nb\nc\nd', 'a\nb\nc\nx'), 2).every((row) => row.kind === 'line'),
    ).toBe(true);
  });
});

describe('splitRows и пары слов', () => {
  it('удаления напротив вставок, лишнее — напротив пустоты', () => {
    const rows = buildRows(diffLines('a\nb\nc\nd', 'a\nB\nd'), 3, false);
    const split = splitRows(rows);

    expect(
      split.map((row) => row.kind === 'split' && [row.left?.text ?? null, row.right?.text ?? null]),
    ).toEqual([
      ['a', 'a'],
      ['b', 'B'],
      ['c', null],
      ['d', 'd'],
    ]);
  });

  it('изменённые слова внутри пары', () => {
    const rows = buildRows(diffLines('hello world', 'hello there'), 3, false);
    const pairs = pairWordChanges(rows);
    const removed = rows.find((row) => row.kind === 'line' && row.type === 'delete')!;

    expect(pairs.get(removed as never)).toEqual([
      { type: 'equal', text: 'hello ' },
      { type: 'delete', text: 'world' },
    ]);
  });
});
