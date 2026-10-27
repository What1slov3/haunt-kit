import type { ComponentPropsWithRef } from 'react';

import { cx } from '../lib/cx';

import styles from './emblem.module.css';
import { EMBLEM_VIEWBOX, emblemFromSeed, type EmblemPart } from './emblem-shapes';

export interface EmblemProps extends Omit<ComponentPropsWithRef<'svg'>, 'children'> {
  /** Строка, из которой выводится знак: id или имя пространства. Одна строка — всегда один знак */
  seed: string;
  /** Сторона в px */
  size?: number;
  /** `accent` — одна деталь цвета акцента, `mono` — всё цветом текста */
  tone?: 'accent' | 'mono';
  /** Подпись для чтения с экрана; без неё эмблема декоративная */
  label?: string;
}

function Part({ part, order }: { part: EmblemPart; order: number }) {
  const paint =
    part.paint === 'fill'
      ? { fill: 'currentColor' }
      : {
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: part.strokeWidth,
          strokeDasharray: part.dash,
        };
  const className = part.accent ? styles.accent : undefined;

  if (!part.repeat) return <path d={part.d} className={className} {...paint} />;

  return (
    <g className={className}>
      {Array.from({ length: order }, (_, i) => (
        <path
          key={i}
          d={part.d}
          transform={`rotate(${(360 / order) * i} ${EMBLEM_VIEWBOX / 2} ${EMBLEM_VIEWBOX / 2})`}
          {...paint}
        />
      ))}
    </g>
  );
}

/**
 * Процедурная эмблема пространства по seed: симметричный знак вместо логотипа, пока его не загрузили.
 * Детерминирована — одинакова на всех экранах и устройствах, ничего не хранит.
 */
export function Emblem({
  seed,
  size = 48,
  tone = 'accent',
  label,
  className,
  ...rest
}: EmblemProps) {
  const emblem = emblemFromSeed(seed);

  return (
    <svg
      viewBox={`0 0 ${EMBLEM_VIEWBOX} ${EMBLEM_VIEWBOX}`}
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-order={emblem.order}
      className={cx(styles.emblem, styles[tone], className)}
      {...rest}
    >
      {emblem.parts.map((part, index) => (
        <Part key={index} part={part} order={emblem.order} />
      ))}
    </svg>
  );
}
