import {
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type Ref,
} from 'react';

import { ImageOff, ZoomIn, ZoomOut } from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';

import { Icon } from '../icon/icon';
import { wheelFactor } from '../image-lightbox/lightbox-math';
import { IconButton } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import { Slider } from '../slider/slider';
import { Spinner } from '../spinner/spinner';
import { useUiStrings } from '../strings/ui-strings-context';

import { exportCrop, type CropExportOptions, type CropMask } from './crop-export';
import {
  CENTERED,
  DEFAULT_MAX_SCALE,
  ZOOM_STEP,
  clampCrop,
  cropTransform,
  panCrop,
  zoomCrop,
  type Crop,
  type Point,
  type Size,
} from './crop-math';
import styles from './image-cropper.module.css';

export type ImageCropperExportOptions = CropExportOptions;

export interface ImageCropperHandle {
  /** Текущий кадр с ограничениями: картинка закрывает маску */
  getCrop: () => Crop;
  /** Кадр в Blob через canvas; до загрузки картинки — отказ */
  exportImage: (options?: ImageCropperExportOptions) => Promise<Blob>;
  /** Вернуть кадр по центру без увеличения */
  reset: () => void;
}

export interface ImageCropperProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'defaultValue' | 'onChange' | 'onLoad' | 'onError' | 'ref'
> {
  /** Картинка: адрес или выбранный файл (`File` — это `Blob`) */
  src: string | Blob;
  /** Форма маски: круг — аватар, скругление — иконка пространства, квадрат — без скругления */
  mask?: CropMask;
  /** Ширина к высоте маски; по умолчанию 1 */
  aspect?: number;
  /** Ширина маски на экране, px; по умолчанию 240 */
  size?: number;
  /** Кадр — управляемо; без него — `defaultValue` и своё состояние */
  value?: Crop;
  defaultValue?: Crop;
  onValueChange?: (crop: Crop) => void;
  /** Предел увеличения над покрытием; по умолчанию 4 */
  maxScale?: number;
  /** Ползунок и кнопки масштаба под областью; по умолчанию да */
  controls?: boolean;
  /** Для картинки с другого домена: без CORS canvas «пачкается» и экспорт откажет */
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
  alt?: string;
  /** Подписи поверх словаря */
  label?: string;
  zoomLabel?: string;
  zoomInLabel?: string;
  zoomOutLabel?: string;
  /** Картинка загрузилась — её исходный размер */
  onImageLoad?: (natural: Size) => void;
  onImageError?: () => void;
  ref?: Ref<ImageCropperHandle>;
}

interface Loaded {
  url: string;
  natural?: Size;
  failed?: boolean;
}

/** Шаг стрелок в экранных пикселях; с Shift — крупный */
const ARROW_STEP = 8;
const ARROW_STEP_LARGE = 40;

/** Адрес картинки: для файла — object URL на время показа, отзывается при смене и размонтировании */
function useImageUrl(src: string | Blob): string | undefined {
  const [blobUrl, setBlobUrl] = useState<{ blob: Blob; url: string } | null>(null);

  useEffect(() => {
    if (typeof src === 'string') return;

    const url = URL.createObjectURL(src);

    setBlobUrl({ blob: src, url });

    return () => URL.revokeObjectURL(url);
  }, [src]);

  if (typeof src === 'string') return src;

  return blobUrl?.blob === src ? blobUrl.url : undefined;
}

/**
 * Обрезка аватара и иконки пространства: картинка под маской (круг, скругление, квадрат), вне маски —
 * затемнение. Сдвиг — перетаскиванием и стрелками (Shift — крупный шаг), масштаб — колесом к курсору,
 * ползунком, кнопками, `+` / `-`, `0` — сброс. Картинка всегда закрывает маску. Кадр — `{ x, y, scale }` в
 * долях картинки (`onValueChange`, `ref.getCrop()`), не в пикселях экрана; файл —
 * `ref.exportImage({ size, type, quality })`. Движется только transform, геометрия — crop-math.ts.
 */
