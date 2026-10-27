import { useEffect, useRef, useState, type ComponentPropsWithRef, type CSSProperties } from 'react';

import { cx } from '../../lib/cx';
import { radiusVar, type Radius } from '../../lib/space';
import { pickRenderer } from '../renderer';
import { schedule } from '../scheduler';
import { useFxEnvironment } from '../use-fx-environment';

import styles from './image-transition.module.css';
import type { TransitionEffect } from './transition-masks';

export type ImageTransitionEffect = TransitionEffect;

export interface ImageTransitionProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Текущая картинка; смена src запускает переход от прошлой. Свой origin, data: или blob: */
  src: string;
  alt: string;
  /**
   * fade — наплыв с лёгким «приземлением» масштаба, focus — проявляется из размытия, reveal — расходится
   * от центра мягким пятном, wipe — мягкая диагональная шторка
   */
  effect?: ImageTransitionEffect;
  /** Длительность перехода, мс */
  duration?: number;
  aspectRatio?: CSSProperties['aspectRatio'];
  radius?: Radius;
}

/** Переход — только Canvas 2D: пара drawImage на кадр, шейдер ничего не выиграл бы */
const strategy = { canvas2d: true, static: true } as const;

/**
 * Смена картинки с мягким переходом: наплыв, проявка из размытия, пятно от центра или шторка.
 * Старая картинка — обычный `<img>`, новая рисуется поверх на холсте в общем цикле кадров (`fx/scheduler`).
 * `data-effects="off"`, reduced-motion и `data-fx-renderer="static"` — смена мгновенная.
 */
export function ImageTransition({
  src,
  alt,
  effect = 'fade',
  duration = 900,
  aspectRatio,
  radius = 'lg',
  className,
  style,
  ...rest
}: ImageTransitionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shown, setShown] = useState(src);
  const [ratio, setRatio] = useState<number | null>(null);
  const { motion, renderer: forced } = useFxEnvironment(rootRef);
  const renderer = pickRenderer(strategy, {
    override: forced,
    support: 'none',
    webglUsable: false,
  });
  const instant = !motion || renderer === 'static';
  const incoming = !instant && src !== shown ? src : null;

  // Без движения — сразу новая картинка (синхронизация с пропом, не эффект ради эффекта)
  if (instant && src !== shown) setShown(src);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;

    if (!incoming || !root || !canvas) return;

    let cancelled = false;
    let cancelTask = () => {};

    const run = async () => {
      const image = new Image();

      image.src = incoming;

      const [masks] = await Promise.all([
        import('./transition-masks'),
        image.decode().catch(() => undefined),
      ]);

      if (cancelled) return;

      const scale = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(root.clientWidth * scale));
      const height = Math.max(1, Math.round(root.clientHeight * scale));
      const ctx = canvas.getContext('2d');

      // Картинка не декодировалась или холста нет — просто показываем новую
      if (!ctx || !image.naturalWidth) {
        setShown(incoming);

        return;
      }

      canvas.width = width;
      canvas.height = height;

      // Новая картинка один раз — в размер рамки (cover); дальше кадры только копируют её
      const target = document.createElement('canvas');
      const tctx = target.getContext('2d');
      const rect = masks.coverRect(image.naturalWidth, image.naturalHeight, width, height);

      target.width = width;
      target.height = height;
      tctx?.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, width, height);

      // Картинка чуть крупнее рамки и «садится» на место: переход ощущается движением, а не сменой слайда
      const drawTarget = (zoom: number) => {
        const w = width * zoom;
        const h = height * zoom;

        ctx.drawImage(target, (width - w) / 2, (height - h) / 2, w, h);
      };

      const mask = document.createElement('canvas');
      const mctx = mask.getContext('2d');
      const long = Math.max(width, height);
      const cols = Math.max(2, Math.round((masks.MASK_CELLS * width) / long));
      const rows = Math.max(2, Math.round((masks.MASK_CELLS * height) / long));
      const maskData = new ImageData(cols, rows);
      const thresholds = masks.isMaskEffect(effect)
        ? masks.transitionThresholds(effect, cols, rows)
        : null;
      // Safari до 18 не знает ctx.filter — там focus остаётся мягким наплывом без размытия
      const canBlur = 'filter' in ctx;
      let startedAt = 0;

      mask.width = cols;
      mask.height = rows;

      const handle = schedule(
        {
          frame: (now) => {
            startedAt ||= now;

            const t = Math.min(1, (now - startedAt) / duration);
            const settle = 1 - masks.easeOut(t);

            ctx.globalCompositeOperation = 'copy';
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            if (thresholds && masks.isMaskEffect(effect)) {
              masks.fillMask(
                thresholds,
                masks.easeInOut(t),
                masks.MASK_BAND[effect],
                maskData.data,
              );
              mctx?.putImageData(maskData, 0, 0);
              // Грубая маска растягивается со сглаживанием — край выходит туманным, без клеток
              ctx.drawImage(mask, 0, 0, cols, rows, 0, 0, width, height);
              ctx.globalCompositeOperation = 'source-in';
              drawTarget(effect === 'reveal' ? 1 + 0.03 * settle : 1);
            } else {
              ctx.globalAlpha = masks.easeInOut(effect === 'focus' ? Math.min(1, t * 1.5) : t);

              if (effect === 'focus' && canBlur) ctx.filter = `blur(${settle * 14 * scale}px)`;

              // Размытый край прозрачен — у focus запас масштаба больше, чтобы он ушёл за рамку
              drawTarget(1 + (effect === 'focus' ? 0.06 : 0.035) * settle);
              ctx.globalAlpha = 1;

              if (canBlur) ctx.filter = 'none';
            }

            ctx.globalCompositeOperation = 'source-over';

            if (t >= 1) {
              cancelTask();
              setShown(incoming);
            }
          },
        },
        { element: root },
      );

      cancelTask = () => handle.cancel();
    };

    void run();

    return () => {
      cancelled = true;
      cancelTask();
    };
  }, [incoming, effect, duration]);

  return (
    <div
      ref={rootRef}
      className={cx(styles.root, className)}
      style={{
        aspectRatio: aspectRatio ?? ratio ?? undefined,
        borderRadius: radiusVar(radius),
        ...style,
      }}
      data-transitioning={incoming ? '' : undefined}
      data-renderer={renderer}
      {...rest}
    >
      <img
        src={shown}
        alt={alt}
        decoding="async"
        draggable={false}
        className={styles.image}
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;

          setRatio(naturalHeight ? naturalWidth / naturalHeight : null);
        }}
      />

      {incoming && <canvas ref={canvasRef} className={styles.canvas} aria-hidden />}
    </div>
  );
}
