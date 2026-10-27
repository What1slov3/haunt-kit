import { useEffect, useRef, type ComponentPropsWithRef, type CSSProperties } from 'react';

import { cx } from '../../../lib/cx';
import { radiusVar, type Radius } from '../../../lib/space';
import { useFxEnvironment } from '../../use-fx-environment';

import { tiltAt } from './pointer-math';
import styles from './tilt.module.css';

export interface TiltProps extends ComponentPropsWithRef<'div'> {
  /** Наибольший наклон, градусы */
  max?: number;
  /** Блик, следующий за курсором */
  glare?: boolean;
  /** Подъём карточки на наведении */
  scale?: number;
  /** Скругление поверхности: блик обрезается по нему */
  radius?: Radius;
  /** Глубина перспективы, px: меньше — наклон заметнее */
  perspective?: number;
}

/**
 * 3D-наклон карточки за курсором с бликом. Слушает только мышь и перо: на тач наклона нет — палец
 * закрывает карточку, а прокрутка не должна её качать. Координаты пишутся переменными в rAF, движется
 * только transform; рамка-обёртка стоит на месте, поэтому наклон не дрожит на краю. Возврат — мягкий
 * (`--ease-release`). `data-effects="off"` и reduced-motion — плоская карточка.
 */
export function Tilt({
  max = 8,
  glare = true,
  scale = 1.02,
  radius = '2xl',
  perspective = 800,
  className,
  style,
  children,
  ...rest
}: TiltProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const { motion } = useFxEnvironment(rootRef);

  useEffect(() => {
    const root = rootRef.current;
    const surface = surfaceRef.current;

    if (!motion || !root || !surface) return;

    let frame = 0;
    let point: { x: number; y: number } | null = null;

    const apply = () => {
      frame = 0;

      if (!point) return;

      const state = tiltAt(root.getBoundingClientRect(), point.x, point.y, max);

      surface.style.setProperty('--tilt-rx', `${state.rotateX}deg`);
      surface.style.setProperty('--tilt-ry', `${state.rotateY}deg`);
      surface.style.setProperty('--glare-x', `${(state.glareX - 0.5) * 50}%`);
      surface.style.setProperty('--glare-y', `${(state.glareY - 0.5) * 50}%`);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;

      point = { x: event.clientX, y: event.clientY };
      surface.dataset.active = '';
      frame ||= requestAnimationFrame(apply);
    };

    const onLeave = () => {
      point = null;
      cancelAnimationFrame(frame);
      frame = 0;
      delete surface.dataset.active;

      for (const name of ['--tilt-rx', '--tilt-ry', '--glare-x', '--glare-y']) {
        surface.style.removeProperty(name);
      }
    };

    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);

    return () => {
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      onLeave();
    };
  }, [motion, max]);

  return (
    <div
      ref={rootRef}
      className={cx(styles.root, className)}
      style={{ '--tilt-perspective': `${perspective}px`, ...style } as CSSProperties}
      {...rest}
    >
      <div
        ref={surfaceRef}
        className={styles.surface}
        style={{ '--tilt-scale': scale, borderRadius: radiusVar(radius) } as CSSProperties}
      >
        {children}

        {glare && motion && (
          <span className={styles.glare} aria-hidden data-glare="">
            <span className={styles.spot} />
          </span>
        )}
      </div>
    </div>
  );
}
