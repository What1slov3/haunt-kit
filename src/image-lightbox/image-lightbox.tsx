import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  ImageOff,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Dialog as RadixDialog, VisuallyHidden } from 'radix-ui';

import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { useReturnFocus } from '../lib/use-return-focus';
import { Spinner } from '../spinner/spinner';
import { useUiStrings } from '../strings/ui-strings-context';
import { usePortalContainer } from '../theme/portal-container';

import {
  DOUBLE_CLICK_SCALE,
  fitSize,
  IDENTITY,
  isZoomed,
  MAX_SCALE,
  panBy,
  wheelFactor,
  ZOOM_STEP,
  zoomAt,
  type Point,
  type Size,
  type View,
} from './lightbox-math';

import styles from './image-lightbox.module.css';

export interface ImageLightboxItem {
  src: string;
  alt?: string;
  /** Подпись под картинкой; она же описание диалога для скринридера */
  caption?: ReactNode;
  /** Имя файла — в шапке и для «скачать» */
  name?: string;
  /** Что скачивать, если не `src` (оригинал вместо превью) */
  downloadUrl?: string;
  /** Что открыть в новой вкладке, если не `src` */
  originalUrl?: string;
  /** Размер, если известен заранее: картинка встаёт на место до загрузки */
  width?: number;
  height?: number;
}

export interface ImageLightboxProps {
  images: readonly ImageLightboxItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Текущая картинка — управляемо; без него — `defaultIndex` и своё состояние */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
}

interface Loaded {
  src: string;
  natural?: Size;
  failed?: boolean;
}

function useStageSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}

/**
 * Просмотр вложений на весь экран: затемнение с размытием, галерея (← / →, счётчик `2 / 5`), масштаб колесом
 * к курсору, кнопками, `+` / `-` / `0` и двойным кликом, панорама перетаскиванием при увеличении. Esc сначала
 * сбрасывает масштаб, второй — закрывает. «Скачать» и «открыть оригинал» — ссылки. Зум и сдвиг — только
 * transform; геометрия — lightbox-math.ts.
 */
