import { useState, type ComponentPropsWithRef } from 'react';

import { cx } from '../lib/cx';
import { NumberTicker } from '../number-ticker/number-ticker';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './xp-bar.module.css';

export interface LevelBadgeProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  level: number;
  /** 20 / 28 / 40 px */
  size?: 'sm' | 'md' | 'lg';
  /** Приставка над числом у крупного значка; по умолчанию из словаря («ур.»), пустая строка — без неё */
  prefix?: string;
  /** Подпись для скринридера; по умолчанию «Уровень 12» */
  label?: string;
}

/**
 * Значок уровня: шестигранник цвета акцента, число перекатывается (`NumberTicker`), при повышении — «поп».
 * Повышение — реакция на смену пропа, а не на событие: уровень может прийти и с сервера.
 */
export function LevelBadge({
  level,
  size = 'md',
  prefix,
  label,
  className,
  ...rest
}: LevelBadgeProps) {
  const text = useUiStrings().levelBadge;
  const [previous, setPrevious] = useState(level);
  const [pop, setPop] = useState(0);
  const shownPrefix = prefix ?? text.short;

  if (level !== previous) {
    setPrevious(level);

    if (level > previous) setPop((value) => value + 1);
  }

  return (
    <span
      role="img"
      aria-label={label ?? text.label(level)}
      className={cx(styles.level, styles[`level-${size}`], className)}
      data-pop={pop > 0 ? pop : undefined}
      {...rest}
    >
      <span className={styles.levelInner} aria-hidden>
        {shownPrefix && size === 'lg' && <span className={styles.levelPrefix}>{shownPrefix}</span>}

        <NumberTicker value={level} className={styles.levelValue} />
      </span>

      {/* Вспышка — отдельный узел с ключом: новый ключ перезапускает анимацию, число не пересоздаётся */}
      {pop > 0 && <span key={pop} className={styles.levelFlash} aria-hidden />}
    </span>
  );
}
