import { useEffect, useRef, type CSSProperties } from 'react';

import { cx } from '../../../lib/cx';
import { schedule } from '../../scheduler';
import { useFxEnvironment } from '../../use-fx-environment';

import styles from './noise.module.css';

export interface NoiseProps {
  /** Сила зерна 0…1; умножается на `--fx-grain` */
  opacity?: number;
  /** Кадров в секунду: зерно плёнки — 24, «кипящее» — выше */
  fps?: number;
  /** Размер зерна, CSS px */
  grain?: number;
  /** Смешение со слоем под ним */
  blend?: 'overlay' | 'soft-light' | 'normal';
  className?: string;
  style?: CSSProperties;
}

const TILE = 128;

/**
 * Живое зерно слоем поверх родителя (ему нужен position: relative): одна шумовая плитка, которая на
 * каждом кадре ложится со случайным сдвигом. Холст в разрешении зерна (`grain`), растянут без
 * сглаживания. Кадры — общий цикл `fx/scheduler` с потолком `fps`, вне экрана стоят. Скрыт от
 * скринридера и мыши. `data-effects="off"` — без зерна (как `data-grain`), reduced-motion — стоит.
 */
export function Noise({
  opacity = 0.08,
  fps = 24,
  grain = 1,
  blend = 'overlay',
  className,
  style,
}: NoiseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { effects, reducedMotion } = useFxEnvironment(canvasRef);
  const enabled = effects !== 'off';

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!enabled || !canvas) return;

    let cancelled = false;
    let stop = () => {};

    void import('./noise-tile').then(({ noiseOffset, noiseTile }) => {
      const ctx = canvas.getContext('2d');

      if (cancelled || !ctx) return;

      const tile = document.createElement('canvas');

      tile.width = TILE;
      tile.height = TILE;
      tile.getContext('2d')?.putImageData(new ImageData(noiseTile(TILE), TILE, TILE), 0, 0);

      const pattern = ctx.createPattern(tile, 'repeat');
      let frame = 0;

      const draw = () => {
        const width = Math.max(1, Math.ceil(canvas.clientWidth / grain));
        const height = Math.max(1, Math.ceil(canvas.clientHeight / grain));

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        if (!pattern) return;

        const offset = noiseOffset(frame++, TILE);

        ctx.setTransform(1, 0, 0, 1, -offset.x, -offset.y);
        ctx.fillStyle = pattern;
        ctx.fillRect(offset.x, offset.y, width, height);
      };

      draw();

      // Без движения — один кадр: зерно остаётся фактурой, но не кипит
      if (reducedMotion) return;

      const handle = schedule({ frame: draw }, { element: canvas, fps });

      stop = () => handle.cancel();
    });

    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, reducedMotion, fps, grain]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cx(styles.noise, className)}
      style={
        {
          '--noise-opacity': opacity,
          mixBlendMode: blend,
          ...style,
        } as CSSProperties
      }
      data-noise={enabled ? (reducedMotion ? 'static' : 'live') : 'off'}
    />
  );
}
