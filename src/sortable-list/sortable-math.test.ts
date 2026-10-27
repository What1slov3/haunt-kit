import { describe, expect, it } from 'vitest';

import {
  autoScrollSpeed,
  clampIndex,
  defaultSortableMessages,
  moveItem,
  shiftFor,
  slotTop,
  stepDistance,
  targetIndex,
  type ItemRect,
} from './sortable-math';

// Пять строк по 28 px с зазором 2 px: верх 0, 30, 60, 90, 120
const rects: ItemRect[] = [0, 30, 60, 90, 120].map((top) => ({ top, height: 28 }));

describe('moveItem', () => {
  const items = ['a', 'b', 'c', 'd'];

  it('вниз и вверх', () => {
    expect(moveItem(items, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(items, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('на то же место и за границей — копия без изменений / к краю', () => {
    expect(moveItem(items, 1, 1)).toEqual(items);
    expect(moveItem(items, 1, 1)).not.toBe(items);
    expect(moveItem(items, 0, 99)).toEqual(['b', 'c', 'd', 'a']);
    expect(moveItem(items, 9, 0)).toEqual(items);
  });
});

describe('clampIndex', () => {
  it('в пределах списка', () => {
    expect(clampIndex(-1, 5)).toBe(0);
    expect(clampIndex(7, 5)).toBe(4);
    expect(clampIndex(2, 5)).toBe(2);
    expect(clampIndex(3, 0)).toBe(0);
  });
});

describe('targetIndex', () => {
  it('центр не перевалил за середину соседа — место прежнее', () => {
    // Строка 1 (центр 44) сдвинута на 10 px вниз: середина строки 2 — 74
    expect(targetIndex(rects, 1, 54)).toBe(1);
  });

  it('перевалил за середину — встаёт за соседа', () => {
    expect(targetIndex(rects, 1, 75)).toBe(2);
    expect(targetIndex(rects, 1, 200)).toBe(4);
  });

  it('вверх', () => {
    expect(targetIndex(rects, 3, 40)).toBe(1);
    expect(targetIndex(rects, 3, -50)).toBe(0);
  });

  it('строки разной высоты — по их серединам', () => {
    const mixed: ItemRect[] = [
      { top: 0, height: 20 },
      { top: 20, height: 80 },
      { top: 100, height: 20 },
    ];

    expect(targetIndex(mixed, 0, 59)).toBe(0);
    expect(targetIndex(mixed, 0, 61)).toBe(1);
  });
});

describe('stepDistance', () => {
  it('высота строки и зазор', () => {
    expect(stepDistance(rects, 1)).toBe(30);
    expect(stepDistance(rects, 4)).toBe(30);
  });

  it('одна строка — только высота; нет строки — 0', () => {
    expect(stepDistance([{ top: 0, height: 28 }], 0)).toBe(28);
    expect(stepDistance(rects, 9)).toBe(0);
  });
});

describe('shiftFor', () => {
  it('вниз: строки между уступают вверх', () => {
    expect([0, 1, 2, 3, 4].map((index) => shiftFor(index, 1, 3, 30))).toEqual([0, 0, -30, -30, 0]);
  });

  it('вверх: строки между уступают вниз', () => {
    expect([0, 1, 2, 3, 4].map((index) => shiftFor(index, 3, 1, 30))).toEqual([0, 30, 30, 0, 0]);
  });

  it('на месте — никто не двигается', () => {
    expect([0, 1, 2].map((index) => shiftFor(index, 1, 1, 30))).toEqual([0, 0, 0]);
  });
});

describe('slotTop', () => {
  it('вверх — на верх строки to, вниз — низом к её низу', () => {
    expect(slotTop(rects, 3, 1)).toBe(30);
    expect(slotTop(rects, 1, 3)).toBe(90);
    expect(slotTop(rects, 2, 2)).toBe(60);
  });

  it('высокая строка вниз за низкую', () => {
    const mixed: ItemRect[] = [
      { top: 0, height: 60 },
      { top: 60, height: 20 },
    ];

    expect(slotTop(mixed, 0, 1)).toBe(20);
  });
});

describe('autoScrollSpeed', () => {
  it('вне зоны у края — 0', () => {
    expect(autoScrollSpeed(300, 0, 600)).toBe(0);
  });

  it('у верхнего края — вверх, у нижнего — вниз, сильнее ближе к краю', () => {
    expect(autoScrollSpeed(24, 0, 600)).toBe(-8);
    expect(autoScrollSpeed(0, 0, 600)).toBe(-16);
    expect(autoScrollSpeed(588, 0, 600)).toBe(12);
  });

  it('за краем — не быстрее максимума', () => {
    expect(autoScrollSpeed(900, 0, 600)).toBe(16);
  });
});

describe('defaultSortableMessages', () => {
  it('фразы для скринридера', () => {
    expect(defaultSortableMessages.picked('general', 2, 5)).toMatch(
      /^Взято: general, позиция 2 из 5\./,
    );
    expect(defaultSortableMessages.moved('general', 3, 5)).toBe('general: позиция 3 из 5');
    expect(defaultSortableMessages.dropped('general', 3, 5)).toBe(
      'Положено: general, позиция 3 из 5',
    );
    expect(defaultSortableMessages.cancelled('general', 2, 5)).toBe(
      'Отменено: general остаётся на позиции 2 из 5',
    );
  });
});
