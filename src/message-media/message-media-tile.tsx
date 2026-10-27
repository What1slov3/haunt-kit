import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

import { Crop, EyeOff, ImageOff, Play, RotateCw } from 'lucide-react';

import { Button } from '../button/button';
import type { FilteredImageMode } from '../filtered-image/filtered-image';
import { useFxEnvironment } from '../fx/use-fx-environment';
import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';
import { formatTime } from '../voice-message/voice-math';

import {
  isVideoSource,
  outerCorners,
  placeholderKind,
  type MessageMediaKind,
  type MosaicTile,
} from './media-layout';
import styles from './message-media.module.css';

// Фильтр — canvas, декодер кадров и кэш: в чанк ленты попадает, только когда превью фильтруют
const FilteredImage = lazy(() =>
  import('../filtered-image/filtered-image').then((module) => ({ default: module.FilteredImage })),
);

export interface MessageMediaItem {
  /** Ключ списка; по умолчанию — адрес */
  id?: string;
  /** Картинка, GIF (картинкой или роликом mp4 / webm) или видео; пустая строка — адреса ещё нет: место и заглушка */
  src: string;
  /** Вид; по умолчанию — по `type`, data-URI и расширению */
  kind?: MessageMediaKind;
  /** MIME с сервера */
  type?: string;
  /** Имя файла — подпись без `alt` и имя в просмотрщике */
  name?: string;
  alt?: string;
  /** Размер с сервера: место под превью занято до загрузки, лента не прыгает */
  width?: number;
  height?: number;
  /** Заглушка до загрузки: размытое превью (data-URI) или средний цвет (CSS-цвет) */
  placeholder?: string;
  /** Стоп-кадр GIF и видео; без него у GIF кадр снимается с самой картинки, у видео — первый кадр */
  poster?: string;
  /** Длительность GIF и видео, секунды; у видео без неё — из метаданных */
  duration?: number;
  /** Скрыто размытием, пока не нажмут */
  spoiler?: boolean;
  /** Подпись в просмотрщике */
  caption?: ReactNode;
  /** Что скачивать и открывать из просмотрщика, если не `src` */
  downloadUrl?: string;
  originalUrl?: string;
}

type LoadState = 'loading' | 'loaded' | 'error';

interface MessageMediaTileProps {
  item: MessageMediaItem;
  kind: MessageMediaKind;
  index: number;
  total: number;
  tile: MosaicTile;
  rows: number;
  /** Сколько вложений скрыто за этой плиткой — счётчик «+N» */
  more: number;
  cropped: boolean;
  filtered?: boolean | FilteredImageMode;
  onOpen: () => void;
  onRetry: () => void;
}

const OUTER = 'var(--radius-lg)';
const INNER = 'var(--radius-xs)';

function tileStyle(tile: MosaicTile, rows: number): CSSProperties {
  const corners = outerCorners(tile, rows);

  return {
    gridColumn: `${tile.column} / span ${tile.columnSpan}`,
    gridRow: `${tile.row} / span ${tile.rowSpan}`,
    borderRadius: [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft]
      .map((outer) => (outer ? OUTER : INNER))
      .join(' '),
  };
}

/** Свежие колбэки без перезапуска эффекта загрузки: иначе каждый рендер родителя грузил бы кадр заново */
function useLatest<T>(value: T) {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  });

  return ref;
}

interface StillProps {
  src: string;
  className?: string;
  onLoad: () => void;
  onError: () => void;
}

/**
 * Стоп-кадр GIF без постера: первый кадр, нарисованный в canvas (так рисует drawImage у анимированной
 * картинки). Холст с чужого домена «загрязнён», но показывать его можно — пиксели не читаются.
 */
