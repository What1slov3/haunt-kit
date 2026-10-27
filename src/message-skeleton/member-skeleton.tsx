import type { ComponentPropsWithRef } from 'react';

import { VisuallyHidden } from 'radix-ui';

import { cx } from '../lib/cx';
import { Skeleton } from '../skeleton/skeleton';
import { useUiStrings } from '../strings/ui-strings-context';

import { memberRows } from './skeleton-rows';
import styles from './message-skeleton.module.css';

export interface MemberSkeletonProps extends ComponentPropsWithRef<'div'> {
  /** Сколько участников */
  count?: number;
  seed?: number;
  /** Строка активности под именем: «играет в …» */
  activity?: boolean;
  /** Заглушка подписи группы над списком («В сети — 12») */
  heading?: boolean;
  /** Подпись для скринридера; по умолчанию «Загрузка участников» */
  label?: string;
}

/**
 * Заглушка списка участников: строки высоты `NavItem` (28 / 32 px) с круглым аватаром и именем разной длины,
 * по желанию — подпись группы и строка активности.
 */
export function MemberSkeleton({
  count = 8,
  seed = 1,
  activity,
  heading,
  label,
  className,
  ...rest
}: MemberSkeletonProps) {
  const text = useUiStrings().memberSkeleton;
  const widths = memberRows(count, seed);

  return (
    <div
      role="status"
      aria-busy
      className={cx(styles.members, activity && styles.withActivity, className)}
      {...rest}
    >
      <VisuallyHidden.Root>{label ?? text.label}</VisuallyHidden.Root>

      {heading && (
        <span className={styles.heading} aria-hidden>
          <Skeleton width={72} height={8} />
        </span>
      )}

      {widths.map((width, index) => (
        <div key={index} className={styles.member} aria-hidden>
          <Skeleton circle width={activity ? 32 : 24} />

          <span className={styles.memberText}>
            <Skeleton width={`${width}%`} height={10} />

            {activity && <Skeleton width={`${Math.max(30, width - 20)}%`} height={8} />}
          </span>
        </div>
      ))}
    </div>
  );
}
