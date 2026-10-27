import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';

import { Avatar } from '../avatar/avatar';
import { Badge } from '../badge/badge';
import { Emblem } from '../emblem/emblem';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './space-header.module.css';

export interface SpaceHeaderProps extends Omit<ComponentPropsWithRef<'header'>, 'title' | 'color'> {
  name: string;
  /** Адрес пространства — моно под именем: `haunt.chat/s/<address>` */
  address?: string;
  /** Пара строк о пространстве */
  description?: ReactNode;
  /** Картинка-знак; без неё — процедурная `Emblem` по `seed` (или имени), как у `InviteCard` */
  iconSrc?: string;
  seed?: string;
  /** Обложка — картинка над шапкой; без неё полосу окрашивает аура цвета пространства */
  banner?: string;
  /** Цвет пространства вместо акцента — цвет ауры */
  color?: string;
  members?: number;
  online?: number;
  tags?: readonly string[];
  /** Вступить, пригласить, меню */
  actions?: ReactNode;
  /** Вкладки разделов под шапкой — `Tabs.List` */
  tabs?: ReactNode;
  /** page — полная, с обложкой; compact — строка для `Sticky`, когда полная уехала при прокрутке */
  variant?: 'page' | 'compact';
}

/**
 * Лицо пространства — как шапка сообщества у Reddit: обложка или аура цвета пространства, знак, имя и
 * адрес, счётчики, описание, теги, действия и вкладки разделов. `compact` — одна строка (знак, имя, кто в
 * сети, действия) для полосы, которая прилипает, когда полная шапка уехала вверх. Данные — пропсы:
 * пространство приходит от экрана.
 */
export function SpaceHeader({
  name,
  address,
  description,
  iconSrc,
  seed,
  banner,
  color,
  members,
  online,
  tags,
  actions,
  tabs,
  variant = 'page',
  className,
  style,
  ...rest
}: SpaceHeaderProps) {
  const strings = useUiStrings().spaceHeader;
  const compact = variant === 'compact';
  const icon = iconSrc ? (
    <Avatar name={name} src={iconSrc} size={compact ? 'sm' : 'xl'} shape="rounded" />
  ) : (
    <Emblem seed={seed ?? name} size={compact ? 24 : 56} />
  );
  const stats = (
    <span className={styles.stats}>
      {!compact && members !== undefined && <span>{strings.members(members)}</span>}

      {online !== undefined && <span className={styles.online}>{strings.online(online)}</span>}
    </span>
  );

  return (
    <header
      className={cx(styles.root, className)}
      data-variant={variant}
      style={{ '--space-color': color, ...style } as CSSProperties}
      {...rest}
    >
      {!compact && (
        <div className={styles.banner} data-image={banner ? '' : undefined}>
          {banner && <img src={banner} alt="" className={styles.bannerImage} />}
        </div>
      )}

      <div className={styles.row}>
        <span className={styles.icon}>{icon}</span>

        <div className={styles.title}>
          {compact ? (
            <span className={styles.name}>{name}</span>
          ) : (
            <h1 className={styles.name}>{name}</h1>
          )}

          {!compact && address && <span className={styles.address}>{address}</span>}

          {(members !== undefined || online !== undefined) && stats}
        </div>

        {actions && <div className={styles.actions}>{actions}</div>}
      </div>

      {!compact && description && <p className={styles.description}>{description}</p>}

      {!compact && tags && tags.length > 0 && (
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

      {!compact && tabs && <div className={styles.tabs}>{tabs}</div>}
    </header>
  );
}
