import { describe, expect, it } from 'vitest';

import {
  buildOffsets,
  captureAnchor,
  distanceToEnd,
  indexAtOffset,
  measureCorrection,
  restoreAnchor,
  scrollTopForIndex,
  shouldReach,
  visibleRange,
} from './virtual-list-math';

// Высоты 10, 20, 30, 40: верх строк 0, 10, 30, 60, полная высота 100
const offsets = buildOffsets(4, (index) => (index + 1) * 10);

describe('buildOffsets', () => {
  it('префиксные суммы и полная высота последним элементом', () => {
    expect(Array.from(offsets)).toEqual([0, 10, 30, 60, 100]);
  });

  it('пустой список — одна нулевая высота', () => {
    expect(Array.from(buildOffsets(0, () => 10))).toEqual([0]);
  });
});

describe('indexAtOffset', () => {
  it('смещение внутри строки и на её верхней кромке', () => {
    expect(indexAtOffset(offsets, 0)).toBe(0);
    expect(indexAtOffset(offsets, 9.9)).toBe(0);
    expect(indexAtOffset(offsets, 10)).toBe(1);
    expect(indexAtOffset(offsets, 59)).toBe(2);
  });

  it('за пределами списка — крайние строки', () => {
    expect(indexAtOffset(offsets, -50)).toBe(0);
    expect(indexAtOffset(offsets, 500)).toBe(3);
  });

  it('пустой список — 0', () => {
    expect(
      indexAtOffset(
        buildOffsets(0, () => 1),
        10,
      ),
    ).toBe(0);
  });
});

describe('visibleRange', () => {
  it('видимые строки без запаса', () => {
    expect(visibleRange(offsets, 15, 20, 0)).toEqual({ start: 1, end: 3 });
  });

  it('строка, начинающаяся ровно на нижнем краю окна, не видна', () => {
    expect(visibleRange(offsets, 0, 30, 0)).toEqual({ start: 0, end: 2 });
  });

  it('запас с обеих сторон, обрезанный по краям списка', () => {
    expect(visibleRange(offsets, 15, 20, 1)).toEqual({ start: 0, end: 4 });
  });

  it('окно ещё не измерено — первая строка и запас', () => {
    expect(visibleRange(offsets, 0, 0, 2)).toEqual({ start: 0, end: 3 });
  });

  it('10 000 строк по 32 px: окно 320 px в середине рисует 10 строк + запас', () => {
    const big = buildOffsets(10_000, () => 32);

    expect(visibleRange(big, 32 * 5000, 320, 3)).toEqual({ start: 4997, end: 5013 });
  });

  it('пустой список', () => {
    expect(
      visibleRange(
        buildOffsets(0, () => 1),
        0,
        100,
        3,
      ),
    ).toEqual({ start: 0, end: 0 });
  });
});

describe('scrollTopForIndex', () => {
  it('start, end и center', () => {
    expect(scrollTopForIndex(offsets, 2, 'start', 20, 0)).toBe(30);
    expect(scrollTopForIndex(offsets, 3, 'end', 20, 0)).toBe(80);
    expect(scrollTopForIndex(offsets, 3, 'center', 20, 0)).toBe(70);
  });

  it('не уходит выше начала списка', () => {
    expect(scrollTopForIndex(offsets, 0, 'end', 50, 0)).toBe(0);
  });

  it('auto: видна целиком — не прокручивать', () => {
    expect(scrollTopForIndex(offsets, 1, 'auto', 50, 0)).toBeNull();
  });

  it('auto: выше окна — к верху, ниже — к низу', () => {
    expect(scrollTopForIndex(offsets, 1, 'auto', 20, 40)).toBe(10);
    expect(scrollTopForIndex(offsets, 1, 'auto', 20, 0)).toBe(10);
  });

  it('auto: строка длиннее окна — к её верху', () => {
    expect(scrollTopForIndex(offsets, 3, 'auto', 20, 0)).toBe(60);
  });

  it('индекс за границей прижимается к последней строке', () => {
    expect(scrollTopForIndex(offsets, 99, 'start', 20, 0)).toBe(60);
  });
});

describe('measureCorrection', () => {
  it('строка выше окна выросла — прокрутка сдвигается на ту же разницу', () => {
    expect(measureCorrection(100, 24, 300)).toBe(24);
    expect(measureCorrection(100, -8, 300)).toBe(-8);
  });

  it('строка в окне или ниже — без поправки', () => {
    expect(measureCorrection(300, 24, 300)).toBe(0);
    expect(measureCorrection(900, 24, 300)).toBe(0);
  });
});

describe('якорь прокрутки', () => {
  const keys = ['a', 'b', 'c', 'd'];

  it('запоминает первую видимую строку и сдвиг внутри неё', () => {
    expect(captureAnchor(offsets, 35, (index) => keys[index] ?? '')).toEqual({
      key: 'c',
      offset: 5,
    });
  });

  it('подгрузили две строки сверху — окно едет вниз на их высоту', () => {
    const anchor = { key: 'c', offset: 5 };
    // Сверху добавились строки по 25 px: x, y, затем прежние a, b, c, d
    const nextKeys = ['x', 'y', ...keys];
    const next = buildOffsets(6, (index) => (index < 2 ? 25 : (index - 1) * 10));

    expect(restoreAnchor(anchor, next, (key) => nextKeys.indexOf(String(key)))).toBe(85);
  });

  it('якорь исчез из списка — null', () => {
    expect(restoreAnchor({ key: 'z', offset: 0 }, offsets, () => -1)).toBeNull();
  });

  it('пустой список — якоря нет', () => {
    expect(
      captureAnchor(
        buildOffsets(0, () => 1),
        0,
        () => 'a',
      ),
    ).toBeNull();
  });
});

describe('shouldReach', () => {
  it('подошли к краю — звать', () => {
    expect(shouldReach({ near: false, count: 50 }, { near: true, count: 50 })).toBe(true);
  });

  it('стоим у края, список не изменился — не звать повторно', () => {
    expect(shouldReach({ near: true, count: 50 }, { near: true, count: 50 })).toBe(false);
  });

  it('подгрузили, а окно всё ещё у края — звать снова', () => {
    expect(shouldReach({ near: true, count: 50 }, { near: true, count: 100 })).toBe(true);
  });

  it('далеко от края — не звать', () => {
    expect(shouldReach({ near: true, count: 50 }, { near: false, count: 100 })).toBe(false);
  });
});

describe('distanceToEnd', () => {
  it('остаток до низа, не меньше нуля', () => {
    expect(distanceToEnd({ scrollTop: 100, scrollHeight: 500, clientHeight: 200 })).toBe(200);
    expect(distanceToEnd({ scrollTop: 0, scrollHeight: 100, clientHeight: 200 })).toBe(0);
  });
});
