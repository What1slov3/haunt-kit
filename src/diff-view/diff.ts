/*
 * Разница двух последовательностей — алгоритм Майерса (O((N + M) · D), «An O(ND) Difference Algorithm»,
 * 1986): кратчайший сценарий правки, тот же, что у git diff по умолчанию. Общие начало и конец
 * отрезаются заранее — у правки сообщения они почти всё, и квадратичная часть работает на остатке.
 */

export type DiffType = 'equal' | 'insert' | 'delete';

export interface DiffOp<T> {
  type: DiffType;
  value: T;
  /** Индекс в старой последовательности; у вставки — null */
  oldIndex: number | null;
  /** Индекс в новой; у удаления — null */
  newIndex: number | null;
}

/** Больше правок — уже не правка, а замена: сценарий «всё удалить, всё вставить», без памяти O(D²) */
const MAX_EDITS = 4000;

function equalOp<T>(value: T, oldIndex: number, newIndex: number): DiffOp<T> {
  return { type: 'equal', value, oldIndex, newIndex };
}

export function diffSequences<T>(
  a: readonly T[],
  b: readonly T[],
  equals: (x: T, y: T) => boolean = Object.is,
): DiffOp<T>[] {
  let start = 0;

  while (start < a.length && start < b.length && equals(a[start]!, b[start]!)) start += 1;

  let endA = a.length;
  let endB = b.length;

  while (endA > start && endB > start && equals(a[endA - 1]!, b[endB - 1]!)) {
    endA -= 1;
    endB -= 1;
  }

  const head = Array.from({ length: start }, (_, index) => equalOp(a[index]!, index, index));
  const tail = Array.from({ length: a.length - endA }, (_, offset) =>
    equalOp(a[endA + offset]!, endA + offset, endB + offset),
  );
  const middle = myers(a.slice(start, endA), b.slice(start, endB), equals).map((op) => ({
    ...op,
    oldIndex: op.oldIndex === null ? null : op.oldIndex + start,
    newIndex: op.newIndex === null ? null : op.newIndex + start,
  }));

  return [...head, ...middle, ...tail];
}

function myers<T>(a: readonly T[], b: readonly T[], equals: (x: T, y: T) => boolean): DiffOp<T>[] {
  const n = a.length;
  const m = b.length;

  if (n === 0)
    return b.map((value, index) => ({ type: 'insert', value, oldIndex: null, newIndex: index }));
  if (m === 0)
    return a.map((value, index) => ({ type: 'delete', value, oldIndex: index, newIndex: null }));

  const max = Math.min(n + m, MAX_EDITS);
  const offset = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = [];
  let found = -1;

  outer: for (let d = 0; d <= max; d += 1) {
    trace.push(v.slice());

    for (let k = -d; k <= d; k += 2) {
      let x =
        k === -d || (k !== d && v[offset + k - 1]! < v[offset + k + 1]!)
          ? v[offset + k + 1]!
          : v[offset + k - 1]! + 1;
      let y = x - k;

      while (x < n && y < m && equals(a[x]!, b[y]!)) {
        x += 1;
        y += 1;
      }

      v[offset + k] = x;

      if (x >= n && y >= m) {
        found = d;
        break outer;
      }
    }
  }

  if (found < 0) {
    return [
      ...a.map((value, index): DiffOp<T> => ({
        type: 'delete',
        value,
        oldIndex: index,
        newIndex: null,
      })),
      ...b.map((value, index): DiffOp<T> => ({
        type: 'insert',
        value,
        oldIndex: null,
        newIndex: index,
      })),
    ];
  }

  // Обратный проход по сохранённым фронтам: от конца к началу, змейки — равные элементы
  const ops: DiffOp<T>[] = [];
  let x = n;
  let y = m;

  for (let d = found; d >= 0; d -= 1) {
    const front = trace[d]!;
    const k = x - y;
    const prevK =
      k === -d || (k !== d && front[offset + k - 1]! < front[offset + k + 1]!) ? k + 1 : k - 1;
    const prevX = d === 0 ? 0 : front[offset + prevK]!;
    const prevY = d === 0 ? 0 : prevX - prevK;

    while (x > prevX && y > prevY) {
      x -= 1;
      y -= 1;
      ops.push(equalOp(a[x]!, x, y));
    }

    if (d === 0) break;

    if (x === prevX) {
      y -= 1;
      ops.push({ type: 'insert', value: b[y]!, oldIndex: null, newIndex: y });
    } else {
      x -= 1;
      ops.push({ type: 'delete', value: a[x]!, oldIndex: x, newIndex: null });
    }
  }

  return ops.reverse();
}

/** Строки текста; завершающий перевод строки не даёт лишней пустой строки в конце */
export function splitLines(text: string): string[] {
  if (text === '') return [];

  const lines = text.split(/\r?\n/);

  if (lines.at(-1) === '') lines.pop();

  return lines;
}

export function diffLines(oldText: string, newText: string): DiffOp<string>[] {
  return diffSequences(splitLines(oldText), splitLines(newText));
}

/**
 * Слова, пробелы и знаки — отдельными токенами: правка «привет» → «Привет!» подсвечивает слово и знак,
 * а не всю строку. Буквы любого алфавита (\p{L}), цифры и подчёркивание — одно слово.
 */
export function tokenizeWords(text: string): string[] {
  return text.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) ?? [];
}

export interface DiffSegment {
  type: DiffType;
  text: string;
}

