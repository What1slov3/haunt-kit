import {
  Fragment,
  type ComponentPropsWithRef,
  type CSSProperties,
  type Key,
  type ReactNode,
} from 'react';

import { cx } from '../lib/cx';

import styles from './powerline.module.css';

export type PowerlineTone =
  'accent' | 'neutral' | 'muted' | 'success' | 'warning' | 'danger' | 'info';

export interface PowerlineSegment {
  /** Ключ сегмента; по умолчанию — индекс */
  id?: Key;
  content: ReactNode;
  /** Цвет заливки из токенов: accent — акцент, *-strong — статусы, neutral / muted — поверхности */
  tone?: PowerlineTone;
  /** Иконка перед текстом */
  icon?: ReactNode;
  /** Подсказка по наведению: полный путь, время сборки */
  title?: string;
}

export interface PowerlineProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  segments: readonly PowerlineSegment[];
  /** Форма разделителя: стрелка, полукруг или срез */
  shape?: 'arrow' | 'round' | 'slant';
  /** right — левый промпт, стрелки вправо; left — правый промпт, стрелки влево */
  direction?: 'right' | 'left';
  /** Кегль строки: 11 / 13 px; высота — строка TUI */
  size?: 'sm' | 'md';
}

/** Знаки разделителей Powerline (U+E0B0–E0BF) — из шрифта глифов кита, ровно в клетку строки */
const SEPARATORS = {
  right: { arrow: '\ue0b0', round: '\ue0b4', slant: '\ue0bc' },
  left: { arrow: '\ue0b2', round: '\ue0b6', slant: '\ue0ba' },
} as const;

/** Разделитель — знак цвета своего сегмента на заливке соседа: на краю промпта сосед — фон */
const separatorStyle = (tone: PowerlineTone, neighbour?: PowerlineSegment) =>
  ({
    '--pl-from': `var(--pl-${tone})`,
    '--pl-to': neighbour ? `var(--pl-${neighbour.tone ?? 'neutral'})` : 'transparent',
  }) as CSSProperties;

/**
 * Сегменты статуса со стрелками-разделителями, как в shell-промпте (powerline, starship): строка TUI в
 * клетках моно-сетки, разделитель — настоящий знак (U+E0B0 — стрелка, U+E0B4 — полукруг, U+E0BC — срез) из шрифта глифов кита (Nerd Font
 * не нужен), цвета — из токенов. Без TUI — отдельные плашки без стрелок.
 */
export function Powerline({
  segments,
  shape = 'arrow',
  direction = 'right',
  size = 'md',
  className,
  ...rest
}: PowerlineProps) {
  const glyph = SEPARATORS[direction][shape];

  return (
    <div
      role="group"
      className={cx(styles.root, styles[size], className)}
      data-shape={shape}
      data-direction={direction}
      {...rest}
    >
      {segments.map((segment, index) => {
        const tone = segment.tone ?? 'neutral';
        const separator = (neighbour?: PowerlineSegment) => (
          <span className={styles.separator} style={separatorStyle(tone, neighbour)} aria-hidden>
            {glyph}
          </span>
        );

        return (
          <Fragment key={segment.id ?? index}>
            {direction === 'left' && separator(segments[index - 1])}

            <span title={segment.title} className={cx(styles.segment, styles[tone])}>
              {segment.icon && <span className={styles.icon}>{segment.icon}</span>}
              {segment.content}
            </span>

            {direction === 'right' && separator(segments[index + 1])}
          </Fragment>
        );
      })}
    </div>
  );
}
