import { useState, type ComponentPropsWithRef, type CSSProperties, type ReactNode } from 'react';

import { VisuallyHidden } from 'radix-ui';

import { Confetti } from '../fx/effects/confetti/confetti';
import { cx } from '../lib/cx';
import { NumberTicker } from '../number-ticker/number-ticker';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';

import { LevelBadge } from './level-badge';
import { xpRatio } from './xp-math';
import styles from './xp-bar.module.css';

export interface XpBarProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  level: number;
  /** Опыт внутри текущего уровня */
  xp: number;
  /** Сколько нужно на следующий уровень; 0 — уровень последний. Из суммы — `levelFromTotal` */
  xpToNext: number;
  /** Значок уровня слева */
  showLevel?: boolean;
  /** Конфетти из значка при повышении уровня; `data-effects="off"` и reduced-motion — без него */
  celebrate?: boolean;
  /** Подпись над полосой; по умолчанию «Опыт» */
  label?: ReactNode;
  /** Высота полосы: 4 / 6 px */
  size?: 'sm' | 'md';
  /** Локаль чисел; по умолчанию — из UiStringsProvider */
  locale?: string;
}

/**
 * Опыт до следующего уровня: значок уровня, числа перекатываются (`NumberTicker`), полоса — только
 * transform. При повышении уровня (проп `level` вырос) полоса набегает заново, значок вспыхивает, из него —
 * локальное конфетти (`fx/effects` Confetti), скринридер слышит «Новый уровень».
 */
export function XpBar({
  level,
  xp,
  xpToNext,
  showLevel = true,
  celebrate = true,
  label,
  size = 'md',
  locale: localeProp,
  className,
  ...rest
}: XpBarProps) {
  const text = useUiStrings().xpBar;
  const locale = useUiLocale(localeProp);
  const [previous, setPrevious] = useState(level);
  const [levelUps, setLevelUps] = useState(0);
  const max = !(xpToNext > 0);
  const ratio = xpRatio(xp, xpToNext);

  if (level !== previous) {
    setPrevious(level);

    if (level > previous) setLevelUps((value) => value + 1);
  }

  const labelText = typeof label === 'string' ? label : text.label;

  return (
    <div className={cx(styles.root, styles[size], className)} data-max={max || undefined} {...rest}>
      {showLevel && (
        <span className={styles.badgeSlot}>
          <LevelBadge level={level} size={size === 'sm' ? 'sm' : 'md'} />

          {celebrate && <Confetti fire={levelUps} count={28} power={90} reach={120} />}
        </span>
      )}

      <div className={styles.main}>
        <div className={styles.line}>
          <span className={styles.label}>{label ?? text.label}</span>

          <span className={styles.value} aria-hidden>
            {max ? (
              text.maxLevel
            ) : (
              <>
                <NumberTicker value={xp} locale={locale} />
                <span className={styles.of}>/</span>
                <NumberTicker value={xpToNext} locale={locale} />
                <span className={styles.unit}>{text.unit}</span>
              </>
            )}
          </span>
        </div>

        <div
          role="progressbar"
          aria-label={labelText}
          aria-valuemin={0}
          aria-valuemax={max ? 1 : xpToNext}
          aria-valuenow={max ? 1 : Math.min(Math.max(xp, 0), xpToNext)}
          aria-valuetext={max ? text.maxLevel : text.value(xp, xpToNext)}
          className={styles.track}
        >
          {/* Ключ — уровень: новая полоса набегает с нуля, а не откатывается назад от полной */}
          <span
            key={level}
            className={styles.fill}
            data-levelup={levelUps > 0 || undefined}
            style={{ '--xp-ratio': ratio } as CSSProperties}
          />
        </div>
      </div>

      <VisuallyHidden.Root role="status">
        {levelUps > 0 ? text.levelUp(level) : ''}
      </VisuallyHidden.Root>
    </div>
  );
}
