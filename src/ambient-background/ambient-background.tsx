import type { ComponentPropsWithRef } from 'react';

import { FxBackground } from '../fx/backgrounds/fx-background';
import { Scanlines } from '../fx/backgrounds/scanlines';
import { FX_BACKGROUNDS, type FxBackgroundVariant } from '../fx/backgrounds/variants';
import { cx } from '../lib/cx';

import type { AmbientReaction } from './ambient-events';
import styles from './ambient-background.module.css';
import { DotCanvas } from './dot-canvas';
import { RippleLayer } from './ripple-layer';

/**
 * blobs и dots — прежние фоны; фоны `@haunt/ui/fx` (flow, contour, rain…) — те же, что `FxBackground`;
 * scanlines — одна развёртка на `--bg`
 */
export type AmbientVariant = 'blobs' | 'dots' | 'scanlines' | FxBackgroundVariant;

export interface AmbientBackgroundProps extends ComponentPropsWithRef<'div'> {
  /** blobs — размытые пятна (по умолчанию); dots — точечная сетка; остальные — фоны `@haunt/ui/fx` */
  variant?: AmbientVariant;
  /** Реакция на действия пользователя (волны от кликов и ambient.pulse, курсор, активная область) */
  reaction?: AmbientReaction;
  /** Едва заметная зернистость поверх */
  noise?: boolean;
  /** Развёртка поверх фона: строки и редкая полоса */
  scanlines?: boolean;
  /** Яркость пятен; low — для экранов с плотным текстом */
  intensity?: 'low' | 'normal';
  /** Фиксировать на весь экран (по умолчанию) или заполнить ближайшего позиционированного родителя */
  fixed?: boolean;
  /** Уровень голоса 0…1 для `waveform`; без пропа — шина `ambient.level()` */
  level?: number;
  /** Раскладка фонов fx (звёзды, частицы, клетки) */
  seed?: number;
}

const fxVariants: ReadonlySet<string> = new Set(FX_BACKGROUNDS);

function isFxVariant(variant: AmbientVariant): variant is FxBackgroundVariant {
  return fxVariants.has(variant);
}

/**
 * Живой фон под всем экраном. Кладётся один раз; панели приложения (`Surface panel`) почти
 * непрозрачны, так что фон виден в просветах и не мешает читать чат.
 *
 * Лежит на z-index −1 внутри ближайшего контекста наложения: родитель не должен создавать свой
 * (transform, filter, opacity < 1), иначе фон уедет за его собственный фон. Для фона внутри рамки
 * (fixed=false) рамке нужен `position: relative; isolation: isolate`.
 */
export function AmbientBackground({
  variant = 'blobs',
  reaction = 'quiet',
  noise = variant === 'blobs',
  scanlines = variant === 'scanlines',
  intensity = 'normal',
  fixed = true,
  level,
  seed,
  className,
  ...rest
}: AmbientBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cx(
        styles.root,
        fixed ? styles.fixed : styles.absolute,
        intensity === 'low' && styles.low,
        className,
      )}
      {...rest}
    >
      {variant === 'blobs' && (
        <>
          <span className={cx(styles.blob, styles.blob1)} />
          <span className={cx(styles.blob, styles.blob2)} />
          <span className={cx(styles.blob, styles.blob3)} />

          {reaction !== 'off' && <RippleLayer reaction={reaction} />}
        </>
      )}

      {variant === 'dots' && <DotCanvas reaction={reaction} />}

      {isFxVariant(variant) && (
        <FxBackground variant={variant} reaction={reaction} level={level} seed={seed} />
      )}

      {scanlines && <Scanlines />}

      {noise && <span className={styles.noise} />}
    </div>
  );
}
