import type { FlatNode, TreeNodeData } from '../tree/tree-model';

/*
 * Модель инспектора значения: плоский список видимых строк (как у Tree — та же клавиатура), путь
 * `$.a[0]["ключ с пробелом"]`, свёртка больших массивов кусками и поиск по ключам. Значение не копируется
 * и не обходится целиком: строки строятся только для раскрытых веток.
 */

export type JsonKind =
  'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'other';

export type PathSegment = string | number;

export interface JsonRow extends FlatNode {
  path: PathSegment[];
  /** Ключ или индекс; у куска массива — null, у него `chunk` */
  key: PathSegment | null;
  /** Кусок большого массива: индексы с и по включительно */
  chunk: readonly [number, number] | null;
  value: unknown;
  kind: JsonKind;
  /** Ключей у объекта, элементов у массива */
  size: number;
}

/** Массив длиннее — по кускам этой длины, как в DevTools: тысяча строк сразу не нужна никому */
export const DEFAULT_CHUNK = 100;

export function kindOf(value: unknown): JsonKind {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';

  switch (typeof value) {
    case 'object':
      return 'object';
    case 'string':
      return 'string';
    case 'number':
    case 'bigint':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'undefined':
      return 'undefined';
    default:
      return 'other';
  }
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** Путь в записи JSONPath: `$.users[0].name`, неудобный ключ — в кавычках `$["my key"]` */
export function jsonPath(path: readonly PathSegment[]): string {
  return path.reduce<string>(
    (out, segment) =>
      typeof segment === 'number'
        ? `${out}[${segment}]`
        : IDENTIFIER.test(segment)
          ? `${out}.${segment}`
          : `${out}[${JSON.stringify(segment)}]`,
    '$',
  );
}

function chunkId(parentId: string, from: number): string {
  return `${parentId}#${from}`;
}

function childEntries(value: unknown): [PathSegment, unknown][] {
  if (Array.isArray(value)) return value.map((item, index) => [index, item]);
  if (value && typeof value === 'object') return Object.entries(value);

  return [];
}

function sizeOf(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === 'object') return Object.keys(value).length;

  return 0;
}

interface FlattenOptions {
  chunkSize?: number;
}

/**
 * Видимые строки. Корень-объект и корень-массив не рисуются отдельной строкой: сразу его ключи, как
 * раскрытый объект в консоли. Корень-примитив — одна строка без ключа.
 */
export function flattenJson(
  value: unknown,
  expanded: ReadonlySet<string>,
  { chunkSize = DEFAULT_CHUNK }: FlattenOptions = {},
): JsonRow[] {
  const rows: JsonRow[] = [];

  const push = (
    entries: readonly [PathSegment, unknown][],
    parentPath: PathSegment[],
    parentId: string | null,
    level: number,
    offset = 0,
    total = entries.length,
  ) => {
    entries.forEach(([key, item], index) => {
      const path = [...parentPath, key];
      const id = jsonPath(path);
      const kind = kindOf(item);
      const size = sizeOf(item);
      const expandable = (kind === 'object' || kind === 'array') && size > 0;
      const open = expandable && expanded.has(id);

      rows.push({
        id,
        item: { id, label: String(key) },
        level,
        parentId,
        posinset: offset + index + 1,
        setsize: total,
        expandable,
        expanded: open,
        path,
        key,
        chunk: null,
        value: item,
        kind,
        size,
      });

      if (open) children(item, path, id, level + 1);
    });
  };

  const children = (item: unknown, path: PathSegment[], id: string, level: number) => {
    const entries = childEntries(item);

    if (!Array.isArray(item) || entries.length <= chunkSize) {
      push(entries, path, id, level);

      return;
    }

    const chunks = Math.ceil(entries.length / chunkSize);

    for (let part = 0; part < chunks; part += 1) {
      const from = part * chunkSize;
      const to = Math.min(entries.length, from + chunkSize) - 1;
      const cid = chunkId(id, from);
      const open = expanded.has(cid);

      rows.push({
        id: cid,
        item: { id: cid, label: String(from) },
        level,
        parentId: id,
        posinset: part + 1,
        setsize: chunks,
        expandable: true,
        expanded: open,
        path,
        key: null,
        chunk: [from, to],
        value: item,
        kind: 'array',
        size: to - from + 1,
      });

      if (open) push(entries.slice(from, to + 1), path, cid, level + 1, from, entries.length);
    }
  };

  const kind = kindOf(value);

  if ((kind === 'object' || kind === 'array') && sizeOf(value) > 0) {
    children(value, [], '$', 1);
  } else {
    rows.push({
      id: '$',
      item: { id: '$', label: '' } satisfies TreeNodeData,
      level: 1,
      parentId: null,
      posinset: 1,
      setsize: 1,
      expandable: false,
      expanded: false,
      path: [],
      key: null,
      chunk: null,
      value,
      kind,
      size: sizeOf(value),
    });
  }

  // Строки верхнего уровня — без родителя: у Tree-клавиатуры «влево» на них никуда не ведёт
  return rows.map((row) => (row.parentId === '$' ? { ...row, parentId: null } : row));
}