export function ImageLightbox({ images, open, onOpenChange, ...rest }: ImageLightboxProps) {
  const container = usePortalContainer();

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal container={container}>
        <RadixDialog.Overlay className={styles.overlay} />

        {images.length > 0 && <LightboxContent images={images} {...rest} />}
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

function LightboxContent({
  images,
  index: controlledIndex,
  defaultIndex = 0,
  onIndexChange,
}: Omit<ImageLightboxProps, 'open' | 'onOpenChange'>) {
  const strings = useUiStrings();
  const text = strings.imageLightbox;
  const [innerIndex, setInnerIndex] = useState(defaultIndex);
  const index = Math.min(Math.max(controlledIndex ?? innerIndex, 0), images.length - 1);
  const item = images[index]!;
  const [stageRef, stage] = useStageSize();
  // Вид и загрузка привязаны к картинке: сменилась — сброс без эффекта (состояние другой картинки не читается)
  const [zoom, setZoom] = useState<{ index: number; view: View }>({ index, view: IDENTITY });
  const [loaded, setLoaded] = useState<Loaded>({ src: '' });
  const [dragging, setDragging] = useState(false);
  // Просмотр открывают миниатюры сообщения, а не Dialog.Trigger: без этого фокус после закрытия падал на <body>
  const returnFocus = useReturnFocus();
  const drag = useRef<{ pointer: Point; view: View } | null>(null);
  const captionId = useId();

  const view = zoom.index === index ? zoom.view : IDENTITY;
  const current = loaded.src === item.src ? loaded : { src: item.src };
  const natural =
    current.natural ??
    (item.width && item.height ? { width: item.width, height: item.height } : undefined);
  const image = natural ? fitSize(natural, stage) : { width: 0, height: 0 };
  const ready = Boolean(current.natural) && !current.failed;

  const setView = (next: View) => setZoom({ index, view: next });

  const go = (next: number) => {
    if (next < 0 || next >= images.length || next === index) return;

    if (controlledIndex === undefined) setInnerIndex(next);

    onIndexChange?.(next);
  };

  // Соседние картинки — заранее, чтобы листание не ждало сети
  useEffect(() => {
    for (const neighbour of [images[index - 1], images[index + 1]]) {
      if (neighbour) new Image().src = neighbour.src;
    }
  }, [images, index]);

  /** Точка события относительно центра сцены */
  const pointOf = (event: { clientX: number; clientY: number }): Point => {
    const rect = stageRef.current?.getBoundingClientRect();

    if (!rect) return { x: 0, y: 0 };

    return {
      x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2,
    };
  };

  // Колесо — нативным слушателем: у React он пассивный, и Ctrl+колесо (щипок тачпада) зумило бы страницу
  const wheel = useRef<(event: WheelEvent) => void>(null);

  wheel.current = (event: WheelEvent) => {
    if (!ready) return;

    event.preventDefault();
    setView(
      zoomAt(
        view,
        view.scale * wheelFactor(event.deltaY, event.deltaMode),
        pointOf(event),
        image,
        stage,
      ),
    );
  };

  useEffect(() => {
    const element = stageRef.current;

    if (!element) return;

    const listener = (event: WheelEvent) => wheel.current?.(event);

    element.addEventListener('wheel', listener, { passive: false });

    return () => element.removeEventListener('wheel', listener);
  }, [stageRef]);

  const zoomBy = (factor: number) =>
    setView(zoomAt(view, view.scale * factor, { x: 0, y: 0 }, image, stage));

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || view.scale === 1) return;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Указатель уже отпущен или отменён (NotFoundError) — тянем без захвата
    }

    drag.current = { pointer: { x: event.clientX, y: event.clientY }, view };
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;

    if (!start) return;

    setView(
      panBy(
        start.view,
        { x: event.clientX - start.pointer.x, y: event.clientY - start.pointer.y },
        image,
        stage,
      ),
    );
  };

  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') go(index - 1);
    else if (event.key === 'ArrowRight') go(index + 1);
    else if (ready && (event.key === '+' || event.key === '=')) zoomBy(ZOOM_STEP);
    else if (ready && event.key === '-') zoomBy(1 / ZOOM_STEP);
    else if (event.key === '0') setView(IDENTITY);
    else return;

    event.preventDefault();
  };

  return (
    <RadixDialog.Content
      className={styles.content}
      aria-describedby={item.caption ? captionId : undefined}
      onKeyDown={onKeyDown}
      onOpenAutoFocus={(event) => {
        // Фокус — на сам слой, а не на первую кнопку: стрелки и Esc работают сразу, без кольца на «Закрыть»
        returnFocus.remember();
        event.preventDefault();
        (event.currentTarget as HTMLElement | null)?.focus();
      }}
      onCloseAutoFocus={returnFocus.restore}
      onEscapeKeyDown={(event) => {
        // Первое Esc — сброс масштаба, второе — закрыть
        if (!isZoomed(view)) return;

        event.preventDefault();
        setView(IDENTITY);
      }}
    >
      <VisuallyHidden.Root asChild>
        <RadixDialog.Title>{item.name ?? item.alt ?? text.title}</RadixDialog.Title>
      </VisuallyHidden.Root>

      <div className={styles.bar}>
        <span
          className={styles.counter}
          aria-live="polite"
          aria-label={text.position(index + 1, images.length)}
        >
          {index + 1} / {images.length}
        </span>

        {item.name && <span className={styles.name}>{item.name}</span>}

        <span className={styles.tools}>
          <IconButton
            label={text.zoomOut}
            size="sm"
            disabled={!ready || view.scale <= 1}
            onClick={() => zoomBy(1 / ZOOM_STEP)}
          >
            <Icon icon={ZoomOut} size="sm" />
          </IconButton>

          <button
            type="button"
            className={styles.scale}
            aria-label={text.zoomReset}
            disabled={!isZoomed(view)}
            onClick={() => setView(IDENTITY)}
          >
            {Math.round(view.scale * 100)}%
          </button>

          <IconButton
            label={text.zoomIn}
            size="sm"
            disabled={!ready || view.scale >= MAX_SCALE}
            onClick={() => zoomBy(ZOOM_STEP)}
          >
            <Icon icon={ZoomIn} size="sm" />
          </IconButton>

          <span className={styles.divider} aria-hidden />

          <IconButton label={text.download} size="sm" asChild>
            <a href={item.downloadUrl ?? item.src} download={item.name ?? ''}>
              <Icon icon={Download} size="sm" />
            </a>
          </IconButton>

          <IconButton label={text.openOriginal} size="sm" asChild>
            <a href={item.originalUrl ?? item.src} target="_blank" rel="noopener noreferrer">
              <Icon icon={ExternalLink} size="sm" />
            </a>
          </IconButton>

          <RadixDialog.Close asChild>
            <IconButton label={text.close} size="sm">
              <Icon icon={X} size="sm" />
            </IconButton>
          </RadixDialog.Close>
        </span>
      </div>

      <div
        ref={stageRef}
        className={styles.stage}
        data-zoomed={view.scale > 1 || undefined}
        data-dragging={dragging || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={(event) => {
          if (!ready) return;

          setView(
            view.scale > 1
              ? IDENTITY
              : zoomAt(view, DOUBLE_CLICK_SCALE, pointOf(event), image, stage),
          );
        }}
      >
        {!current.failed && (
          <img
            key={item.src}
            src={item.src}
            alt={item.alt ?? ''}
            className={styles.image}
            draggable={false}
            data-ready={ready || undefined}
            data-scale={view.scale}
            style={{
              width: image.width || undefined,
              height: image.height || undefined,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            }}
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;

              setLoaded({ src: item.src, natural: { width: naturalWidth, height: naturalHeight } });
            }}
            onError={() => setLoaded({ src: item.src, failed: true })}
          />
        )}

        {!ready && !current.failed && (
          <Spinner size="lg" className={styles.status} label={text.loading} />
        )}

        {current.failed && (
          <span className={styles.status} role="alert">
            <Icon icon={ImageOff} size="xl" />
            {text.loadFailed}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <>
          <IconButton
            label={text.previous}
            variant="secondary"
            shape="circle"
            className={styles.prev}
            disabled={index === 0}
            onClick={() => go(index - 1)}
          >
            <Icon icon={ChevronLeft} />
          </IconButton>

          <IconButton
            label={text.next}
            variant="secondary"
            shape="circle"
            className={styles.next}
            disabled={index === images.length - 1}
            onClick={() => go(index + 1)}
          >
            <Icon icon={ChevronRight} />
          </IconButton>
        </>
      )}

      {item.caption && (
        <div id={captionId} className={styles.caption}>
          {item.caption}
        </div>
      )}
    </RadixDialog.Content>
  );
}
