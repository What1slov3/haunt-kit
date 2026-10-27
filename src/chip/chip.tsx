import { useState, type ComponentPropsWithRef, type ReactNode } from 'react';

import { Burst } from '../fx/effects/burst/burst';
import { cx } from '../lib/cx';

import styles from './chip.module.css';

export interface ChipProps extends ComponentPropsWithRef<'button'> {
  /** Выбранное состояние: «я тоже поставил эту реакцию», активный фильтр */
  selected?: boolean;
  icon?: ReactNode;
  /** Число справа, например количество реакций; смена значения анимирована */
  count?: number;
  size?: 'sm' | 'md';
}

/**
 * Нажимаемая таблетка: реакция под сообщением, фильтр, тег. При включении (`selected` false → true)
 * «попает» и даёт короткий всплеск частиц (`Burst` из `fx`); при data-effects="off" — без всплеска.
 */
export function Chip({
  selected,
  icon,
  count,
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: ChipProps) {
  const [previousSelected, setPreviousSelected] = useState(selected);
  const [burstKey, setBurstKey] = useState(0);

  // Всплеск — реакция на смену пропа, а не на клик: чип может переключить и клавиатура, и сервер
  if (selected !== previousSelected) {
    setPreviousSelected(selected);
    if (selected) setBurstKey((key) => key + 1);
  }

  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cx(styles.chip, styles[size], selected && styles.selected, className)}
      data-pop={burstKey > 0 ? burstKey : undefined}
      {...rest}
    >
      {icon && <span className={styles.icon}>{icon}</span>}

      {children && <span className={styles.text}>{children}</span>}

      {count !== undefined && (
        <span className={styles.count}>
          {/* key — чтобы новое число въехало анимацией */}
          <span key={count} className={styles.countValue}>
            {count}
          </span>
        </span>
      )}

      <Burst fire={burstKey} count={6} size={5} />
    </button>
  );
}
