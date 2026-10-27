import { useEffect, useRef, useState, type ComponentPropsWithRef, type CSSProperties } from 'react';

import type { FxRenderer } from '../fx/environment';
import { pickRenderer } from '../fx/renderer';
import { schedule, type FxHandle } from '../fx/scheduler';
import { useFxEnvironment } from '../fx/use-fx-environment';
import { detectWebgl2, isWebglUsable, onWebglStateChange } from '../fx/webgl/support';
import { cx } from '../lib/cx';
import { radiusVar, type Radius } from '../lib/space';
import { assignRef } from '../lib/assign-ref';

import { decodeAnimated } from './animated-decoder';
import styles from './filtered-image.module.css';
import { getFrame } from './frame-cache';
import type { Rgb } from './image-filters';
import { detectMediaKind, shouldSkipVideoFrame, type MediaKind } from './media-source';
import {
  DEFAULT_CELL,
  isExtendedMode,
  modeStrategy,
  type FilteredImageMode,
  type FilteredImageOptions,
} from './modes';
import { readColors } from './read-palette';
import type { ExtendedRender } from './render-extended';
import { renderFrame, renderOriginal, type FrameParams, type FrameSurfaces } from './render-frame';

export type { FilteredImageMode, FilteredImageOptions } from './modes';

/** Что происходит под курсором: проступает оригинал, ячейки мельчают (у rgb-split — сдвиг сильнее) или ничего */
export type FilteredImageReveal = 'original' | 'finer' | 'none';

/** Вид источника: по умолчанию — по расширению или MIME (`auto`), для `blob:` — явно */
export type FilteredImageMedia = 'auto' | MediaKind;

export interface FilteredImageProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Источник: свой origin, data: или blob: — иначе canvas не прочитает пиксели (нужен CORS) */
  src: string;
  /** Подпись для скринридера; изображение остаётся в разметке и при включённом фильтре */
  alt: string;
  /**
   * pixel, dither (Байер), ascii; floyd, atkinson (диффузия ошибки), halftone, duotone, gradient-map,
   * posterize, threshold, braille, dot-matrix, led, crt, rgb-split, pixel-sort, contour, edge, thermal.
   * Как устроен каждый — README.md рядом
   */
  mode?: FilteredImageMode;
  /** Настройки режима: угол растра, уровни, порог, свои цвета дуотона */
  options?: FilteredImageOptions;
  /**
   * `animated` — GIF / WebP / APNG: фильтр идёт покадрово (нужен ImageDecoder; без него — первый кадр),
   * `video` — mp4 / webm без звука по кругу. `auto` — по расширению или MIME у `data:`
   */
  media?: FilteredImageMedia;
  /** Ячейка в CSS px: пиксель (pixel — 8), точка (dither — 3), кегль символа (ascii — 10); у режима свой смысл */
  cell?: number;
  /** Пропорции рамки, если высоту не задаёт родитель; по умолчанию — пропорции самого изображения */
  aspectRatio?: CSSProperties['aspectRatio'];
  /** Реакция на курсор; гаснет при data-effects="off" и prefers-reduced-motion. По умолчанию original, у rgb-split — finer */
  reveal?: FilteredImageReveal;
  /** «Проявление» из крупных ячеек при первом показе на экране */
  appear?: boolean;
  /** Скругление по шкале `--radius-*` */
  radius?: Radius;
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
}

// Палитра дизеринга, фон под прозрачным и цвет символов — токены из tokens.css (блок `*`)
const colorTokens = [
  '--image-dither-1',
  '--image-dither-2',
  '--image-dither-3',
  '--image-dither-4',
  '--background',
  '--image-ascii-color',
] as const;

/** Множители ячейки для «проявления»: 5 кадров по 70 мс — меньше полсекунды, крупные кадры дешёвые */
const appearSteps = [6, 4, 2.5, 1.6, 1];
const appearStepMs = 70;

/** Линза под курсором по уровню эффектов: rich — шире и полностью прозрачна к оригиналу */
const lensByLevel = {
  subtle: { radius: 64, strength: 0.75 },
  rich: { radius: 112, strength: 1 },
} as const;

