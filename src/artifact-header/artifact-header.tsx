import type { ComponentPropsWithRef, ReactNode } from 'react';

import { GitMerge } from 'lucide-react';

import { Badge } from '../badge/badge';
import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';
import { Timestamp } from '../timestamp/timestamp';
import type { TimestampInput } from '../timestamp/timestamp-format';

import styles from './artifact-header.module.css';

export interface ArtifactHeaderProps extends Omit<ComponentPropsWithRef<'header'>, 'title'> {
  title: ReactNode;
  /** Что это — метка над заголовком: «Документ», «Пост», «Вики», «Решение» */
  kind?: ReactNode;
  /** Автор — имя или `ProfileHoverCard` с аватаром и ссылкой: экран решает, что за ним открывается */
  author?: ReactNode;
  /** Место, где лежит: ссылка `#дизайн` */
  place?: ReactNode;
  /** Когда создан */
  date?: TimestampInput;
  /** Когда изменён — «изменено …» после даты */
  updatedAt?: TimestampInput;
  /** Откуда собран: место обсуждения, из которого артефакт кристаллизовался */
  origin?: ReactNode;
  tags?: readonly string[];
  /** Редактировать, поделиться, меню */
  actions?: ReactNode;
  /** Локаль даты; по умолчанию — из UiStringsProvider */
  locale?: string;
}

/**
 * Шапка артефакта или поста: метка вида, заголовок страницы, строка «автор · место · когда (изменено)»,
 * откуда собран — артефакт кристаллизуется из обсуждения в потоке, и связь с источником видна сразу, —
 * теги и действия. Для страницы под `PageLayout width="reading"`.
 */
export function ArtifactHeader({
  title,
  kind,
  author,
  place,
  date,
  updatedAt,
  origin,
  tags,
  actions,
  locale: localeProp,
  className,
  ...rest
}: ArtifactHeaderProps) {
  const strings = useUiStrings().artifactHeader;
  const locale = useUiLocale(localeProp);
  const meta = [
    author && <span key="author">{author}</span>,
    place && <span key="place">{place}</span>,
    date !== undefined && (
      <span key="date">
        <Timestamp date={date} locale={locale} />
      </span>
    ),
    updatedAt !== undefined && (
      <span key="updated" className={styles.updated}>
        {strings.updated} <Timestamp date={updatedAt} locale={locale} />
      </span>
    ),
  ].filter(Boolean);

  return (
    <header className={cx(styles.root, className)} {...rest}>
      {kind && <span className={styles.kind}>{kind}</span>}

      <div className={styles.titleRow}>
        <h1 className={styles.title}>{title}</h1>

        {actions && <div className={styles.actions}>{actions}</div>}
      </div>

      {meta.length > 0 && <div className={styles.meta}>{meta}</div>}

      {origin && (
        <p className={styles.origin}>
          <Icon icon={GitMerge} size="xs" />

          <span>
            {strings.origin} {origin}
          </span>
        </p>
      )}

      {tags && tags.length > 0 && (
        <ul className={styles.tags} aria-label={strings.tags}>
          {tags.map((tag) => (
            <li key={tag}>
              <Badge size="sm" bracket>
                {tag}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
