import { useLayoutEffect, useRef, type ComponentPropsWithRef } from 'react';

import { ToggleGroup as RadixToggleGroup } from 'radix-ui';

import { cx } from '../lib/cx';
import { assignRef } from '../lib/assign-ref';

import styles from './toggle-group.module.css';

export type ToggleGroupRootProps = ComponentPropsWithRef<typeof RadixToggleGroup.Root> & {
  /** Пункты 20 / 24 px внутри колодца — та же высота группы, что у контролов 24 / 28 */
  size?: 'sm' | 'md';
};

/*
 * Плашка выбранного пункта — одна на группу и переезжает к новому пункту. Пункты не знают, выбраны ли
 * они (состояние у Radix), поэтому плашка следит за `aria-checked` в DOM: так одинаково работают и
 * управляемая, и неуправляемая группа, а смена выбора не перерисовывает React. Только для single:
 * у multiple выбранных несколько, им — своя подсветка на пункте.
 */
function useThumb(enabled: boolean) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const thumb = thumbRef.current;

    if (!enabled || !root || !thumb) return;

    const place = () => {
      const active = root.querySelector<HTMLElement>('[aria-checked="true"]');

      if (!active) {
        thumb.dataset.hidden = '';

        return;
      }

      // offset*, а не getBoundingClientRect: координаты внутри группы, без масштаба и анимации предков
      thumb.style.width = `${active.offsetWidth}px`;
      thumb.style.height = `${active.offsetHeight}px`;
      thumb.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
      delete thumb.dataset.hidden;
    };

    place();

    // Переход включается после первой расстановки: при монтировании плашка не едет из угла
    const frame = requestAnimationFrame(() => {
      thumb.dataset.ready = '';
    });
    const mutations = new MutationObserver(place);
    const resize = new ResizeObserver(place);

    mutations.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-checked'],
    });
    resize.observe(root);

    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      resize.disconnect();
    };
  }, [enabled]);

  return { rootRef, thumbRef };
}

export function ToggleGroupRoot({
  size = 'md',
  className,
  children,
  ref,
  ...rest
}: ToggleGroupRootProps) {
  const single = rest.type === 'single';
  const { rootRef, thumbRef } = useThumb(single);

  return (
    <RadixToggleGroup.Root
      ref={(node) => {
        rootRef.current = node;
        assignRef(ref, node);
      }}
      className={cx(styles.root, styles[size], single && styles.single, className)}
      {...rest}
    >
      {single && <span ref={thumbRef} className={styles.thumb} data-hidden="" aria-hidden />}
      {children}
    </RadixToggleGroup.Root>
  );
}

ToggleGroupRoot.displayName = 'ToggleGroup.Root';

export type ToggleGroupItemProps = ComponentPropsWithRef<typeof RadixToggleGroup.Item> & {
  /** Только иконка — подпись для скринридера */
  label?: string;
};

export function ToggleGroupItem({ label, className, ...rest }: ToggleGroupItemProps) {
  return (
    <RadixToggleGroup.Item
      aria-label={label}
      className={cx(styles.item, label && styles.iconOnly, className)}
      {...rest}
    />
  );
}

ToggleGroupItem.displayName = 'ToggleGroup.Item';
