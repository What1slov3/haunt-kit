import { useEffect, useRef, type ComponentPropsWithRef } from 'react';

import { cx } from '../../../lib/cx';
import { useFxEnvironment } from '../../use-fx-environment';
import { magneticOffset } from '../tilt/pointer-math';

import styles from './magnetic.module.css';

export interface MagneticProps extends ComponentPropsWithRef<'span'> {
  /** Доля пути к курсору */
  strength?: number;
  /** Наибольший сдвиг, px */
  max?: number;
  /** Насколько за краем курсор ещё притягивает, px */
  reach?: number;
}

type Magnet = (x: number, y: number) => void;

/*
 * Один слушатель pointermove на окно для всех магнитов страницы, как у прожектора (theme/spotlight.ts):
 * курсор один, а кнопок с притяжением может быть несколько. Ставится с первым магнитом, снимается с
 * последним; каждый магнит получает координаты не чаще кадра.
 */
const magnets = new Set<Magnet>();
let frame = 0;
let last: { x: number; y: number } | null = null;

function onWindowMove(event: PointerEvent) {
  if (event.pointerType === 'touch') return;

  last = { x: event.clientX, y: event.clientY };
  frame ||= requestAnimationFrame(() => {
    frame = 0;

    if (!last) return;

    for (const magnet of magnets) magnet(last.x, last.y);
  });
}

function addMagnet(magnet: Magnet): () => void {
  if (magnets.size === 0) window.addEventListener('pointermove', onWindowMove, { passive: true });

  magnets.add(magnet);

  return () => {
    magnets.delete(magnet);

    if (magnets.size > 0) return;

    window.removeEventListener('pointermove', onWindowMove);
    cancelAnimationFrame(frame);
    frame = 0;
    last = null;
  };
}

/**
 * Обёртка, которая слегка тянет кнопку к курсору — в меру: треть пути, не дальше `max`. Сама обёртка
 * стоит на месте и меряется, двигается содержимое (только transform), поэтому сдвиг не раскачивает зону
 * притяжения. Возврат — мягкий. На тач и при `data-effects="off"` / reduced-motion — не двигается.
 */
export function Magnetic({
  strength = 0.3,
  max = 6,
  reach = 16,
  className,
  children,
  ...rest
}: MagneticProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const { motion } = useFxEnvironment(rootRef);

  useEffect(() => {
    const root = rootRef.current;
    const content = contentRef.current;

    if (!motion || !root || !content) return;

    let pulled = false;

    const remove = addMagnet((x, y) => {
      const offset = magneticOffset(root.getBoundingClientRect(), x, y, { strength, max, reach });

      if (!offset) {
        if (!pulled) return;

        pulled = false;
        delete content.dataset.pulled;
        content.style.removeProperty('transform');

        return;
      }

      pulled = true;
      content.dataset.pulled = '';
      content.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
    });

    return () => {
      remove();
      delete content.dataset.pulled;
      content.style.removeProperty('transform');
    };
  }, [motion, strength, max, reach]);

  return (
    <span ref={rootRef} className={cx(styles.root, className)} {...rest}>
      <span ref={contentRef} className={styles.content}>
        {children}
      </span>
    </span>
  );
}
