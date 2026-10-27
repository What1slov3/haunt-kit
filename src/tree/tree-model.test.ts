import { describe, expect, it } from 'vitest';

import {
  canMove,
  dropZone,
  flattenVisible,
  isDescendant,
  keyboardMove,
  moveNode,
  rangeIds,
  treeKeyAction,
  typeaheadIndex,
  type TreeNodeData,
} from './tree-model';

const tree: TreeNodeData[] = [
  {
    id: 'text',
    label: 'Текстовые',
    children: [
      { id: 'general', label: 'general' },
      { id: 'games', label: 'games' },
      { id: 'memes', label: 'memes' },
    ],
  },
  { id: 'voice', label: 'Голосовые', children: [{ id: 'lounge', label: 'lounge' }] },
  { id: 'empty', label: 'Пустая', children: [] },
  { id: 'archive', label: 'Архив', hasChildren: true },
  { id: 'rules', label: 'rules' },
];

const ids = (items: readonly TreeNodeData[]): unknown =>
  items.map((item) => (item.children ? { [item.id]: ids(item.children) } : item.id));

describe('flattenVisible', () => {
  it('свёрнутые ветки не раскрываются; уровни и позиции', () => {
    const flat = flattenVisible(tree, new Set(['text']));

    expect(flat.map((node) => node.id)).toEqual([
      'text',
      'general',
      'games',
      'memes',
      'voice',
      'empty',
      'archive',
      'rules',
    ]);
    expect(flat[1]).toMatchObject({ level: 2, parentId: 'text', posinset: 1, setsize: 3 });
    expect(flat[0]).toMatchObject({ expandable: true, expanded: true });
  });

  it('пустая ветка не раскрывается, незагруженная — раскрывается', () => {
    const flat = flattenVisible(tree, new Set());

    expect(flat.find((node) => node.id === 'empty')!.expandable).toBe(false);
    expect(flat.find((node) => node.id === 'archive')!.expandable).toBe(true);
  });
});

describe('treeKeyAction', () => {
  const flat = flattenVisible(tree, new Set(['text']));

  it('стрелки вверх и вниз, Home и End', () => {
    expect(treeKeyAction(flat, 0, 'ArrowDown')).toEqual({ type: 'focus', index: 1 });
    expect(treeKeyAction(flat, 0, 'ArrowUp')).toBeNull();
    expect(treeKeyAction(flat, 3, 'End')).toEqual({ type: 'focus', index: 7 });
    expect(treeKeyAction(flat, 3, 'Home')).toEqual({ type: 'focus', index: 0 });
  });

  it('вправо: раскрыть, у раскрытой — первый ребёнок, у листа — ничего', () => {
    expect(treeKeyAction(flat, 4, 'ArrowRight')).toEqual({ type: 'expand', id: 'voice' });
    expect(treeKeyAction(flat, 0, 'ArrowRight')).toEqual({ type: 'focus', index: 1 });
    expect(treeKeyAction(flat, 1, 'ArrowRight')).toBeNull();
  });

  it('влево: свернуть, у ребёнка — к родителю', () => {
    expect(treeKeyAction(flat, 0, 'ArrowLeft')).toEqual({ type: 'collapse', id: 'text' });
    expect(treeKeyAction(flat, 2, 'ArrowLeft')).toEqual({ type: 'focus', index: 0 });
    expect(treeKeyAction(flat, 7, 'ArrowLeft')).toBeNull();
  });

  it('звёздочка раскрывает свёрнутых соседей', () => {
    expect(treeKeyAction(flat, 0, '*')).toEqual({
      type: 'expandSiblings',
      ids: ['voice', 'archive'],
    });
  });
});

describe('typeaheadIndex', () => {
  const flat = flattenVisible(tree, new Set(['text']));

  it('ищет со следующего узла и по кругу', () => {
    expect(typeaheadIndex(flat, 0, 'g')).toBe(1);
    expect(typeaheadIndex(flat, 1, 'g')).toBe(2);
    expect(typeaheadIndex(flat, 2, 'ggg')).toBe(1);
  });

  it('продолжение слова не перескакивает текущий узел', () => {
    expect(typeaheadIndex(flat, 1, 'ge')).toBe(1);
    expect(typeaheadIndex(flat, 0, 'ар')).toBe(6);
    expect(typeaheadIndex(flat, 0, 'zz')).toBe(-1);
  });

  it('диапазон для Shift', () => {
    expect(rangeIds(flat, 3, 1)).toEqual(['general', 'games', 'memes']);
  });
});

describe('перемещение', () => {
  it('перед, после и внутрь', () => {
    expect(ids(moveNode(tree, { id: 'rules', targetId: 'general', position: 'before' })!)).toEqual([
      { text: ['rules', 'general', 'games', 'memes'] },
      { voice: ['lounge'] },
      { empty: [] },
      'archive',
    ]);
    expect(
      ids(moveNode(tree, { id: 'games', targetId: 'empty', position: 'inside' })!),
    ).toContainEqual({
      empty: ['games'],
    });
    expect(ids(moveNode(tree, { id: 'lounge', targetId: 'rules', position: 'after' })!)).toEqual([
      { text: ['general', 'games', 'memes'] },
      { voice: [] },
      { empty: [] },
      'archive',
      'rules',
      'lounge',
    ]);
  });

  it('нельзя на себя, в своё поддерево и внутрь листа', () => {
    expect(canMove(tree, { id: 'text', targetId: 'general', position: 'after' })).toBe(false);
    expect(canMove(tree, { id: 'text', targetId: 'text', position: 'before' })).toBe(false);
    expect(canMove(tree, { id: 'games', targetId: 'rules', position: 'inside' })).toBe(false);
    expect(canMove(tree, { id: 'games', targetId: 'archive', position: 'inside' })).toBe(true);
    expect(moveNode(tree, { id: 'text', targetId: 'memes', position: 'inside' })).toBeNull();
    expect(isDescendant(tree, 'text', 'memes')).toBe(true);
    expect(isDescendant(tree, 'memes', 'text')).toBe(false);
  });

  it('исходное дерево не меняется', () => {
    const before = JSON.stringify(tree);

    moveNode(tree, { id: 'rules', targetId: 'general', position: 'before' });

    expect(JSON.stringify(tree)).toBe(before);
  });

  it('клавиатура: соседи, внутрь предыдущей ветки, наружу после родителя', () => {
    expect(keyboardMove(tree, 'games', 'up')).toEqual({
      id: 'games',
      targetId: 'general',
      position: 'before',
    });
    expect(keyboardMove(tree, 'games', 'down')).toEqual({
      id: 'games',
      targetId: 'memes',
      position: 'after',
    });
    expect(keyboardMove(tree, 'general', 'up')).toBeNull();
    expect(keyboardMove(tree, 'rules', 'in')).toEqual({
      id: 'rules',
      targetId: 'archive',
      position: 'inside',
    });
    expect(keyboardMove(tree, 'games', 'in')).toBeNull();
    expect(keyboardMove(tree, 'games', 'out')).toEqual({
      id: 'games',
      targetId: 'text',
      position: 'after',
    });
    expect(keyboardMove(tree, 'rules', 'out')).toBeNull();
  });

  it('зоны броска', () => {
    expect(dropZone(2, 28, true)).toBe('before');
    expect(dropZone(14, 28, true)).toBe('inside');
    expect(dropZone(26, 28, true)).toBe('after');
    expect(dropZone(13, 28, false)).toBe('before');
    expect(dropZone(15, 28, false)).toBe('after');
  });
});
