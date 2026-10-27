/*
 * Модель дерева — чистые функции: плоский список видимых узлов (по нему рисуются строки и ходит фокус),
 * клавиатура по шаблону WAI-ARIA tree, поиск набором букв и перемещение узлов. Данные — неизменяемые:
 * перемещение возвращает новое дерево, владелец решает, принять ли его.
 */

export interface TreeNodeData {
  id: string;
  /** Подпись строки — по ней же поиск набором букв и фразы скринридера */
  label: string;
  /** Дети; `[]` — пустая ветка (категория без каналов), в неё можно положить узел */
  children?: readonly TreeNodeData[];
  /** Ветка с детьми, которые ещё не загружены: раскрытие вызывает `onLoadChildren` */
  hasChildren?: boolean;
  disabled?: boolean;
}

export interface FlatNode<T extends TreeNodeData = TreeNodeData> {
  id: string;
  item: T;
  /** Уровень с единицы — для aria-level и отступа */
  level: number;
  parentId: string | null;
  /** Позиция среди соседей с единицы и их число — aria-posinset / aria-setsize */
  posinset: number;
  setsize: number;
  /** Можно раскрыть: есть дети или они ещё не загружены */
  expandable: boolean;
  expanded: boolean;
}

/** Ветка: у узла есть список детей (хоть пустой) или они придут позже — в неё можно положить узел */
export function isBranch(item: TreeNodeData): boolean {
  return item.children !== undefined || item.hasChildren === true;
}

function canExpand(item: TreeNodeData): boolean {
  return (
    (item.children?.length ?? 0) > 0 || (item.hasChildren === true && item.children === undefined)
  );
}

/** Видимые узлы сверху вниз: дети свёрнутой ветки не попадают */
export function flattenVisible<T extends TreeNodeData>(
  items: readonly T[],
  expanded: ReadonlySet<string>,
): FlatNode<T>[] {
  const out: FlatNode<T>[] = [];

  const walk = (nodes: readonly T[], level: number, parentId: string | null) => {
    nodes.forEach((item, index) => {
      const expandable = canExpand(item);
      const open = expandable && expanded.has(item.id);

      out.push({
        id: item.id,
        item,
        level,
        parentId,
        posinset: index + 1,
        setsize: nodes.length,
        expandable,
        expanded: open,
      });

      if (open && item.children) walk(item.children as readonly T[], level + 1, item.id);
    });
  };

  walk(items, 1, null);

  return out;
}

export type TreeKeyAction =
  | { type: 'focus'; index: number }
  | { type: 'expand'; id: string }
  | { type: 'collapse'; id: string }
  | { type: 'expandSiblings'; ids: string[] };

/**
 * Что делает клавиша по WAI-ARIA tree: ↑↓ — соседняя строка; → — раскрыть, у раскрытой — первый ребёнок;
 * ← — свернуть, у свёрнутой и листа — родитель; Home / End — первая и последняя; `*` — раскрыть всех
 * соседей. null — клавиша не дерева.
 */
export function treeKeyAction(
  flat: readonly FlatNode[],
  index: number,
  key: string,
): TreeKeyAction | null {
  const node = flat[index];

  if (!node) return flat.length ? { type: 'focus', index: 0 } : null;

  switch (key) {
    case 'ArrowDown':
      return index < flat.length - 1 ? { type: 'focus', index: index + 1 } : null;
    case 'ArrowUp':
      return index > 0 ? { type: 'focus', index: index - 1 } : null;
    case 'Home':
      return { type: 'focus', index: 0 };
    case 'End':
      return { type: 'focus', index: flat.length - 1 };
    case 'ArrowRight':
      if (node.expandable && !node.expanded) return { type: 'expand', id: node.id };
      if (node.expanded && flat[index + 1]?.parentId === node.id)
        return { type: 'focus', index: index + 1 };

      return null;
    case 'ArrowLeft': {
      if (node.expanded) return { type: 'collapse', id: node.id };

      const parent =
        node.parentId === null ? -1 : flat.findIndex((item) => item.id === node.parentId);

      return parent >= 0 ? { type: 'focus', index: parent } : null;
    }
    case '*': {
      const ids = flat
        .filter((item) => item.parentId === node.parentId && item.expandable && !item.expanded)
        .map((item) => item.id);

      return ids.length ? { type: 'expandSiblings', ids } : null;
    }
    default:
      return null;
  }
}

/**
 * Поиск набором букв: следующий после `from` узел, чья подпись начинается с набранного; по кругу. Набор
 * одной и той же буквы («ccc») листает узлы на эту букву, как в проводнике.
 */
export function typeaheadIndex(flat: readonly FlatNode[], from: number, query: string): number {
  const needle = query.toLocaleLowerCase();

  if (!needle || !flat.length) return -1;

  const repeated = [...needle].every((char) => char === needle[0]);
  const search = repeated ? needle[0]! : needle;
  // Новая буква ищет со следующего узла, продолжение слова — с текущего: «ge» не перескакивает «general»
  const offset = search.length === 1 ? 1 : 0;

  for (let step = 0; step < flat.length; step += 1) {
    const index = (from + offset + step + flat.length) % flat.length;

    if (flat[index]!.item.label.toLocaleLowerCase().startsWith(search)) return index;
  }

  return -1;
}

