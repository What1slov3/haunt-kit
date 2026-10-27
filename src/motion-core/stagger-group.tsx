import {
  Children,
  cloneElement,
  isValidElement,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';

import { useFxEnvironment } from '../fx/use-fx-environment';
import { cx } from '../lib/cx';

import { stagger } from './stagger';
import styles from './stagger-group.module.css';

export interface StaggerProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  /** Появление детей: на `--anim-*` кита */
  animation?: 'fade' | 'pop' | 'rise';
  /** Шаг каскада, мс */
  step?: number;
  /** После скольких детей задержка больше не растёт */
  max?: number;
  as?: 'div' | 'ul' | 'ol' | 'section' | 'span';
}

/**
 * Каскад появления детей: контейнер раздаёт прямым детям `--stagger-index`, задержку считает CSS.
 * Детям нужен проп `style` (элементы DOM и компоненты кита его принимают). Играет при монтировании;
 * повторить — сменить `key`. `data-effects="off"` и reduced-motion — все сразу на месте.
 */
export function Stagger({
  children,
  animation = 'rise',
  step = 30,
  max = 12,
  as = 'div',
  className,
  style,
  ...rest
}: StaggerProps) {
  const rootRef = useRef<HTMLElement>(null);
  const { motion } = useFxEnvironment(rootRef);
  const Tag = as as 'div';
  let index = 0;

  return (
    <Tag
      ref={rootRef as RefObject<HTMLDivElement>}
      className={cx(styles.root, styles[animation], className)}
      data-static={motion ? undefined : ''}
      style={{ '--stagger-step': `${step}ms`, '--stagger-max': max, ...style } as CSSProperties}
      {...rest}
    >
      {Children.map(children, (child) => {
        if (!isValidElement<{ style?: CSSProperties }>(child)) return child;

        const element = child as ReactElement<{ style?: CSSProperties }>;

        return cloneElement(element, { style: { ...element.props.style, ...stagger(index++) } });
      })}
    </Tag>
  );
}
