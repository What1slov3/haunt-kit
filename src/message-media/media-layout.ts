/*
 * Геометрия вложений в ленте — чистые функции: размер одиночного превью и раскладка мозаики. Размер
 * считается до загрузки из width / height с сервера, поэтому строка ленты сразу нужной высоты и не прыгает.
 */

export type MessageMediaKind = 'image' | 'gif' | 'video';

export interface MediaSize {
  width: number;
  height: number;
}

export interface MediaLimits {
  maxWidth: number;
  maxHeight: number;
  /** Шире этого отношения сторон превью обрезается по бокам */
  maxAspect?: number;
  /** Уже этого — обрезается сверху и снизу */
  minAspect?: number;
}

export interface MediaFit extends MediaSize {
  /** Отношение сторон превью — уже с учётом обрезки */
  aspect: number;
  /** Картинка вытянута сильнее предела и показана фрагментом */
  cropped: boolean;
}

/** Без размеров с сервера — кадр 16:9 на всю предельную ширину: так ведёт себя большинство вложений */
export const FALLBACK_ASPECT = 16 / 9;
export const MAX_ASPECT = 3;
export const MIN_ASPECT = 1 / 3;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const isKnown = (size?: Partial<MediaSize>): size is MediaSize =>
  Boolean(size?.width && size.height && size.width > 0 && size.height > 0);

/**
 * Размер одиночного превью: в своих пропорциях, не больше предельных ширины и высоты и не больше
 * собственного размера (мелкую картинку не растягиваем в мыло). Вытянутая сильнее `maxAspect` / `minAspect`
 * показывается фрагментом с этим отношением сторон.
 */
export function fitMedia(natural: Partial<MediaSize> | undefined, limits: MediaLimits): MediaFit {
  const maxAspect = limits.maxAspect ?? MAX_ASPECT;
  const minAspect = limits.minAspect ?? MIN_ASPECT;

  if (!isKnown(natural)) {
    const aspect = clamp(FALLBACK_ASPECT, minAspect, maxAspect);
    const width = Math.min(limits.maxWidth, limits.maxHeight * aspect);

    return { width: Math.round(width), height: Math.round(width / aspect), aspect, cropped: false };
  }

  const raw = natural.width / natural.height;
  const aspect = clamp(raw, minAspect, maxAspect);
  // Обрезанный фрагмент по ширине не больше той части, что осталась от картинки
  const ownWidth = Math.min(natural.width, natural.height * aspect);
  const width = Math.min(limits.maxWidth, limits.maxHeight * aspect, ownWidth);

  return {
    width: Math.round(width),
    height: Math.round(width / aspect),
    aspect,
    cropped: Math.abs(aspect - raw) > 1e-6,
  };
}

export interface MosaicTile {
  /** Номер вложения в списке */
  index: number;
  /** Колонка и строка сетки с 1, как в `grid-column` */
  column: number;
  row: number;
  columnSpan: number;
  rowSpan: number;
}

export interface MosaicLayout {
  tiles: MosaicTile[];
  /** Колонок в сетке — всегда 6: на неё ровно делятся ряды по 1, 2 и 3 плитки */
  columns: number;
  rows: number;
  /** Отношение сторон всей мозаики; 0 — одиночное превью в своих пропорциях (`fitMedia`) */
  aspect: number;
  /** Сколько вложений не поместилось — плитка «+N» на последней видимой */
  hidden: number;
}

export const MOSAIC_COLUMNS = 6;

const tile = (
  index: number,
  column: number,
  row: number,
  columnSpan: number,
  rowSpan = 1,
): MosaicTile => ({ index, column, row, columnSpan, rowSpan });

/**
 * Раскладка мозаики: 1 — своё превью; 2 — два квадрата; 3 — крупная слева и две справа; 4 — сетка 2 × 2;
 * больше — ряд из двух и ряды по три, неполный последний ряд растянут. Видно не больше `max`, остальные —
 * счётчик «+N» на последней плитке.
 */