/** Разница по словам, склеенная в куски одного типа подряд */
export function diffWords(oldText: string, newText: string): DiffSegment[] {
  const segments: DiffSegment[] = [];

  for (const op of diffSequences(tokenizeWords(oldText), tokenizeWords(newText))) {
    const last = segments.at(-1);

    if (last && last.type === op.type) last.text += op.value;
    else segments.push({ type: op.type, text: op.value });
  }

  // Пробел между двумя правками — к правке: «~~старое~~ ++новое++», а не обрывки вокруг пробела
  return segments.reduce<DiffSegment[]>((out, segment, index) => {
    const previous = out.at(-1);
    const next = segments[index + 1];

    if (
      segment.type === 'equal' &&
      /^\s+$/.test(segment.text) &&
      previous &&
      previous.type !== 'equal' &&
      next &&
      next.type !== 'equal'
    ) {
      out.push({ type: 'delete', text: segment.text }, { type: 'insert', text: segment.text });

      return out;
    }

    const last = out.at(-1);

    if (last && last.type === segment.type) last.text += segment.text;
    else out.push({ ...segment });

    return out;
  }, []);
}

export interface DiffLine {
  kind: 'line';
  type: DiffType;
  text: string;
  /** Номера строк с единицы; у вставки нет старого, у удаления — нового */
  oldNumber: number | null;
  newNumber: number | null;
}

export interface DiffFold {
  kind: 'fold';
  /** Ключ свёртки — первый старый номер строки внутри */
  id: number;
  lines: DiffLine[];
}

export type DiffRow = DiffLine | DiffFold;

/**
 * Строки с номерами; длинные неизменённые участки сворачиваются, вокруг правок остаётся `context` строк.
 * Свёртка короче трёх строк не делается: кнопка «показать 1 строку» длиннее самой строки.
 */
export function buildRows(ops: readonly DiffOp<string>[], context = 3, collapse = true): DiffRow[] {
  const lines: DiffLine[] = ops.map((op) => ({
    kind: 'line',
    type: op.type,
    text: op.value,
    oldNumber: op.oldIndex === null ? null : op.oldIndex + 1,
    newNumber: op.newIndex === null ? null : op.newIndex + 1,
  }));

  if (!collapse) return lines;

  const rows: DiffRow[] = [];
  let index = 0;

  while (index < lines.length) {
    if (lines[index]!.type !== 'equal') {
      rows.push(lines[index]!);
      index += 1;
      continue;
    }

    let end = index;

    while (end < lines.length && lines[end]!.type === 'equal') end += 1;

    const keepBefore = index === 0 ? 0 : context;
    const keepAfter = end === lines.length ? 0 : context;
    const run = lines.slice(index, end);
    const hidden = run.length - keepBefore - keepAfter;

    if (hidden >= 3) {
      rows.push(...run.slice(0, keepBefore));
      rows.push({
        kind: 'fold',
        id: run[keepBefore]!.oldNumber!,
        lines: run.slice(keepBefore, run.length - keepAfter),
      });
      rows.push(...run.slice(run.length - keepAfter));
    } else {
      rows.push(...run);
    }

    index = end;
  }

  return rows;
}

export interface SplitRow {
  kind: 'split';
  left: DiffLine | null;
  right: DiffLine | null;
}

/**
 * Две колонки: равные строки — напротив себя, блок удалений — напротив блока вставок построчно, лишние —
 * напротив пустоты. Так замена строки читается в одной горизонтали.
 */
export function splitRows(rows: readonly DiffRow[]): (SplitRow | DiffFold)[] {
  const out: (SplitRow | DiffFold)[] = [];
  let index = 0;

  while (index < rows.length) {
    const row = rows[index]!;

    if (row.kind === 'fold') {
      out.push(row);
      index += 1;
      continue;
    }

    if (row.type === 'equal') {
      out.push({ kind: 'split', left: row, right: row });
      index += 1;
      continue;
    }

    const deletes: DiffLine[] = [];
    const inserts: DiffLine[] = [];

    while (index < rows.length) {
      const next = rows[index]!;

      if (next.kind !== 'line' || next.type === 'equal') break;
      if (next.type === 'insert') inserts.push(next);
      else if (inserts.length) break;
      else deletes.push(next);
      index += 1;
    }

    for (let line = 0; line < Math.max(deletes.length, inserts.length); line += 1) {
      out.push({ kind: 'split', left: deletes[line] ?? null, right: inserts[line] ?? null });
    }
  }

  return out;
}

/**
 * Пары «удалено — добавлено» внутри блока правки — для подсветки изменённых слов: i-я удалённая строка
 * сравнивается с i-й добавленной. Ключ — строка, значение — её куски.
 */
export function pairWordChanges(rows: readonly DiffRow[]): Map<DiffLine, DiffSegment[]> {
  const result = new Map<DiffLine, DiffSegment[]>();

  for (const row of splitRows(rows)) {
    if (row.kind !== 'split' || !row.left || !row.right || row.left === row.right) continue;

    const segments = diffWords(row.left.text, row.right.text);

    result.set(
      row.left,
      segments.filter((segment) => segment.type !== 'insert'),
    );
    result.set(
      row.right,
      segments.filter((segment) => segment.type !== 'delete'),
    );
  }

  return result;
}

/** Сколько строк добавлено и удалено — для шапки «+3 −1» */
export function diffStats(ops: readonly DiffOp<unknown>[]): { added: number; removed: number } {
  return ops.reduce(
    (stats, op) => ({
      added: stats.added + (op.type === 'insert' ? 1 : 0),
      removed: stats.removed + (op.type === 'delete' ? 1 : 0),
    }),
    { added: 0, removed: 0 },
  );
}
