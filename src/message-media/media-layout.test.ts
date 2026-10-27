import { describe, expect, it } from 'vitest';

import {
  fitMedia,
  isVideoSource,
  lightboxIndexes,
  mediaKind,
  mosaicLayout,
  mosaicSize,
  outerCorners,
  placeholderKind,
} from './media-layout';

const limits = { maxWidth: 400, maxHeight: 300 };

describe('fitMedia', () => {
  it('вписывает широкую картинку по ширине', () => {
    expect(fitMedia({ width: 1600, height: 900 }, limits)).toEqual({
      width: 400,
      height: 225,
      aspect: 16 / 9,
      cropped: false,
    });
  });

  it('вписывает высокую картинку по высоте', () => {
    expect(fitMedia({ width: 720, height: 1080 }, limits)).toMatchObject({
      width: 200,
      height: 300,
      cropped: false,
    });
  });

  it('не растягивает мелкую картинку', () => {
    expect(fitMedia({ width: 120, height: 80 }, limits)).toMatchObject({ width: 120, height: 80 });
  });

  it('обрезает очень широкую панораму до предельного отношения', () => {
    const fit = fitMedia({ width: 4000, height: 400 }, limits);

    expect(fit.aspect).toBe(3);
    expect(fit.cropped).toBe(true);
    expect(fit).toMatchObject({ width: 400, height: 133 });
  });

  it('обрезает очень высокую ленту сверху и снизу', () => {
    const fit = fitMedia({ width: 300, height: 3000 }, limits);

    expect(fit.aspect).toBeCloseTo(1 / 3);
    expect(fit.cropped).toBe(true);
    expect(fit).toMatchObject({ width: 100, height: 300 });
  });

  it('без размеров — кадр 16:9 на предельную ширину', () => {
    expect(fitMedia(undefined, limits)).toMatchObject({ width: 400, height: 225, cropped: false });
    expect(fitMedia({ width: 0, height: 10 }, limits)).toMatchObject({ width: 400 });
  });

  it('учитывает свои пределы отношения сторон', () => {
    expect(fitMedia({ width: 2000, height: 1000 }, { ...limits, maxAspect: 1.5 })).toMatchObject({
      aspect: 1.5,
      cropped: true,
    });
  });
});

describe('mosaicLayout', () => {
  it('одно вложение — своё превью без мозаики', () => {
    expect(mosaicLayout(1)).toMatchObject({ aspect: 0, rows: 1, hidden: 0 });
    expect(mosaicLayout(0).tiles).toEqual([]);
  });

  it('два — пара квадратов', () => {
    const layout = mosaicLayout(2);

    expect(layout.aspect).toBe(2);
    expect(layout.tiles.map((t) => [t.column, t.columnSpan])).toEqual([
      [1, 3],
      [4, 3],
    ]);
  });

  it('три — крупная слева на две строки и две справа', () => {
    const [first, second, third] = mosaicLayout(3).tiles;

    expect(first).toMatchObject({ column: 1, columnSpan: 4, rowSpan: 2 });
    expect(second).toMatchObject({ column: 5, row: 1, columnSpan: 2 });
    expect(third).toMatchObject({ column: 5, row: 2, columnSpan: 2 });
  });

  it('четыре — сетка 2 × 2', () => {
    const layout = mosaicLayout(4);

    expect(layout.rows).toBe(2);
    expect(layout.tiles.every((t) => t.columnSpan === 3)).toBe(true);
  });

  it('сверх лимита — скрытые считаются для «+N»', () => {
    const layout = mosaicLayout(7);

    expect(layout.tiles).toHaveLength(4);
    expect(layout.hidden).toBe(3);
  });

  it('больше четырёх с большим лимитом — ряд из двух и ряды по три', () => {
    const layout = mosaicLayout(7, 10);

    expect(layout.rows).toBe(3);
    expect(layout.tiles.filter((t) => t.row === 2).map((t) => t.columnSpan)).toEqual([2, 2, 2]);
    expect(layout.tiles.filter((t) => t.row === 3).map((t) => t.columnSpan)).toEqual([3, 3]);
    expect(layout.aspect).toBe(1);
  });

  it('неполный ряд из одной плитки растянут на всю ширину', () => {
    const last = mosaicLayout(6, 6).tiles.at(-1);

    expect(last).toMatchObject({ column: 1, row: 3, columnSpan: 6 });
  });
});

describe('outerCorners', () => {
  it('крупная слева в тройке — оба левых угла', () => {
    const layout = mosaicLayout(3);
    const [first, second, third] = layout.tiles.map((t) => outerCorners(t, layout.rows));

    expect(first).toEqual({ topLeft: true, topRight: false, bottomRight: false, bottomLeft: true });
    expect(second).toEqual({
      topLeft: false,
      topRight: true,
      bottomRight: false,
      bottomLeft: false,
    });
    expect(third).toEqual({
      topLeft: false,
      topRight: false,
      bottomRight: true,
      bottomLeft: false,
    });
  });

  it('одиночная — все четыре', () => {
    const layout = mosaicLayout(1);

    expect(Object.values(outerCorners(layout.tiles[0]!, layout.rows))).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });
});

describe('mosaicSize', () => {
  it('по ширине, пока влезает высота', () => {
    expect(mosaicSize(2, limits)).toEqual({ width: 400, height: 200 });
    expect(mosaicSize(1, limits)).toEqual({ width: 300, height: 300 });
  });
});

describe('placeholderKind', () => {
  it('отличает картинку от цвета', () => {
    expect(placeholderKind('data:image/png;base64,AAAA')).toBe('image');
    expect(placeholderKind('https://cdn/blur.jpg')).toBe('image');
    expect(placeholderKind('#3a2f4b')).toBe('color');
    expect(placeholderKind('oklch(40% 0.1 280)')).toBe('color');
    expect(placeholderKind('  ')).toBe('none');
    expect(placeholderKind()).toBe('none');
  });
});

describe('mediaKind', () => {
  it('явный вид главнее', () => {
    expect(mediaKind({ kind: 'video', src: 'a.png' })).toBe('video');
  });

  it('по MIME, data-URI и расширению', () => {
    expect(mediaKind({ src: 'x', type: 'image/gif' })).toBe('gif');
    expect(mediaKind({ src: 'data:image/gif;base64,R0lG' })).toBe('gif');
    expect(mediaKind({ src: 'x', type: 'video/webm' })).toBe('video');
    expect(mediaKind({ src: 'https://cdn/clip.MP4?sig=1' })).toBe('video');
    expect(mediaKind({ src: 'blob:abc', name: 'cat.gif' })).toBe('gif');
    expect(mediaKind({ src: 'https://cdn/photo.jpg#x' })).toBe('image');
  });
});

describe('isVideoSource', () => {
  it('GIF роликом играет видео, обычный GIF — картинкой', () => {
    expect(isVideoSource({ src: 'https://cdn/cat.mp4' })).toBe(true);
    expect(isVideoSource({ src: 'x', type: 'video/mp4' })).toBe(true);
    expect(isVideoSource({ src: 'https://cdn/cat.gif' })).toBe(false);
  });
});

describe('lightboxIndexes', () => {
  it('видео пропускаются, остальные нумеруются подряд', () => {
    expect(lightboxIndexes(['image', 'video', 'gif', 'image'])).toEqual([0, -1, 1, 2]);
  });
});