export function mosaicLayout(count: number, max = 4): MosaicLayout {
  const limit = Math.max(1, Math.floor(max));
  const total = Math.max(0, Math.floor(count));
  const shown = Math.min(total, limit);
  const hidden = total - shown;
  const base = { columns: MOSAIC_COLUMNS, hidden };

  if (shown <= 1) {
    return { ...base, tiles: shown ? [tile(0, 1, 1, MOSAIC_COLUMNS)] : [], rows: shown, aspect: 0 };
  }

  if (shown === 2)
    return { ...base, tiles: [tile(0, 1, 1, 3), tile(1, 4, 1, 3)], rows: 1, aspect: 2 };

  if (shown === 3) {
    return {
      ...base,
      tiles: [tile(0, 1, 1, 4, 2), tile(1, 5, 1, 2), tile(2, 5, 2, 2)],
      rows: 2,
      aspect: 3 / 2,
    };
  }

  if (shown === 4) {
    return {
      ...base,
      tiles: [tile(0, 1, 1, 3), tile(1, 4, 1, 3), tile(2, 1, 2, 3), tile(3, 4, 2, 3)],
      rows: 2,
      aspect: 4 / 3,
    };
  }

  const tiles = [tile(0, 1, 1, 3), tile(1, 4, 1, 3)];
  let row = 2;

  for (let start = 2; start < shown; start += 3, row++) {
    const inRow = Math.min(3, shown - start);
    const span = MOSAIC_COLUMNS / inRow;

    for (let i = 0; i < inRow; i++) tiles.push(tile(start + i, 1 + i * span, row, span));
  }

  const rows = row - 1;

  // Высота ряда — треть ширины: ряды по три плитки квадратные
  return { ...base, tiles, rows, aspect: 3 / rows };
}

export interface TileCorners {
  topLeft: boolean;
  topRight: boolean;
  bottomRight: boolean;
  bottomLeft: boolean;
}

/**
 * Какие углы плитки — углы всей мозаики. Внешние скругляются как карточка, внутренние почти прямые:
 * мозаика читается одним блоком, а не россыпью карточек.
 */
export function outerCorners(tile: MosaicTile, rows: number): TileCorners {
  const top = tile.row === 1;
  const bottom = tile.row + tile.rowSpan - 1 === rows;
  const left = tile.column === 1;
  const right = tile.column + tile.columnSpan - 1 === MOSAIC_COLUMNS;

  return {
    topLeft: top && left,
    topRight: top && right,
    bottomRight: bottom && right,
    bottomLeft: bottom && left,
  };
}

/** Размер мозаики в пределах: по ширине, пока высота влезает */
export function mosaicSize(aspect: number, limits: MediaLimits): MediaSize {
  const width = Math.min(limits.maxWidth, limits.maxHeight * aspect);

  return { width: Math.round(width), height: Math.round(width / aspect) };
}

export type PlaceholderKind = 'image' | 'color' | 'none';

/** Заглушка до загрузки: адрес картинки (data-URI размытого превью) или CSS-цвет (средний цвет) */
export function placeholderKind(value?: string): PlaceholderKind {
  const text = value?.trim();

  if (!text) return 'none';

  return /^(data:image\/|blob:|https?:\/\/|\/|\.\.?\/)/i.test(text) ? 'image' : 'color';
}

interface KindSource {
  kind?: MessageMediaKind;
  type?: string;
  src: string;
  name?: string;
}

const VIDEO_EXTENSION = /\.(mp4|webm|mov|m4v|ogv)$/;

const fileOf = ({ name, src }: KindSource) => (name ?? src).split(/[?#]/)[0]?.toLowerCase() ?? '';

/** Вид вложения: явный `kind`, иначе MIME, data-URI и расширение имени или адреса */
export function mediaKind(source: KindSource): MessageMediaKind {
  if (source.kind) return source.kind;

  const mime = source.type?.toLowerCase() ?? '';
  const src = source.src.toLowerCase();

  if (mime === 'image/gif' || src.startsWith('data:image/gif')) return 'gif';
  if (mime.startsWith('video/') || src.startsWith('data:video/')) return 'video';

  const file = fileOf(source);

  if (file.endsWith('.gif')) return 'gif';
  if (VIDEO_EXTENSION.test(file)) return 'video';

  return 'image';
}

/** GIF роликом (mp4 / webm вместо .gif — так их отдают почти все сервисы): играет `<video>`, а не `<img>` */
export function isVideoSource(source: KindSource): boolean {
  const mime = source.type?.toLowerCase() ?? '';

  return (
    mime.startsWith('video/') ||
    source.src.toLowerCase().startsWith('data:video/') ||
    VIDEO_EXTENSION.test(fileOf(source))
  );
}

/**
 * Номера вложений в просмотрщике: он показывает картинки и GIF, видео играет на месте. -1 — вложения
 * в просмотрщике нет.
 */
export function lightboxIndexes(kinds: readonly MessageMediaKind[]): number[] {
  let next = 0;

  return kinds.map((kind) => (kind === 'video' ? -1 : next++));
}
