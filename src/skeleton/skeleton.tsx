import type { ComponentPropsWithRef } from 'react';

import { cx } from '../lib/cx';
import { radiusVar, type Radius } from '../lib/space';

import styles from './skeleton.module.css';

export interface SkeletonProps extends ComponentPropsWithRef<'span'> {
  width?: number | string;
  height?: number | string;
  radius?: Radius;
  /** Круг — под аватар */
  circle?: boolean;
  /** Несколько строк текста; последняя короче */
  lines?: number;
}

export function Skeleton({
  width,
  height,
  radius = 'sm',
  circle,
  lines,
  className,
  style,
  ...rest
}: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <span className={cx(styles.lines, className)} style={style} {...rest}>
        {Array.from({ length: lines }, (_, index) => (
          <span
            key={index}
            className={styles.skeleton}
            style={{
              height: height ?? '1em',
              width: index === lines - 1 ? '60%' : '100%',
              borderRadius: radiusVar(radius),
            }}
          />
        ))}
      </span>
    );
  }

  return (
    <span
      className={cx(styles.skeleton, className)}
      style={{
        width: width ?? (circle ? height : '100%'),
        height: height ?? (circle ? width : '1em'),
        borderRadius: circle ? 'var(--radius-full)' : radiusVar(radius),
        ...style,
      }}
      {...rest}
    />
  );
}
