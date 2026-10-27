import { useState, type ComponentPropsWithRef } from 'react';

import type { FilteredImageMode } from '../filtered-image/filtered-image';
import { ImageLightbox, type ImageLightboxItem } from '../image-lightbox/image-lightbox';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import {
  fitMedia,
  lightboxIndexes,
  mediaKind,
  mosaicLayout,
  mosaicSize,
  type MediaLimits,
} from './media-layout';
import { MessageMediaTile, type MessageMediaItem } from './message-media-tile';
import styles from './message-media.module.css';

export type { MessageMediaItem } from './message-media-tile';

export interface MessageMediaProps extends Omit<ComponentPropsWithRef<'ul'>, 'children'> {
  items: readonly MessageMediaItem[];
  /** Предельная ширина превью, px; уже контейнера — по контейнеру */
  maxWidth?: number;
  /** Предельная высота превью, px */
  maxHeight?: number;
  /** Шире этого отношения сторон одиночная картинка показывается фрагментом с пометкой */
  maxAspect?: number;
  /** Уже этого — тоже фрагментом */
  minAspect?: number;
  /** Сколько плиток в мозаике; остальные — счётчиком «+N» на последней */
  max?: number;
  /** Превью картинок через `FilteredImage`: `true` — дизеринг, или свой режим */
  filtered?: boolean | FilteredImageMode;
  /** Свой просмотрщик кита по клику; `false` — только `onOpen` */
  lightbox?: boolean;
  /** Клик по вложению (номер в `items`) — до открытия просмотрщика */
  onOpen?: (index: number) => void;
  /** Нажали «повторить» у вложения, которое не загрузилось */
  onRetry?: (index: number) => void;
  /** Подпись списка для скринридера; по умолчанию «Вложения: N» */
  label?: string;
}

const toLightboxItem = (item: MessageMediaItem): ImageLightboxItem => ({
  src: item.src,
  alt: item.alt,
  name: item.name,
  caption: item.caption,
  downloadUrl: item.downloadUrl,
  originalUrl: item.originalUrl,
  width: item.width,
  height: item.height,
});

/**
 * Превью вложений в ленте. Одно — в своих пропорциях в пределах `maxWidth` × `maxHeight`, вытянутое
 * сильнее предела — фрагментом с пометкой; несколько — мозаикой (2, 3, 4, дальше «+N»). Место занято до
 * загрузки по `width` / `height` с сервера, сначала заглушка (`placeholder`), потом проявление. GIF и видео —
 * стоп-кадр со значком и длительностью: GIF играет при наведении и фокусе, видео — по клику на месте;
 * при `data-effects="off"` и reduced-motion GIF стоит. Спойлер размыт до нажатия, ошибка — с повтором. Клик
 * открывает `ImageLightbox` на этом вложении: экрану достаточно передать список. Геометрия —
 * `media-layout.ts`.
 */
export function MessageMedia({
  items,
  maxWidth = 400,
  maxHeight = 300,
  maxAspect,
  minAspect,
  max = 4,
  filtered,
  lightbox = true,
  onOpen,
  onRetry,
  label,
  className,
  style,
  ...rest
}: MessageMediaProps) {
  const text = useUiStrings().messageMedia;
  const [viewer, setViewer] = useState({ open: false, index: 0 });

  if (items.length === 0) return null;

  const limits: MediaLimits = { maxWidth, maxHeight, maxAspect, minAspect };
  const layout = mosaicLayout(items.length, max);
  const kinds = items.map((item) => mediaKind(item));
  const viewerIndex = lightboxIndexes(kinds);
  const viewerItems = items.filter((_, i) => kinds[i] !== 'video').map(toLightboxItem);
  const fit = layout.aspect === 0 ? fitMedia(items[0], limits) : null;
  const size = fit ?? mosaicSize(layout.aspect, limits);
  const lastTile = layout.tiles.length - 1;

  const open = (index: number) => {
    onOpen?.(index);

    const target = viewerIndex[index] ?? -1;

    if (lightbox && target >= 0) setViewer({ open: true, index: target });
  };

  return (
    <>
      <ul
        role="list"
        aria-label={label ?? text.label(items.length)}
        className={cx(styles.root, className)}
        data-layout={layout.tiles.length}
        style={{
          ...style,
          width: `min(100%, ${size.width}px)`,
          aspectRatio: String(fit ? fit.aspect : layout.aspect),
          gridTemplateRows: `repeat(${Math.max(1, layout.rows)}, minmax(0, 1fr))`,
        }}
        {...rest}
      >
        {layout.tiles.map((tile) => {
          const item = items[tile.index]!;

          return (
            <MessageMediaTile
              key={item.id ?? `${tile.index}:${item.src}`}
              item={item}
              kind={kinds[tile.index]!}
              index={tile.index}
              total={items.length}
              tile={tile}
              rows={layout.rows}
              more={tile.index === lastTile ? layout.hidden : 0}
              cropped={Boolean(fit?.cropped)}
              filtered={filtered}
              onOpen={() => open(tile.index)}
              onRetry={() => onRetry?.(tile.index)}
            />
          );
        })}
      </ul>

      {lightbox && viewerItems.length > 0 && (
        <ImageLightbox
          images={viewerItems}
          open={viewer.open}
          onOpenChange={(next) => setViewer((current) => ({ ...current, open: next }))}
          index={viewer.index}
          onIndexChange={(next) => setViewer((current) => ({ ...current, index: next }))}
        />
      )}
    </>
  );
}