/** id раскрытых веток до глубины `depth` (1 — только верхний уровень раскрыт… 0 — всё свёрнуто) */
export function expandToDepth(
  value: unknown,
  depth: number,
  { chunkSize = DEFAULT_CHUNK }: FlattenOptions = {},
): Set<string> {
  const out = new Set<string>();

  const walk = (item: unknown, path: PathSegment[], level: number) => {
    if (level >= depth) return;

    const entries = childEntries(item);
    const id = jsonPath(path);

    if (Array.isArray(item) && entries.length > chunkSize) {
      // Большие массивы не раскрываются сами: открыть первый кусок — уже решение человека
      return;
    }

    if (path.length) out.add(id);

    for (const [key, child] of entries) {
      if (child && typeof child === 'object') walk(child, [...path, key], level + 1);
    }
  };

  walk(value, [], -1);

  return out;
}

export interface JsonSearch {
  /** id строк, чей ключ совпал */
  matches: Set<string>;
  /** Ветки и куски, которые надо раскрыть, чтобы совпадения было видно */
  expand: Set<string>;
}

/**
 * Поиск по ключам без учёта регистра. Обходит всё значение, но не дальше `limit` узлов и без циклов —
 * огромный ответ бота не повесит вкладку.
 */
export function searchJson(
  value: unknown,
  query: string,
  { chunkSize = DEFAULT_CHUNK, limit = 50_000 }: FlattenOptions & { limit?: number } = {},
): JsonSearch {
  const needle = query.trim().toLocaleLowerCase();
  const matches = new Set<string>();
  const expand = new Set<string>();

  if (!needle) return { matches, expand };

  const seen = new WeakSet<object>();
  let visited = 0;

  const walk = (item: unknown, path: PathSegment[], ancestors: string[]) => {
    if (!item || typeof item !== 'object' || seen.has(item) || visited > limit) return;

    seen.add(item);

    const entries = childEntries(item);
    const id = jsonPath(path);
    const chunked = Array.isArray(item) && entries.length > chunkSize;

    for (const [key, child] of entries) {
      visited += 1;

      const childPath = [...path, key];
      const childId = jsonPath(childPath);
      const chain = chunked
        ? [...ancestors, id, chunkId(id, Math.floor((key as number) / chunkSize) * chunkSize)]
        : [...ancestors, id];

      if (typeof key === 'string' && key.toLocaleLowerCase().includes(needle)) {
        matches.add(childId);
        chain.forEach((ancestor) => expand.add(ancestor));
      }

      walk(child, childPath, chain);
    }
  };

  walk(value, [], []);
  expand.delete('$');

  return { matches, expand };
}

/** Текст для копирования: строка — как есть, остальное — JSON с отступами */
export function copyableValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'bigint') return value.toString();
  if (value === undefined) return 'undefined';

  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    // Циклическая ссылка — JSON её не запишет
    return String(value);
  }
}

/** Короткий вид примитива в строке: строки — в кавычках и обрезаны, длинный текст разворачивать незачем */
export function previewPrimitive(value: unknown, max = 160): string {
  if (typeof value === 'string') {
    const text = JSON.stringify(value);

    return text.length > max ? `${text.slice(0, max - 2)}…"` : text;
  }

  if (typeof value === 'bigint') return `${value}n`;

  return String(value);
}
