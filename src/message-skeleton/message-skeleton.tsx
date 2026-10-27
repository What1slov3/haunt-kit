import type { ComponentPropsWithRef } from 'react';

import { VisuallyHidden } from 'radix-ui';

import { cx } from '../lib/cx';
import { Skeleton } from '../skeleton/skeleton';
import { useUiStrings } from '../strings/ui-strings-context';

import { messageRows } from './skeleton-rows';
import styles from './message-skeleton.module.css';

export interface MessageSkeletonProps extends ComponentPropsWithRef<'div'> {
  /** Сколько сообщений */
  count?: number;
  /** Ширины строк псевдослучайны, но устойчивы по seed: лента не прыгает между рендерами */
  seed?: number;
  /** Доля сообщений с плашкой вложения, 0–1 */
  attachments?: number;
  /** Без аватара и имени — продолжения одного автора, плотнее */
  compact?: boolean;
  /** Подпись для скринридера; по умолчанию «Загрузка сообщений» */
  label?: string;
}

/**
 * Заглушка ленты на `Skeleton`: аватар, имя, время и 1–3 строки разной длины, изредка — вложение. Та же
 * сетка, что у строки сообщения, поэтому лента после загрузки не сдвигается. Перелив — у `Skeleton`
 * (`data-effects="off"` и reduced-motion — пульс).
 */
export function MessageSkeleton({
  count = 4,
  seed = 1,
  attachments = 0,
  compact,
  label,
  className,
  ...rest
}: MessageSkeletonProps) {
  const text = useUiStrings().messageSkeleton;
  const rows = messageRows(count, { seed, attachments });

  return (
    <div
      role="status"
      aria-busy
      className={cx(styles.feed, compact && styles.compact, className)}
      {...rest}
    >
      <VisuallyHidden.Root>{label ?? text.label}</VisuallyHidden.Root>

      {rows.map((row, index) => (
        <div key={index} className={styles.message} aria-hidden>
          {!compact && <Skeleton width={32} height={32} radius="md" className={styles.avatar} />}

          <div className={styles.content}>
            {!compact && (
              <div className={styles.meta}>
                <Skeleton width={row.name} height={12} />
                <Skeleton width={36} height={10} />
              </div>
            )}

            {row.lines.map((width, line) => (
              <Skeleton key={line} width={`${width}%`} height={10} />
            ))}

            {row.attachment && (
              <Skeleton width={240} height={140} radius="lg" className={styles.attachment} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
