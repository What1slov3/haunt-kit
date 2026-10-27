import { useRef, type CSSProperties, type HTMLAttributes, type RefObject } from 'react';

import { useFxEnvironment } from '../fx/use-fx-environment';
import { cx } from '../lib/cx';

import styles from './scroll-reveal.module.css';
import { supportsScrollTimeline } from './scroll-timeline';
import { useInView } from './use-in-view';

export interface ScrollRevealProps extends HTMLAttributes<HTMLElement> {
  /** Как появляется: подъём, проявление или масштаб */
  animation?: 'rise' | 'fade' | 'scale';
  /**
   * Участок прокрутки, на котором идёт появление (CSS `animation-range`): по умолчанию — от входа в
   * окно до полного входа: элемент на месте, как только виден целиком
   */
  range?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}

/**
 * Появление по прокрутке. Где есть `animation-timeline: view()` — анимация привязана к прокрутке на
 * композиторе, без JS на кадр, и идёт в обе стороны. Где нет — запасной IntersectionObserver: элемент
 * появляется один раз, переходом. Только opacity, transform и filter. `data-effects="off"` и
 * reduced-motion — сразу на месте.
 */
export function ScrollReveal({
  animation = 'rise',
  range = 'entry 0% entry 100%',
  as = 'div',
  className,
  style,
  children,
  ...rest
}: ScrollRevealProps) {
  const rootRef = useRef<HTMLElement>(null);
  const { motion } = useFxEnvironment(rootRef);
  const timeline = motion && supportsScrollTimeline();
  const inView = useInView(rootRef, { disabled: !motion || timeline, margin: '0px 0px -10% 0px' });
  const mode = !motion ? 'static' : timeline ? 'timeline' : 'observe';
  const Tag = as as 'div';

  return (
    <Tag
      ref={rootRef as RefObject<HTMLDivElement>}
      className={cx(styles.root, styles[animation], className)}
      data-scroll={mode}
      data-inview={mode === 'observe' && inView ? '' : undefined}
      style={{ '--reveal-range': range, ...style } as CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
}