interface Source {
  image: CanvasImageSource;
  width: number;
  height: number;
}

interface Scene {
  base: HTMLCanvasElement | null;
  lens: HTMLCanvasElement | null;
  params: FrameParams | null;
  pointer: { x: number; y: number } | null;
  appeared: boolean;
  /** Блок «проявления» новых режимов в физических px: готовый кадр показывается крупными пикселями; 0 — как есть */
  coarse: number;
  /** Текущий кадр анимации или видео; null — источник статичен или анимация ещё не разобрана */
  live: Source | null;
  /** Номер кадра GIF: смена темы перезапускает эффект, а анимация продолжается с того же места */
  frameIndex: number;
  /** Переиспользуемые холсты покадровой отрисовки — кадра и линзы */
  surfaces: FrameSurfaces;
  lensSurfaces: FrameSurfaces;
}

let lensCanvas: HTMLCanvasElement | null = null;
let coarseCanvas: HTMLCanvasElement | null = null;

/** Один рабочий холст линзы на все экземпляры: курсор бывает только над одним изображением */
function lensSurface(size: number): CanvasRenderingContext2D | null {
  lensCanvas ??= document.createElement('canvas');

  if (lensCanvas.width !== size) {
    lensCanvas.width = size;
    lensCanvas.height = size;
  }

  return lensCanvas.getContext('2d');
}

