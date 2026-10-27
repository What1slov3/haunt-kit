import { describe, expect, it } from 'vitest';

import { toggleReaction, type ReactionItem } from './reaction-model';

const list: ReactionItem[] = [
  { emoji: '🔥', count: 3, mine: true },
  { emoji: '👍', count: 1 },
];

describe('toggleReaction', () => {
  it('ставит свою на чужую реакцию', () => {
    expect(toggleReaction(list, '👍', true)[1]).toEqual({ emoji: '👍', count: 2, mine: true });
  });

  it('снимает свою', () => {
    expect(toggleReaction(list, '🔥', false)[0]).toEqual({ emoji: '🔥', count: 2, mine: false });
  });

  it('реакция без голосов уходит', () => {
    const only = toggleReaction([{ emoji: '😮', count: 1, mine: true }], '😮', false);

    expect(only).toEqual([]);
  });

  it('новая встаёт в конец', () => {
    expect(toggleReaction(list, '😂', true).at(-1)).toEqual({ emoji: '😂', count: 1, mine: true });
  });

  it('повтор того же состояния ничего не меняет', () => {
    expect(toggleReaction(list, '🔥', true)).toEqual(list);
    expect(toggleReaction(list, '😂', false)).toEqual(list);
  });

  it('не меняет исходный список', () => {
    toggleReaction(list, '👍', true);

    expect(list[1]).toEqual({ emoji: '👍', count: 1 });
  });
});