/** Строки от a до b включительно — выделение Shift-кликом и Shift-стрелкой */
export function rangeIds(flat: readonly FlatNode[], a: number, b: number): string[] {
  const [from, to] = a <= b ? [a, b] : [b, a];

  return flat.slice(Math.max(0, from), to + 1).map((node) => node.id);
}

export type DropPosition = 'before' | 'after' | 'inside';

export interface TreeMove {
  id: string;
  targetId: string;
  position: DropPosition;
}

interface Location<T extends TreeNodeData> {
  siblings: readonly T[];
  index: number;
  parent: T | null;
}

export function locate<T extends TreeNodeData>(
  items: readonly T[],
  id: string,
  parent: T | null = null,
): Location<T> | null {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]!;

    if (item.id === id) return { siblings: items, index, parent };

    if (item.children) {
      const found = locate(item.children as readonly T[], id, item);

      if (found) return found;
    }
  }

  return null;
}

/** `id` лежит внутри ветки `ancestorId` (на любой глубине) */
export function isDescendant(
  items: readonly TreeNodeData[],
  ancestorId: string,
  id: string,
): boolean {
  const ancestor = locate(items, ancestorId);
  const node = ancestor?.siblings[ancestor.index];

  return node?.children ? locate(node.children, id) !== null : false;
}

/** Можно ли положить узел сюда: не на себя, не в своё поддерево, внутрь — только ветки */
export function canMove(
  items: readonly TreeNodeData[],
  { id, targetId, position }: TreeMove,
): boolean {
  if (id === targetId) return false;

  const target = locate(items, targetId);
  const source = locate(items, id);

  if (!target || !source) return false;
  if (isDescendant(items, id, targetId)) return false;
  if (position === 'inside' && !isBranch(target.siblings[target.index]!)) return false;

  return true;
}

function removeNode<T extends TreeNodeData>(items: readonly T[], id: string): [T[], T | null] {
  let removed: T | null = null;

  const walk = (nodes: readonly T[]): T[] =>
    nodes.flatMap((item) => {
      if (item.id === id) {
        removed = item;

        return [];
      }

      return item.children ? [{ ...item, children: walk(item.children as readonly T[]) }] : [item];
    });

  const next = walk(items);

  return [next, removed];
}

function insertNode<T extends TreeNodeData>(
  items: readonly T[],
  node: T,
  targetId: string,
  position: DropPosition,
): T[] {
  return items.flatMap((item) => {
    if (item.id === targetId) {
      if (position === 'before') return [node, item];
      if (position === 'after') return [item, node];

      return [{ ...item, children: [...((item.children as readonly T[]) ?? []), node] }];
    }

    return item.children
      ? [{ ...item, children: insertNode(item.children as readonly T[], node, targetId, position) }]
      : [item];
  });
}

/** Новое дерево после перемещения; null — так положить нельзя (см. `canMove`) */
export function moveNode<T extends TreeNodeData>(items: readonly T[], move: TreeMove): T[] | null {
  if (!canMove(items, move)) return null;

  const [without, node] = removeNode(items, move.id);

  return node ? insertNode(without, node, move.targetId, move.position) : null;
}

export type KeyboardMove = 'up' | 'down' | 'in' | 'out';

/**
 * Перемещение с клавиатуры (Alt + стрелки) — доступная замена перетаскиванию: вверх / вниз — на место
 * соседа, вправо — внутрь предыдущей ветки последним, влево — из ветки сразу после родителя.
 */
export function keyboardMove(
  items: readonly TreeNodeData[],
  id: string,
  direction: KeyboardMove,
): TreeMove | null {
  const place = locate(items, id);

  if (!place) return null;

  const { siblings, index, parent } = place;
  const previous = siblings[index - 1];
  const next = siblings[index + 1];

  switch (direction) {
    case 'up':
      return previous ? { id, targetId: previous.id, position: 'before' } : null;
    case 'down':
      return next ? { id, targetId: next.id, position: 'after' } : null;
    case 'in':
      return previous && isBranch(previous)
        ? { id, targetId: previous.id, position: 'inside' }
        : null;
    case 'out':
      return parent ? { id, targetId: parent.id, position: 'after' } : null;
  }
}

/**
 * Зона броска по высоте строки: у ветки — верхняя четверть «перед», нижняя «после», середина «внутрь»;
 * у листа — верхняя и нижняя половины. Внутрь лист не берёт — промах мимо середины не теряет узел.
 */
export function dropZone(offset: number, height: number, branch: boolean): DropPosition {
  const ratio = height > 0 ? offset / height : 0;

  if (!branch) return ratio < 0.5 ? 'before' : 'after';
  if (ratio < 0.25) return 'before';
  if (ratio > 0.75) return 'after';

  return 'inside';
}
