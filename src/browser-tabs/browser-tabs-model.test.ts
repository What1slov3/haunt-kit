import { describe, expect, it } from 'vitest';

import {
  clampDragOffset,
  cycleIndex,
  dropIndex,
  groupRange,
  tabAfterClose,
  tabShift,
  type TabRect,
} from './browser-tabs-model';

const tabs = [
  { id: 'inbox', pinned: true },
  { id: 'dm', pinned: true },
  { id: 'general' },
  { id: 'news' },
  { id: 'voice' },
];

// Две узкие закреплённые по 40 px и три обычные по 160 px встык
const rects: TabRect[] = [
  { left: 0, width: 40 },
  { left: 40, width: 40 },
  { left: 80, width: 160 },
  { left: 240, width: 160 },
  { left: 400, width: 160 },
];

describe('groupRange', () => {
  it('закреплённые — среди закреплённых, обычные — после них', () => {
    expect(groupRange(tabs, 0)).toEqual([0, 1]);
    expect(groupRange(tabs, 3)).toEqual([2, 4]);
  });

  it('без закреплённых — вся полоса', () => {
    expect(groupRange([{ id: 'a' }, { id: 'b' }], 1)).toEqual([0, 1]);
  });
});

describe('cycleIndex', () => {
  it('по кругу в обе стороны', () => {
    expect(cycleIndex(5, 4, 1)).toBe(0);
    expect(cycleIndex(5, 0, -1)).toBe(4);
    expect(cycleIndex(5, 2, 1)).toBe(3);
  });

  it('пустая полоса', () => {
    expect(cycleIndex(0, 0, 1)).toBe(-1);
  });
});

describe('tabAfterClose', () => {
  it('закрыли неактивную — активная та же', () => {
    expect(tabAfterClose(tabs, 'news', 'general')).toBe('general');
  });

  it('закрыли активную — соседка справа', () => {
    expect(tabAfterClose(tabs, 'general', 'general')).toBe('news');
  });

  it('у последней — соседка слева', () => {
    expect(tabAfterClose(tabs, 'voice', 'voice')).toBe('news');
  });

  it('единственная — ничего', () => {
    expect(tabAfterClose([{ id: 'a' }], 'a', 'a')).toBeNull();
  });
});

describe('dropIndex', () => {
  it('за серединой соседки — её место', () => {
    // Вкладка 2 (центр 160) сдвинута на 100 вправо: центр 260 — левее середины news (320)
    expect(dropIndex(rects, 2, 260, [2, 4])).toBe(2);
    expect(dropIndex(rects, 2, 330, [2, 4])).toBe(3);
    expect(dropIndex(rects, 2, 500, [2, 4])).toBe(4);
  });

  it('обычную не утащить в закреплённые', () => {
    expect(dropIndex(rects, 3, 0, [2, 4])).toBe(2);
  });
});

describe('tabShift', () => {
  it('соседи между from и to уступают на ширину перетаскиваемой', () => {
    expect(tabShift(rects, 3, 2, 4)).toBe(-160);
    expect(tabShift(rects, 4, 2, 4)).toBe(-160);
    expect(tabShift(rects, 1, 2, 4)).toBe(0);
  });
});

describe('clampDragOffset', () => {
  it('до краёв группы и на полвкладки за них', () => {
    expect(clampDragOffset(rects, 2, -200, [2, 4])).toBe(-80);
    expect(clampDragOffset(rects, 2, 1000, [2, 4])).toBe(400);
    expect(clampDragOffset(rects, 3, 50, [2, 4])).toBe(50);
  });
});
