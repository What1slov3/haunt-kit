import { describe, expect, it } from 'vitest';

import {
  collapsibleNeighbour,
  handleBounds,
  normalizePanels,
  pixelPanels,
  rememberExpanded,
  rescaleSizes,
  resizeAt,
  resizeByKey,
  resolveSizes,
  serializeLayout,
  toggleCollapse,
  toPercent,
  type PanelConstraints,
} from './resizable-math';

const total = (sizes: number[]) => sizes.reduce((a, b) => a + b, 0);

describe('каскад', () => {
  const panels: PanelConstraints[] = [{ minSize: 10 }, { minSize: 20 }, { minSize: 10 }];

  it('соседка упёрлась в минимум — место отдаёт следующая', () => {
    expect(resizeAt([20, 40, 40], panels, 0, 40)).toEqual([60, 20, 20]);
    expect(resizeAt([40, 40, 20], panels, 1, -40)).toEqual([20, 20, 60]);
  });

  it('все справа на минимуме — дальше ручка не идёт', () => {
    expect(resizeAt([20, 40, 40], panels, 0, 90)).toEqual([70, 20, 10]);
  });

  it('растёт только соседка ручки: упёрлась в максимум — дальние не растут', () => {
    expect(resizeAt([20, 40, 40], [{ maxSize: 30 }, {}, {}], 0, 30)).toEqual([30, 30, 40]);
  });

  it('пределы ручки учитывают всех справа', () => {
    expect(handleBounds([20, 40, 40], panels, 0)).toEqual({ min: 10, max: 70 });
  });
});

describe('сворачивание', () => {
  const sidebar: PanelConstraints = { minSize: 20, collapsible: true };
  const panels = [sidebar, { minSize: 30 }];

  it('до половины пути к свёрнутому — держится у минимума', () => {
    expect(resizeAt([30, 70], panels, 0, -15)).toEqual([20, 80]);
    expect(resizeAt([30, 70], panels, 0, -19)).toEqual([20, 80]);
  });

  it('за половиной — сворачивается целиком', () => {
    expect(resizeAt([30, 70], panels, 0, -21)).toEqual([0, 100]);
  });

  it('в мёртвой зоне дальние панели не сжимаются', () => {
    const three = [{ minSize: 10 }, { minSize: 20, collapsible: true }, {}];

    expect(resizeAt([30, 30, 40], three, 1, -15)).toEqual([30, 20, 50]);
  });

  it('свёрнутая разворачивается тем же порогом, сразу до минимума', () => {
    expect(resizeAt([0, 100], panels, 0, 9)).toEqual([0, 100]);
    expect(resizeAt([0, 100], panels, 0, 11)).toEqual([20, 80]);
    expect(resizeAt([0, 100], panels, 0, 35)).toEqual([35, 65]);
  });

  it('свёрнутый размер может быть больше нуля — рейл иконок', () => {
    const rail = [{ minSize: 20, collapsible: true, collapsedSize: 4 }, {}];

    expect(resizeAt([25, 75], rail, 0, -15)).toEqual([4, 96]);
  });

  it('некуда отдать место — не сворачивается', () => {
    expect(resizeAt([30, 70], [sidebar, { maxSize: 75 }], 0, -25)).toEqual([25, 75]);
  });

  it('Home сворачивает, пределы ручки — до свёрнутого', () => {
    expect(handleBounds([30, 70], panels, 0)).toEqual({ min: 0, max: 70 });
    expect(resizeByKey([30, 70], panels, 0, 'Home', 'horizontal', 5)).toEqual([0, 100]);
  });

  it('правая сворачиваемая соседка сжимается сама, без каскада', () => {
    const right = [{}, { minSize: 20 }, { minSize: 20, collapsible: true }];

    expect(handleBounds([30, 40, 30], right, 1)).toEqual({ min: 20, max: 70 });
    expect(resizeAt([30, 40, 30], right, 1, 25)).toEqual([30, 70, 0]);
  });

  it('collapsibleNeighbour — левая, иначе правая', () => {
    expect(collapsibleNeighbour(panels, 0)).toBe(0);
    expect(collapsibleNeighbour([{}, { collapsible: true }], 0)).toBe(1);
    expect(collapsibleNeighbour([{}, {}], 0)).toBe(-1);
  });

  it('toggleCollapse сворачивает и разворачивает в прежний размер', () => {
    expect(toggleCollapse([30, 70], panels, 0, undefined)).toEqual([0, 100]);
    expect(toggleCollapse([0, 100], panels, 0, 30)).toEqual([30, 70]);
    expect(toggleCollapse([0, 100], panels, 0, undefined)).toEqual([20, 80]);
    expect(toggleCollapse([70, 30], [{}, sidebar], 0, undefined)).toEqual([100, 0]);
    expect(toggleCollapse([100, 0], [{}, sidebar], 0, 25)).toEqual([75, 25]);
    expect(toggleCollapse([50, 50], [{}, {}], 0, undefined)).toBeNull();
  });

  it('rememberExpanded запоминает размер до жеста', () => {
    expect(rememberExpanded([], [30, 70], [0, 100], panels)).toEqual([30, undefined]);
    expect(rememberExpanded([30], [0, 100], [25, 75], panels)).toEqual([30, undefined]);
  });

  it('свёрнутая по defaultSize остаётся свёрнутой', () => {
    expect(resolveSizes([{ defaultSize: 0, minSize: 20, collapsible: true }, {}])).toEqual([
      0, 100,
    ]);
  });
});