function GifStill({ src, className, onLoad, onError }: StillProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const callbacks = useLatest({ onLoad, onError });

  useEffect(() => {
    const image = new Image();
    let cancelled = false;

    image.decoding = 'async';
    image.onload = () => {
      if (cancelled) return;

      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d');

      if (canvas && context) {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        context.drawImage(image, 0, 0);
      }

      callbacks.current.onLoad();
    };
    image.onerror = () => {
      if (!cancelled) callbacks.current.onError();
    };
    image.src = src;

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [src, callbacks]);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}

/** Плитка вложения: заглушка, превью, значки и одна кнопка поверх — открыть, показать спойлер, играть */
export function MessageMediaTile({
  item,
  kind,
  index,
  total,
  tile,
  rows,
  more,
  cropped,
  filtered,
  onOpen,
  onRetry,
}: MessageMediaTileProps) {
  const text = useUiStrings().messageMedia;
  const cellRef = useRef<HTMLLIElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { motion } = useFxEnvironment(cellRef);
  // Фильтр рисует себя сам и о загрузке не сообщает — плитка сразу «готова», проявление — его
  const isFiltered = Boolean(filtered) && kind === 'image';
  const [state, setState] = useState<LoadState>(isFiltered && item.src ? 'loaded' : 'loading');
  const [attempt, setAttempt] = useState(0);
  const [revealed, setRevealed] = useState(!item.spoiler);
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [metaDuration, setMetaDuration] = useState<number>();

  const loaded = () => setState('loaded');
  const failed = () => setState('error');
  const gifVideo = kind === 'gif' && isVideoSource(item);
  // GIF играет при наведении и фокусе, только если можно двигаться и спойлер открыт
  const live = kind === 'gif' && active && motion && revealed && state === 'loaded';
  const duration = item.duration ?? metaDuration;
  const placeholder = placeholderKind(item.placeholder);

  useEffect(() => {
    const video = videoRef.current;

    if (!gifVideo || !video) return;

    if (live) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [gifVideo, live]);

  const retry = () => {
    setAttempt((value) => value + 1);
    setState('loading');
    onRetry();
  };

  const press = () => {
    if (!revealed) {
      setRevealed(true);

      return;
    }

    if (!item.src) return;

    if (kind === 'video') setPlaying(true);
    else onOpen();
  };

  const name = item.alt || item.name || text.item(index + 1, total);
  const label = [
    revealed ? name : text.showSpoiler,
    kind === 'gif' && text.gif,
    kind === 'video' && text.video,
    duration !== undefined && formatTime(duration),
    more > 0 && text.more(more),
  ]
    .filter(Boolean)
    .join(', ');

  const imageProps = {
    className: styles.media,
    alt: '',
    draggable: false,
    decoding: 'async' as const,
    onLoad: loaded,
    onError: failed,
  };

  let media: ReactNode = null;

  // Адреса ещё нет (превью считается на сервере, файл грузится) — держим место и заглушку
  if (!item.src) {
    media = null;
  } else if (kind === 'image') {
    const plain = <img key={attempt} src={item.src} loading="lazy" {...imageProps} />;

    media = isFiltered ? (
      <Suspense fallback={plain}>
        <FilteredImage
          src={item.src}
          alt=""
          mode={filtered === true ? 'dither' : (filtered as FilteredImageMode)}
          aspectRatio="auto"
          reveal="none"
          className={styles.media}
        />
      </Suspense>
    ) : (
      plain
    );
  } else if (kind === 'gif' && gifVideo) {
    media = (
      <video
        key={attempt}
        ref={videoRef}
        src={item.src}
        poster={item.poster}
        className={styles.media}
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
        onLoadedData={loaded}
        onError={failed}
      />
    );
  } else if (kind === 'gif') {
    media = (
      <>
        {item.poster ? (
          <img key={attempt} src={item.poster} {...imageProps} />
        ) : (
          <GifStill
            key={attempt}
            src={item.src}
            className={styles.media}
            onLoad={loaded}
            onError={failed}
          />
        )}

        {live && <img src={item.src} alt="" className={styles.live} draggable={false} />}
      </>
    );
  } else if (playing) {
    media = (
      <video
        key={attempt}
        src={item.src}
        className={styles.player}
        controls
        autoPlay
        playsInline
        onError={failed}
      />
    );
  } else if (item.poster) {
    media = <img key={attempt} src={item.poster} {...imageProps} />;
  } else {
    // Без постера — первый кадр самого ролика: preload="metadata" Chromium хватает, чтобы нарисовать его
    media = (
      <video
        key={attempt}
        src={item.src}
        className={styles.media}
        muted
        playsInline
        preload="metadata"
        aria-hidden
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;

          if (Number.isFinite(value)) setMetaDuration(value);
        }}
        onLoadedData={loaded}
        onError={failed}
      />
    );
  }

  return (
    <li
      ref={cellRef}
      className={styles.cell}
      style={tileStyle(tile, rows)}
      data-kind={kind}
      data-state={state}
      data-spoiler={!revealed || undefined}
      data-playing={playing || live || undefined}
    >
      <div className={styles.frame}>
        {placeholder === 'color' && (
          <span className={styles.placeholder} style={{ background: item.placeholder }} />
        )}

        {placeholder === 'image' && (
          <span className={styles.placeholder}>
            <img src={item.placeholder} alt="" className={styles.placeholderImage} />
          </span>
        )}

        {media}
      </div>

      {state === 'error' ? (
        <div className={styles.error}>
          <Icon icon={ImageOff} className={styles.errorIcon} />

          <span>{text.loadFailed}</span>

          <Button
            size="sm"
            variant="secondary"
            iconStart={<Icon icon={RotateCw} size="xs" />}
            onClick={retry}
          >
            {text.retry}
          </Button>
        </div>
      ) : (
        !playing && (
          <button
            type="button"
            className={cx(styles.hit, more > 0 && styles.hasMore)}
            aria-label={label}
            onClick={press}
            onPointerEnter={() => setActive(true)}
            onPointerLeave={() => setActive(false)}
            onFocus={() => setActive(true)}
            onBlur={() => setActive(false)}
          >
            {revealed && kind === 'gif' && (
              <span className={cx(styles.badge, styles.kindBadge)} aria-hidden>
                {text.gif}
              </span>
            )}

            {revealed && kind === 'video' && (
              <span className={styles.play} aria-hidden>
                <Icon icon={Play} size="md" />
              </span>
            )}

            {revealed && duration !== undefined && kind !== 'image' && (
              <span className={cx(styles.badge, styles.durationBadge)} aria-hidden>
                {formatTime(duration)}
              </span>
            )}

            {revealed && cropped && (
              <span className={cx(styles.badge, styles.croppedBadge)} aria-hidden>
                <Icon icon={Crop} size="xs" />
                {text.cropped}
              </span>
            )}

            {!revealed && (
              <span className={styles.spoiler} aria-hidden>
                <Icon icon={EyeOff} size="xs" />
                {text.spoiler}
              </span>
            )}

            {revealed && more > 0 && (
              <span className={styles.more} aria-hidden>
                +{more}
              </span>
            )}
          </button>
        )
      )}
    </li>
  );
}
