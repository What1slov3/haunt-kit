import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseLayout, readLayout, writeLayout } from './resizable-storage';

describe('parseLayout', () => {
  it('массив размеров нужной длины', () => {
    expect(parseLayout('["240px", 75]', 2)).toEqual(['240px', 75]);
    expect(parseLayout('["25%", 75.5]', 2)).toEqual(['25%', 75.5]);
  });

  it('чужое и битое — как будто ничего нет', () => {
    expect(parseLayout(null, 2)).toBeNull();
    expect(parseLayout('{', 2)).toBeNull();
    expect(parseLayout('[25, 75]', 3)).toBeNull();
    expect(parseLayout('["wide", 75]', 2)).toBeNull();
    expect(parseLayout('[-5, 105]', 2)).toBeNull();
    expect(parseLayout('{"sizes": [25, 75]}', 2)).toBeNull();
  });
});

describe('readLayout / writeLayout', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('записанное читается обратно', () => {
    writeLayout('sidebar', ['240px', 75]);

    expect(readLayout('sidebar', 2)).toEqual(['240px', 75]);
    expect(readLayout('other', 2)).toBeNull();
  });

  it('хранилище бросает — не падаем', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    expect(() => writeLayout('sidebar', [25, 75])).not.toThrow();
    expect(readLayout('sidebar', 2)).toBeNull();
  });
});