describe('пиксели', () => {
  it('toPercent: число и % — проценты, px — доля контейнера', () => {
    expect(toPercent(30, 800)).toBe(30);
    expect(toPercent('30%', 800)).toBe(30);
    expect(toPercent('200px', 800)).toBe(25);
    expect(toPercent('200px', 0)).toBeUndefined();
    expect(toPercent(undefined, 800)).toBeUndefined();
  });

  it('normalizePanels переводит пропсы и подменяет defaultSize сохранённым', () => {
    expect(normalizePanels([{ defaultSize: '240px', minSize: '120px', maxSize: 50 }], 960)).toEqual(
      [
        {
          defaultSize: 25,
          minSize: 12.5,
          maxSize: 50,
          collapsible: undefined,
          collapsedSize: undefined,
        },
      ],
    );
    expect(normalizePanels([{ defaultSize: '240px' }], 960, ['480px'])[0]!.defaultSize).toBe(50);
  });

  it('pixelPanels: px держат пиксели, хотя бы одна гибкая', () => {
    expect(pixelPanels([{ defaultSize: '240px' }, {}])).toEqual([true, false]);
    expect(pixelPanels([{ defaultSize: '240px' }, { defaultSize: '100px' }])).toEqual([
      true,
      false,
    ]);
  });

  it('контейнер растёт — пиксельная панель держит px, прибавку забирает гибкая', () => {
    // 240 px из 960 = 25 %; в 1200 те же 240 px — 20 %
    const next = rescaleSizes([25, 75], [{}, {}], [true, false], [false, false], 960, 1200);

    expect(next[0]).toBeCloseTo(20);
    expect(next[1]).toBeCloseTo(80);
  });

  it('гибкие делят остаток в прежней пропорции', () => {
    const next = rescaleSizes(
      [25, 50, 25],
      [{}, {}, {}],
      [true, false, false],
      [false, false, false],
      800,
      1000,
    );

    expect(next[0]).toBeCloseTo(20);
    expect(next[1]).toBeCloseTo(160 / 3);
    expect(next[2]).toBeCloseTo(80 / 3);
  });

  it('свёрнутая остаётся свёрнутой, сумма сходится', () => {
    const next = rescaleSizes(
      [0, 60, 40],
      [{ collapsible: true }, { minSize: 50 }, {}],
      [false, true, false],
      [true, false, false],
      1000,
      500,
    );

    // 600 px в окне 500 — 120 %: пиксельная панель урезается до того, что влезает
    expect(next[0]).toBe(0);
    expect(total(next)).toBeCloseTo(100);
  });

  it('тот же размер или неизмеренный контейнер — без изменений', () => {
    expect(rescaleSizes([25, 75], [{}, {}], [true, false], [false, false], 0, 900)).toEqual([
      25, 75,
    ]);
    expect(rescaleSizes([25, 75], [{}, {}], [true, false], [false, false], 900, 900)).toEqual([
      25, 75,
    ]);
  });

  it('serializeLayout: пиксельные в px, остальные в %', () => {
    expect(serializeLayout([25, 75], [true, false], 960)).toEqual(['240px', 75]);
    expect(serializeLayout([100 / 3, 200 / 3], [false, false], 960)).toEqual([33.333, 66.667]);
    expect(serializeLayout([25, 75], [true, false], 0)).toEqual([25, 75]);
  });
});
