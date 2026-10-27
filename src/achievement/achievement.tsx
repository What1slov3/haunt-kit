import type { ComponentPropsWithRef, ReactNode } from 'react';

import { Lock } from 'lucide-react';

import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { Progress } from '../progress/progress';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';
import { Timestamp } from '../timestamp/timestamp';
import type { TimestampInput } from '../timestamp/timestamp-format';

import type { AchievementRarity } from './achievement-rarity';
import styles from './achievement.module.css';

export type { AchievementRarity } from './achievement-rarity';

export interface AchievementProgress {
  value: number;
  max: number;
}

export interface AchievementProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  name: string;
  description?: ReactNode;
  /** Знак награды: иконка lucide, эмодзи или картинка */
  icon: ReactNode;
  /** Редкость: цвет медали, свечение и блик */
  rarity?: AchievementRarity;
  /** Ещё не получено: медаль погашена, замок */
  locked?: boolean;
  /** Прогресс к получению — у заблокированной: «3 из 10» */
  progress?: AchievementProgress;
  /** Когда получено */
  unlockedAt?: TimestampInput;
  /** tile — карточка в сетке наград, row — строка списка */
  layout?: 'tile' | 'row';
  /** Локаль чисел и даты; по умолчанию — из UiStringsProvider */
  locale?: string;
}

/**
 * Награда с редкостью: медаль цвета редкости, свечение растёт с редкостью (`--fx-glow`), у эпической и
 * легендарной — блик по наведению и фокусу (легендарная бликует и при появлении, дважды). Постоянного
 * движения нет. `data-effects="off"` — статичная медаль, редкость читается цветом и подписью. Заблокированная —
 * погашена, с замком и прогрессом к получению.
 */
export function Achievement({
  name,
  description,
  icon,
  rarity = 'common',
  locked,
  progress,
  unlockedAt,
  layout = 'tile',
  locale: localeProp,
  className,
  ...rest
}: AchievementProps) {
  const text = useUiStrings().achievement;
  const locale = useUiLocale(localeProp);
  const showProgress = locked && progress && progress.max > 0;
  const percent = showProgress ? Math.min(100, (progress.value / progress.max) * 100) : 0;

  return (
    <div
      className={cx(styles.root, styles[layout], className)}
      data-rarity={rarity}
      data-locked={locked || undefined}
      {...rest}
    >
      <span className={styles.medal} aria-hidden>
        <span className={styles.icon}>{icon}</span>

        {locked && (
          <span className={styles.lock}>
            <Icon icon={Lock} size="xs" />
          </span>
        )}
      </span>

      <div className={styles.text}>
        <span className={styles.rarity}>
          {text.rarity[rarity]}
          {locked && <span className={styles.state}>{text.locked}</span>}
        </span>

        <span className={styles.name}>{name}</span>

        {description && <span className={styles.description}>{description}</span>}

        {showProgress && (
          <span className={styles.progress}>
            <Progress
              value={percent}
              size="sm"
              label={`${name}: ${text.progress(progress.value, progress.max)}`}
            />

            <span className={styles.progressValue}>
              {progress.value.toLocaleString(locale)}/{progress.max.toLocaleString(locale)}
            </span>
          </span>
        )}

        {!locked && unlockedAt !== undefined && (
          <span className={styles.date}>
            {text.unlocked} <Timestamp date={unlockedAt} mode="date" locale={locale} />
          </span>
        )}
      </div>
    </div>
  );
}
