import { describe, expect, it } from 'vitest';

import {
  handleBounds,
  pixelsToPercent,
  resizeAt,
  resizeByKey,
  resizeTo,
  resolveSizes,
  type PanelConstraints,
} from './resizable-math';

const total = (sizes: number[]) => sizes.reduce((a, b) => a + b, 0);

describe('resolveSizes', () => {
  it('без defaultSize — поровну', () => {
    const sizes = resolveSizes([{}, {}, {}]);

    sizes.forEach((size) => expect(size).toBeCloseTo(100 / 3));
    expect(total(sizes)).toBeCloseTo(100);
  });

  it('заданные — как есть, остаток поровну', () => {
    expect(resolveSizes([{ defaultSize: 20 }, {}, {}])).toEqual([20, 40, 40]);
  });

  it('ограничения важнее defaultSize, недостачу забирают панели с конца', () => {
    expect(resolveSizes([{ defaultSize: 5, minSize: 15 }, {}])).toEqual([15, 85]);
    expect(resolveSizes([{ defaultSize: 60 }, { defaultSize: 60, maxSize: 30 }])).toEqual([70, 30]);
  });

  it('сумма заданных больше 100 — урезается до 100', () => {
    const sizes = resolveSizes([{ defaultSize: 70 }, { defaultSize: 70 }]);

    expect(total(sizes)).toBeCloseTo(100);
    expect(sizes).toEqual([70, 30]);
  });

  it('пусто — пусто', () => {
    expect(resolveSizes([])).toEqual([]);
  });
});

describe('handleBounds', () => {
  const panels: PanelConstraints[] = [{ minSize: 15, maxSize: 40 }, { minSize: 30 }];

  it('пределы левой панели с учётом правой', () => {
    expect(handleBounds([25, 75], panels, 0)).toEqual({ min: 15, max: 40 });
    expect(handleBounds([25, 75], [{}, { minSize: 80 }], 0)).toEqual({ min: 0, max: 20 });
    expect(handleBounds([25, 75], [{}, { maxSize: 60 }], 0)).toEqual({ min: 40, max: 100 });
  });

  it('несовместимые ограничения — ручка стоит на месте', () => {
    expect(handleBounds([50, 50], [{ maxSize: 30 }, { maxSize: 30 }], 0)).toEqual({
      min: 50,
      max: 50,
    });
  });
});

describe('resizeAt', () => {
  const panels: PanelConstraints[] = [{ minSize: 15, maxSize: 40 }, {}, { minSize: 10 }];

  it('что отдала одна соседка — получила другая, дальние не двигаются', () => {
    expect(resizeAt([25, 50, 25], panels, 0, 10)).toEqual([35, 40, 25]);
    expect(resizeAt([25, 50, 25], panels, 1, -10)).toEqual([25, 40, 35]);
  });

  it('упирается в пределы', () => {
    expect(resizeAt([25, 50, 25], panels, 0, 50)).toEqual([40, 35, 25]);
    expect(resizeAt([25, 50, 25], panels, 0, -50)).toEqual([15, 60, 25]);
    expect(resizeAt([25, 50, 25], panels, 1, 50)).toEqual([25, 65, 10]);
  });

  it('ручки за краем нет — размеры не меняются', () => {
    expect(resizeAt([50, 50], [{}, {}], 1, 10)).toEqual([50, 50]);
    expect(resizeAt([50, 50], [{}, {}], -1, 10)).toEqual([50, 50]);
  });
});

describe('resizeTo', () => {
  it('ставит левую панель в размер в пределах', () => {
    expect(resizeTo([25, 75], [{ maxSize: 40 }, {}], 0, 30)).toEqual([30, 70]);
    expect(resizeTo([25, 75], [{ maxSize: 40 }, {}], 0, 90)).toEqual([40, 60]);
  });
});

describe('resizeByKey', () => {
  const panels: PanelConstraints[] = [{ minSize: 15, maxSize: 40 }, {}];

  it('стрелки вдоль оси на шаг', () => {
    expect(resizeByKey([25, 75], panels, 0, 'ArrowRight', 'horizontal', 5)).toEqual([30, 70]);
    expect(resizeByKey([25, 75], panels, 0, 'ArrowLeft', 'horizontal', 5)).toEqual([20, 80]);
    expect(resizeByKey([25, 75], panels, 0, 'ArrowDown', 'vertical', 5)).toEqual([30, 70]);
  });

  it('стрелки поперёк оси — не наши', () => {
    expect(resizeByKey([25, 75], panels, 0, 'ArrowDown', 'horizontal', 5)).toBeNull();
    expect(resizeByKey([25, 75], panels, 0, 'Enter', 'horizontal', 5)).toBeNull();
  });

  it('Home — к минимуму, End — к максимуму', () => {
    expect(resizeByKey([25, 75], panels, 0, 'Home', 'horizontal', 5)).toEqual([15, 85]);
    expect(resizeByKey([25, 75], panels, 0, 'End', 'horizontal', 5)).toEqual([40, 60]);
  });
});

describe('pixelsToPercent', () => {
  it('доля от места под панели', () => {
    expect(pixelsToPercent(50, 200)).toBe(25);
    expect(pixelsToPercent(-20, 400)).toBe(-5);
    expect(pixelsToPercent(10, 0)).toBe(0);
  });
});