/** Готовый кадр крупными блоками: уменьшить со сглаживанием и растянуть без него — один холст на все */
function drawCoarse(ctx: CanvasRenderingContext2D, frame: HTMLCanvasElement, block: number) {
  const width = Math.max(1, Math.round(frame.width / block));
  const height = Math.max(1, Math.round(frame.height / block));

  coarseCanvas ??= document.createElement('canvas');
  coarseCanvas.width = width;
  coarseCanvas.height = height;

  const small = coarseCanvas.getContext('2d');

  if (!small) return;

  small.imageSmoothingEnabled = true;
  small.imageSmoothingQuality = 'high';
  small.drawImage(frame, 0, 0, width, height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(coarseCanvas, 0, 0, width, height, 0, 0, frame.width, frame.height);
  ctx.imageSmoothingEnabled = true;
}

function frameKey(kind: string, src: string, params: FrameParams, renderer: FxRenderer): string {
  return [
    kind,
    params.mode,
    renderer,
    params.width,
    params.height,
    params.devicePixelRatio,
    params.cell,
    params.palette.flat().join(','),
    params.background.join(','),
    params.foreground.join(','),
    params.fontFamily,
    params.options ? JSON.stringify(params.options) : '',
    params.colors?.flat().join(',') ?? '',
    src,
  ].join('|');
}

const supportsVideoFrameCallback = () =>
  typeof HTMLVideoElement !== 'undefined' &&
  'requestVideoFrameCallback' in HTMLVideoElement.prototype;

/** Свои цвета шкалы читаются тем же пробным элементом, что и токены: `--accent` или любой CSS-цвет */
function readOptionColors(
  root: Element,
  options: FilteredImageOptions | undefined,
): Rgb[] | undefined {
  if (!options?.colors?.length) return undefined;

  return readColors(root, options.colors, [0, 0, 0]);
}

/**
 * Изображение через фильтр: пиксели, дизеринг, ASCII и ещё 16 режимов — от растра и CRT до изолиний.
 * Статичный кадр рисуется на canvas один раз и кэшируется; GIF и видео фильтруются покадрово в общем
 * цикле кадров (`fx/scheduler`), вне экрана и на скрытой вкладке кадры не считаются. Часть режимов
 * считается шейдером WebGL2 с запасным Canvas 2D (`data-fx-renderer` задаёт путь принудительно).
 * Под курсором проступает оригинал, при появлении — короткое «проявление». `data-effects="off"` —
 * обычное изображение или видео, `prefers-reduced-motion` — статичный первый кадр. Как устроено — README.md рядом.
 */
export function FilteredImage({
  src,
  alt,
  mode = 'dither',
  options,
  media = 'auto',
  cell,
  aspectRatio,
  reveal,
  appear = true,
  radius = 'lg',
  crossOrigin,
  className,
  style,
  ref,
  ...rest
}: FilteredImageProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scene = useRef<Scene>({
    base: null,
    lens: null,
    params: null,
    pointer: null,
    appeared: false,
    coarse: 0,
    live: null,
    frameIndex: 0,
    surfaces: {},
    lensSurfaces: {},
  });
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);
  const [painted, setPainted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [usedRenderer, setUsedRenderer] = useState<FxRenderer | null>(null);
  const [glVersion, setGlVersion] = useState(0);
  const {
    effects,
    reducedMotion,
    renderer: forcedRenderer,
    themeVersion,
  } = useFxEnvironment(rootRef);

  const kind: MediaKind = media === 'auto' ? detectMediaKind(src) : media;
  const active = effects !== 'off' && failedSrc !== src;
  const loaded = loadedSrc === src;
  const cellSize = cell ?? DEFAULT_CELL[mode];
  const revealMode = reveal ?? (mode === 'rgb-split' ? 'finer' : 'original');
  const hasShader = modeStrategy(mode).webgl !== undefined;
  // Ключ настроек вместо объекта: `options={{ angle: 30 }}` в разметке — новый объект на каждый рендер
  const optionsKey = options ? JSON.stringify(options) : '';

  const setRoot = (node: HTMLDivElement | null) => {
    rootRef.current = node;

    assignRef(ref, node);
  };

  // Потеря и восстановление общего WebGL-контекста перезапускают кадр: по запасному пути и обратно
  useEffect(() => {
    if (!hasShader) return;

    return onWebglStateChange(() => setGlVersion((version) => version + 1));
  }, [hasShader]);

  // Видео без фильтра играет само; при reduced-motion стоит на первом кадре — и с фильтром, и без
  useEffect(() => {
    const video = videoRef.current;

    if (kind !== 'video' || !video) return;

    if (reducedMotion) {
      video.pause();
      video.currentTime = 0;
    } else {
      void video.play().catch(() => undefined);
    }
  }, [kind, reducedMotion, loaded]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const element = kind === 'video' ? videoRef.current : imageRef.current;

    if (!active || !loaded || !root || !canvas || !element) return;

    const state = scene.current;
    const lens = lensByLevel[effects === 'rich' ? 'rich' : 'subtle'];
    const extended = isExtendedMode(mode);
    // Детект создаёт контекст — только для режимов с шейдером
    const renderer = pickRenderer(modeStrategy(mode), {
      override: forcedRenderer,
      support: hasShader ? detectWebgl2() : 'none',
      webglUsable: hasShader && isWebglUsable(),
    });
    // Путь static — один кадр: без проявления, линзы и покадровой анимации, как при reduced-motion
    const still = reducedMotion || renderer === 'static';
    const reactive = revealMode !== 'none' && !still;
    const animate = kind !== 'image' && !still;
    const parsedOptions = optionsKey ? (JSON.parse(optionsKey) as FilteredImageOptions) : undefined;
    let draw: ExtendedRender | null = null;
    let cancelled = false;
    let appearing = false;
    let started = false;
    let timer = 0;
    let frame = 0;
    let playback: FxHandle | null = null;
    let videoHandle = 0;
    let lastVideoFrame = 0;
    let lastRenderer: FxRenderer = renderer;

    // Ядра новых режимов (и шейдеры для пути webgl) — отдельным чанком, при первом кадре
    const ready: Promise<void> = extended
      ? import('./render-extended')
          .then((module) => module.prepareExtended(renderer))
          .then((render) => {
            draw = render;
          })
      : Promise.resolve();

    const renderWith = (
      image: CanvasImageSource,
      width: number,
      height: number,
      params: FrameParams,
      surfaces?: FrameSurfaces,
    ): HTMLCanvasElement => {
      if (!draw) {
        lastRenderer = renderer === 'static' ? 'static' : 'canvas';

        return renderFrame(image, width, height, params, surfaces);
      }

      const result = draw(image, width, height, params, surfaces);

      lastRenderer = renderer === 'static' ? 'static' : result.renderer;

      return result.frame;
    };

    const stillSource = (): Source =>
      element instanceof HTMLVideoElement
        ? { image: element, width: element.videoWidth, height: element.videoHeight }
        : { image: element, width: element.naturalWidth, height: element.naturalHeight };

    const source = (): Source => state.live ?? stillSource();

    // Кэш — только у кадра, который не меняется: статичная картинка и первый кадр GIF до разбора
    const cacheable = () => kind === 'image' || (kind === 'animated' && !state.live);

    const readParams = (multiplier: number): FrameParams | null => {
      const width = root.clientWidth;
      const height = root.clientHeight;

      if (!width || !height) return null;

      const [dither1, dither2, dither3, dither4, background, foreground] = readColors(
        root,
        colorTokens,
        [0, 0, 0],
      ) as [Rgb, Rgb, Rgb, Rgb, Rgb, Rgb];

      return {
        mode,
        width,
        height,
        devicePixelRatio: window.devicePixelRatio || 1,
        cell: cellSize * multiplier,
        palette: [dither1, dither2, dither3, dither4],
        background,
        foreground,
        fontFamily: getComputedStyle(root).getPropertyValue('--font-mono').trim() || 'monospace',
        options: parsedOptions,
        colors: readOptionColors(root, parsedOptions),
      };
    };

    const paint = () => {
      const ctx = canvas.getContext('2d');

      if (!ctx || !state.base) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (state.coarse > 1) drawCoarse(ctx, state.base, state.coarse);
      else ctx.drawImage(state.base, 0, 0);

      const { pointer, params } = state;

      if (!pointer || !state.lens || !params) return;

      // Линза: кусок оригинала (или кадра с мелкой ячейкой) под курсором, края растворены радиальной маской
      const scale = params.devicePixelRatio;
      const radiusPx = Math.round(lens.radius * scale);
      const size = radiusPx * 2;
      const x = Math.round(pointer.x * scale) - radiusPx;
      const y = Math.round(pointer.y * scale) - radiusPx;
      const lctx = lensSurface(size);

      if (!lctx) return;

      const mask = lctx.createRadialGradient(radiusPx, radiusPx, 0, radiusPx, radiusPx, radiusPx);

      mask.addColorStop(0, `rgba(0, 0, 0, ${lens.strength})`);
      mask.addColorStop(0.5, `rgba(0, 0, 0, ${lens.strength * 0.8})`);
      mask.addColorStop(1, 'rgba(0, 0, 0, 0)');

      lctx.globalCompositeOperation = 'source-over';
      lctx.clearRect(0, 0, size, size);
      lctx.drawImage(state.lens, x, y, size, size, 0, 0, size, size);
      lctx.globalCompositeOperation = 'destination-in';
      lctx.fillStyle = mask;
      lctx.fillRect(0, 0, size, size);
      ctx.drawImage(lctx.canvas, 0, 0, size, size, x, y, size, size);
    };

    const fitCanvas = (base: HTMLCanvasElement) => {
      if (canvas.width !== base.width || canvas.height !== base.height) {
        canvas.width = base.width;
        canvas.height = base.height;
      }
    };

    const render = async (multiplier: number) => {
      try {
        await ready;
      } catch {
        // Чанк режима не загрузился (сеть, выкладка новой версии) — показываем обычное изображение
        setFailedSrc(src);

        return;
      }

      const params = readParams(multiplier);

      if (!params || cancelled) return;

      // Символы рисуются тем шрифтом, что уже загружен: без ожидания первый кадр вышел бы системным моно
      if (params.mode === 'ascii' || params.mode === 'braille') {
        await document.fonts.load(`${params.cell}px ${params.fontFamily}`).catch(() => undefined);
      }

      if (cancelled) return;

      const { image, width, height } = source();

      try {
        // Промежуточные кадры проявления в кэш не идут: они нужны один раз
        if (multiplier !== 1) {
          state.base = renderWith(image, width, height, params);
        } else if (cacheable()) {
          state.base = getFrame(frameKey('frame', src, params, renderer), () =>
            renderWith(image, width, height, params),
          );
        } else {
          state.base = renderWith(image, width, height, params, state.surfaces);
        }
      } catch {
        // Чужой источник без CORS «отравляет» canvas, getImageData бросает — показываем обычное изображение
        setFailedSrc(src);

        return;
      }

      state.params = params;
      state.lens = null;
      fitCanvas(state.base);
      paint();
      setPainted(true);
      setUsedRenderer(lastRenderer);
    };

    const ensureLens = () => {
      const { params } = state;

      if (state.lens || !params) return;

      const { image, width, height } = source();
      // У rgb-split «мельче» значит сильнее: под курсором каналы расходятся втрое
      const finer = {
        ...params,
        cell: mode === 'rgb-split' ? params.cell * 2.5 : Math.max(1, params.cell / 2),
      };

      // Кадр анимации меняется — линза считается заново в свой переиспользуемый холст, без кэша
      if (!cacheable()) {
        state.lens =
          revealMode === 'finer'
            ? renderWith(image, width, height, finer, state.lensSurfaces)
            : renderOriginal(image, width, height, params, state.lensSurfaces);

        return;
      }

      state.lens =
        revealMode === 'finer'
          ? getFrame(frameKey('frame', src, finer, renderer), () =>
              renderWith(image, width, height, finer),
            )
          : getFrame(frameKey('original', src, params, renderer), () =>
              renderOriginal(image, width, height, params),
            );
    };

    const stopPlayback = () => {
      playback?.cancel();
      playback = null;

      if (videoHandle && element instanceof HTMLVideoElement) {
        element.cancelVideoFrameCallback(videoHandle);
      }

      videoHandle = 0;
    };

    /** Очередной кадр через фильтр; во время проявления — пропуск (вне экрана задачу не зовёт планировщик) */
    const paintLive = () => {
      const { params } = state;

      if (!params || appearing) return;

      const { image, width, height } = source();

      try {
        state.base = renderWith(image, width, height, params, state.surfaces);
        state.lens = null;

        if (state.pointer && reactive) ensureLens();
      } catch {
        stopPlayback();
        setFailedSrc(src);

        return;
      }

      fitCanvas(state.base);
      paint();
    };

    const playVideo = (video: HTMLVideoElement) => {
      // requestVideoFrameCallback отмечает, что пришёл новый кадр; рисует общий цикл, не чаще 30 в секунду.
      // Без него (старые движки) — каждый кадр цикла с тем же потолком
      const exact = supportsVideoFrameCallback();
      let fresh = true;

      const onVideoFrame = () => {
        if (cancelled) return;

        fresh = true;
        videoHandle = video.requestVideoFrameCallback(onVideoFrame);
      };

      void video.play().catch(() => undefined);

      if (exact) videoHandle = video.requestVideoFrameCallback(onVideoFrame);

      playback = schedule(
        {
          frame: (now) => {
            if ((exact && !fresh) || shouldSkipVideoFrame(now, lastVideoFrame)) return;

            fresh = false;
            lastVideoFrame = now;
            state.live = { image: video, width: video.videoWidth, height: video.videoHeight };
            paintLive();
          },
          // Вне экрана и на скрытой вкладке видео не только не фильтруется, но и не декодируется
          onVisibilityChange: (visible) => {
            if (visible) void video.play().catch(() => undefined);
            else video.pause();
          },
        },
        { element: root },
      );
      setPlaying(true);
    };

    const playAnimation = async () => {
      const animation = await decodeAnimated(src);

      if (!animation || cancelled) return;

      let nextAt = 0;

      playback = schedule(
        {
          frame: (now) => {
            if (appearing || now < nextAt) return;

            const current = animation.frames[state.frameIndex % animation.frames.length]!;

            state.live = {
              image: current.bitmap,
              width: animation.width,
              height: animation.height,
            };
            paintLive();
            state.frameIndex = (state.frameIndex + 1) % animation.frames.length;
            nextAt = now + current.delay;
          },
        },
        { element: root },
      );
      setPlaying(true);
    };

    const startPlayback = () => {
      if (cancelled) return;

      if (!animate) {
        // Путь static: фильтр стоит на первом кадре, и видео под ним не должно играть зря
        if (element instanceof HTMLVideoElement && renderer === 'static') element.pause();

        return;
      }

      if (element instanceof HTMLVideoElement) playVideo(element);
      else void playAnimation();
    };

    const runAppear = async () => {
      appearing = true;
      state.appeared = true;

      for (const multiplier of appearSteps) {
        if (extended) {
          // Новые режимы считаются один раз, а проявляются крупными пикселями готового кадра: у растра,
          // CRT или изолиний ячейка ×6 — это другой рисунок, а не грубая версия того же
          state.coarse =
            multiplier === 1
              ? 0
              : Math.round(Math.max(4, cellSize) * multiplier * (window.devicePixelRatio || 1));

          if (state.base && state.params) paint();
          else await render(1);
        } else {
          await render(multiplier);
        }

        if (cancelled) return;

        if (multiplier !== 1) {
          await new Promise((resolve) => {
            timer = window.setTimeout(resolve, appearStepMs);
          });
        }
      }

      appearing = false;
    };

    const start = () => {
      if (started) return;

      started = true;

      const first = appear && !still && !state.appeared ? runAppear() : render(1);

      void first.then(startPlayback);
    };

    const resize = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (started && !appearing) void render(1);
      });
    });

    // Проявление ждёт, пока изображение окажется на экране; без него кадр нужен сразу
    const appearance = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) start();
    });

    const onPointerMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();

      state.pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      ensureLens();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paint);
    };

    const onPointerLeave = () => {
      state.pointer = null;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paint);
    };

    // Кадр проявления от прошлого запуска эффекта не должен остаться «крупным»
    state.coarse = 0;
    resize.observe(root);

    if (appear && !still && !state.appeared) appearance.observe(root);
    else start();

    if (reactive) {
      root.addEventListener('pointermove', onPointerMove);
      root.addEventListener('pointerleave', onPointerLeave);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      stopPlayback();
      resize.disconnect();
      appearance.disconnect();
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerleave', onPointerLeave);
      state.pointer = null;
      state.live = null;
      state.coarse = 0;
      setPlaying(false);
    };
  }, [
    active,
    loaded,
    kind,
    mode,
    optionsKey,
    cellSize,
    src,
    revealMode,
    appear,
    effects,
    reducedMotion,
    forcedRenderer,
    hasShader,
    glVersion,
    themeVersion,
  ]);

  const onReady = (width: number, height: number) => {
    setNaturalRatio(height ? width / height : null);
    setLoadedSrc(src);
  };

  return (
    <div
      ref={setRoot}
      className={cx(styles.root, className)}
      style={{
        aspectRatio: aspectRatio ?? naturalRatio ?? undefined,
        borderRadius: radiusVar(radius),
        ...style,
      }}
      data-mode={mode}
      data-media={kind}
      data-filter={active ? 'on' : 'off'}
      data-painted={(active && painted) || undefined}
      data-playing={(active && playing) || undefined}
      data-renderer={(active && painted && usedRenderer) || undefined}
      {...rest}
    >
      {kind === 'video' ? (
        <video
          ref={videoRef}
          src={src}
          aria-label={alt}
          crossOrigin={crossOrigin}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          className={styles.image}
          onLoadedData={(event) => {
            const { videoWidth, videoHeight } = event.currentTarget;

            onReady(videoWidth, videoHeight);
          }}
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          crossOrigin={crossOrigin}
          decoding="async"
          draggable={false}
          className={styles.image}
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;

            onReady(naturalWidth, naturalHeight);
          }}
          onError={() => setFailedSrc(src)}
        />
      )}

      {active && <canvas ref={canvasRef} className={styles.canvas} aria-hidden />}
    </div>
  );
}
