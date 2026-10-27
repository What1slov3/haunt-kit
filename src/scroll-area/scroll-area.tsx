import type { ComponentPropsWithRef } from 'react';

import { ScrollArea as RadixScrollArea } from 'radix-ui';

import { cx } from '../lib/cx';

import styles from './scroll-area.module.css';

export interface ScrollAreaProps extends ComponentPropsWithRef<typeof RadixScrollArea.Root> {
  orientation?: 'vertical' | 'horizontal' | 'both';
  /** Когда показывать полосу: по наведению (по умолчанию), при прокрутке, всегда */
  type?: 'hover' | 'scroll' | 'always' | 'auto';
  /** Занять остаток флекс-колонки (flex: 1; min-height: 0) — самый частый случай */
  grow?: boolean;
  /** Класс на вьюпорте — для внутренних отступов контента */
  viewportClassName?: string;
}

/**
 * Прокрутка с тонкой полосой в стиле системы. Высоту задаёт родитель: либо явно, либо через `grow`
 * внутри флекс-колонки, иначе скроллить нечему.
 */
export function ScrollArea({
  orientation = 'vertical',
  type = 'hover',
  grow,
  viewportClassName,
  className,
  children,
  ...rest
}: ScrollAreaProps) {
  const vertical = orientation !== 'horizontal';
  const horizontal = orientation !== 'vertical';

  return (
    <RadixScrollArea.Root
      type={type}
      className={cx(styles.root, grow && styles.grow, className)}
      {...rest}
    >
      <RadixScrollArea.Viewport className={cx(styles.viewport, viewportClassName)}>
        {children}
      </RadixScrollArea.Viewport>

      {vertical && (
        <RadixScrollArea.Scrollbar orientation="vertical" className={styles.scrollbar}>
          <RadixScrollArea.Thumb className={styles.thumb} />
        </RadixScrollArea.Scrollbar>
      )}

      {horizontal && (
        <RadixScrollArea.Scrollbar orientation="horizontal" className={styles.scrollbar}>
          <RadixScrollArea.Thumb className={styles.thumb} />
        </RadixScrollArea.Scrollbar>
      )}

      {vertical && horizontal && <RadixScrollArea.Corner />}
    </RadixScrollArea.Root>
  );
}