export function ImageCropper({
  src,
  mask = 'circle',
  aspect = 1,
  size = 240,
  value,
  defaultValue,
  onValueChange,
  maxScale = DEFAULT_MAX_SCALE,
  controls = true,
  crossOrigin,
  alt = '',
  label,
  zoomLabel,
  zoomInLabel,
  zoomOutLabel,
  onImageLoad,
  onImageError,
  className,
  style,
  ref,
  ...rest
}: ImageCropperProps) {
  const strings = useUiStrings().imageCropper;
  const url = useImageUrl(src);
  const hintId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ pointer: Point; crop: Crop } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loaded, setLoaded] = useState<Loaded>({ url: '' });
  // Кадр привязан к картинке: сменилась — снова по центру, без эффекта
  const [inner, setInner] = useState<{ url?: string; crop: Crop }>({
    url,
    crop: defaultValue ?? CENTERED,
  });

  const current = loaded.url === url ? loaded : { url: url ?? '' };
  const natural = current.natural;
  const ready = Boolean(natural) && !current.failed;
  const maskSize: Size = { width: size, height: size / (aspect > 0 ? aspect : 1) };
  const raw = value ?? (inner.url === url ? inner.crop : (defaultValue ?? CENTERED));
  const crop = natural ? clampCrop(raw, natural, aspect, maxScale) : raw;
  const view = natural ? cropTransform(crop, natural, maskSize) : null;

  const commit = (next: Crop) => {
    if (value === undefined) setInner({ url, crop: next });

    onValueChange?.(next);
  };

  const latest = useRef({ crop, natural, commit, maskSize, maxScale, aspect });

  useLayoutEffect(() => {
    latest.current = { crop, natural, commit, maskSize, maxScale, aspect };
  });

  useImperativeHandle(ref, () => ({
    getCrop: () => latest.current.crop,
    exportImage: (options) => {
      const image = imageRef.current;
      const { crop: frame, natural: size, aspect: ratio } = latest.current;

      if (!image || !size) return Promise.reject(new Error('Image is not loaded'));

      return exportCrop(image, size, frame, ratio, options);
    },
    reset: () => latest.current.commit(CENTERED),
  }));

  /** Масштаб кнопками, ползунком и клавишами — к центру маски */
  const zoomTo = (scale: number) => {
    if (natural) commit(zoomCrop(crop, scale, { x: 0, y: 0 }, natural, maskSize, maxScale));
  };

  // Колесо — нативным слушателем: у React он пассивный, и страница прокручивалась бы вместе с масштабом.
  // Точка — от центра области, он же центр маски

  useEffect(() => {
    const element = stageRef.current;

    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      const state = latest.current;

      if (!state.natural) return;

      event.preventDefault();

      const rect = element.getBoundingClientRect();

      state.commit(
        zoomCrop(
          state.crop,
          state.crop.scale * wheelFactor(event.deltaY, event.deltaMode),
          {
            x: event.clientX - rect.left - rect.width / 2,
            y: event.clientY - rect.top - rect.height / 2,
          },
          state.natural,
          state.maskSize,
          state.maxScale,
        ),
      );
    };

    element.addEventListener('wheel', onWheel, { passive: false });

    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !ready) return;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Указатель уже отпущен или отменён (NotFoundError) — тянем без захвата
    }

    drag.current = { pointer: { x: event.clientX, y: event.clientY }, crop };
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;

    if (!start || !natural) return;

    commit(
      panCrop(
        start.crop,
        { x: event.clientX - start.pointer.x, y: event.clientY - start.pointer.y },
        natural,
        maskSize,
        maxScale,
      ),
    );
  };

  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!natural || event.target !== event.currentTarget) return;

    const step = event.shiftKey ? ARROW_STEP_LARGE : ARROW_STEP;
    const arrows: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const arrow = arrows[event.key];

    if (arrow) commit(panCrop(crop, arrow, natural, maskSize, maxScale));
    else if (event.key === '+' || event.key === '=') zoomTo(crop.scale * ZOOM_STEP);
    else if (event.key === '-') zoomTo(crop.scale / ZOOM_STEP);
    else if (event.key === '0') commit(CENTERED);
    else return;

    event.preventDefault();
  };

  return (
    <div
      className={cx(styles.root, className)}
      style={
        {
          '--crop-width': `${maskSize.width}px`,
          '--crop-height': `${maskSize.height}px`,
          ...style,
        } as CSSProperties
      }
      {...rest}
    >
      <div
        ref={stageRef}
        role="group"
        tabIndex={0}
        aria-label={label ?? strings.label}
        aria-describedby={hintId}
        aria-busy={!ready && !current.failed ? true : undefined}
        className={styles.stage}
        data-mask={mask}
        data-ready={ready || undefined}
        data-dragging={dragging || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        {url && !current.failed && (
          <img
            key={url}
            ref={imageRef}
            src={url}
            alt={alt}
            crossOrigin={crossOrigin}
            draggable={false}
            className={styles.image}
            style={
              view
                ? {
                    width: view.width,
                    height: view.height,
                    transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                  }
                : undefined
            }
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              const size = { width: naturalWidth, height: naturalHeight };

              setLoaded({ url, natural: size });
              onImageLoad?.(size);
            }}
            onError={() => {
              setLoaded({ url, failed: true });
              onImageError?.();
            }}
          />
        )}

        <div className={styles.mask} aria-hidden />

        {!ready && !current.failed && (
          <Spinner size="lg" className={styles.spinner} label={strings.loading} />
        )}

        {current.failed && (
          <span className={styles.status} role="alert">
            <Icon icon={ImageOff} size="xl" />
            {strings.loadFailed}
          </span>
        )}

        <VisuallyHidden.Root id={hintId}>{strings.hint}</VisuallyHidden.Root>
      </div>

      {controls && (
        <div className={styles.controls}>
          <IconButton
            label={zoomOutLabel ?? strings.zoomOut}
            size="sm"
            disabled={!ready || crop.scale <= 1}
            onClick={() => zoomTo(crop.scale / ZOOM_STEP)}
          >
            <Icon icon={ZoomOut} size="sm" />
          </IconButton>

          <Slider
            className={styles.slider}
            min={1}
            max={maxScale}
            step={0.01}
            value={[crop.scale]}
            disabled={!ready}
            label={zoomLabel ?? strings.zoom}
            onValueChange={([scale]) => {
              if (scale !== undefined) zoomTo(scale);
            }}
          />

          <IconButton
            label={zoomInLabel ?? strings.zoomIn}
            size="sm"
            disabled={!ready || crop.scale >= maxScale}
            onClick={() => zoomTo(crop.scale * ZOOM_STEP)}
          >
            <Icon icon={ZoomIn} size="sm" />
          </IconButton>

          <span className={styles.value} aria-hidden>
            {strings.zoomValue(Math.round(crop.scale * 100))}
          </span>
        </div>
      )}
    </div>
  );
}
