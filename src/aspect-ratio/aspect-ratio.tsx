import type { ComponentPropsWithRef } from 'react';

import { AspectRatio as RadixAspectRatio } from 'radix-ui';

import { cx } from '../lib/cx';

import styles from './aspect-ratio.module.css';

export type AspectRatioRadius = 'none' | 'md' | 'lg' | 'xl' | '2xl';

export interface AspectRatioProps extends ComponentPropsWithRef<typeof RadixAspectRatio.Root> {
  /** Ширина к высоте: `16 / 9`, `1`; по умолчанию 1 */
  ratio?: number;
  /** Скругление; по умолчанию lg — как у панелей и вложений */
  radius?: AspectRatioRadius;
  /** Подложка и тонкая рамка поверх содержимого — видно место, пока медиа грузится; по умолчанию да */
  framed?: boolean;
}

/**
 * Блок с заданным соотношением сторон (Radix AspectRatio): превью, обложка события, плитка видео.
 * Картинка и видео внутри заполняют его (`object-fit: cover`); рамка — inset-тень поверх содержимого,
 * а не border: border сдвинул бы медиа внутрь и обвёл его полосой подложки.
 */
export function AspectRatio({
  ratio = 1,
  radius = 'lg',
  framed = true,
  className,
  ...rest
}: AspectRatioProps) {
  return (
    <RadixAspectRatio.Root
      ratio={ratio}
      className={cx(styles.root, styles[`radius-${radius}`], framed && styles.framed, className)}
      {...rest}
    />
  );
}
