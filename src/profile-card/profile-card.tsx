import type { ComponentPropsWithRef, CSSProperties, ReactNode } from 'react';

import { Avatar, type AvatarStatus } from '../avatar/avatar';
import { cx } from '../lib/cx';
import { Markdown } from '../markdown/markdown';
import type { MentionResolver } from '../markdown/markdown-types';
import { useUiStrings } from '../strings/ui-strings-context';
import { Tooltip } from '../tooltip/tooltip';

import styles from './profile-card.module.css';

export interface ProfileRole {
  /** Ключ списка; по умолчанию — название */
  id?: string;
  name: string;
  /** Цвет роли — точка и тон таблетки; без него — нейтральная */
  color?: string;
}

export interface ProfileBadge {
  id?: string;
  /** Название значка — подсказка и подпись для скринридера */
  label: string;
  /** Иконка или картинка значка */
  icon: ReactNode;
}

export interface ProfileCardProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  name: string;
  /** Ник без @ */
  handle?: string;
  avatarSrc?: string;
  status?: AvatarStatus;
  /** Обложка — картинка в рамке над именем; без неё карточку окрашивает только аура */
  banner?: string;
  /** Цвет профиля вместо акцента пространства — цвет ауры */
  bannerColor?: string;
  /** Строка под именем: местоимения, «в Haunt с марта», активность */
  subtitle?: ReactNode;
  roles?: readonly ProfileRole[];
  badges?: readonly ProfileBadge[];
  /** «О себе» — markdown одной строкой (`Markdown inline`): ссылки, упоминания, жирный */
  bio?: string;
  resolveMention?: MentionResolver;
  /** Кнопки действий: «Написать», «Профиль», меню */
  actions?: ReactNode;
  /** `popover` — компактная карточка по наведению на имя; `page` — шапка страницы профиля */
  variant?: 'popover' | 'page';
  /** Дополнительные блоки внизу: опыт, репутация, награды */
  children?: ReactNode;
}

/**
 * Карточка профиля — «пропуск» Haunt: из угла карточки светится аура цвета профиля (`bannerColor`, иначе
 * акцент пространства), рядом с именем — аватар-скруглённый квадрат, статус — словом в моно-строке под
 * ником, значки — отметками рядом с именем. Разделы подписаны комментариями TUI (`// о себе`), роли — метками в скобках цветом роли, как
 * бейджи у автора в ленте. Обложка (`banner`) — картинка в рамке над именем, а не фон под аватаром.
 * В поповере — `ProfileHoverCard`.
 */
export function ProfileCard({
  name,
  handle,
  avatarSrc,
  status,
  banner,
  bannerColor,
  subtitle,
  roles,
  badges,
  bio,
  resolveMention,
  actions,
  variant = 'popover',
  children,
  className,
  style,
  ...rest
}: ProfileCardProps) {
  const strings = useUiStrings();
  const text = strings.profileCard;
  const auraStyle = bannerColor ? ({ '--aura': bannerColor } as CSSProperties) : undefined;

  return (
    <div
      className={cx(styles.card, styles[variant], className)}
      data-variant={variant}
      style={{ ...auraStyle, ...style }}
      {...rest}
    >
      <span className={styles.aura} data-grain aria-hidden />

      {banner && <img src={banner} alt="" className={styles.cover} />}

      <div className={styles.head}>
        <Avatar
          name={name}
          src={avatarSrc}
          size={variant === 'page' ? 'xl' : 'lg'}
          shape="rounded"
          className={styles.avatar}
        />

        <div className={styles.identity}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{name}</span>

            {badges && badges.length > 0 && (
              <ul className={styles.badges} aria-label={text.badges}>
                {badges.map((badge) => (
                  <li key={badge.id ?? badge.label}>
                    <Tooltip content={badge.label}>
                      <span
                        className={styles.badge}
                        role="img"
                        aria-label={badge.label}
                        tabIndex={0}
                      >
                        {badge.icon}
                      </span>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(handle || status) && (
            <span className={styles.meta}>
              {handle && <span className={styles.handle}>@{handle}</span>}

              {status && (
                <span className={styles.status} data-status={status}>
                  {strings.avatar.status[status]}
                </span>
              )}
            </span>
          )}

          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </div>

        {actions && variant === 'page' && <div className={styles.actions}>{actions}</div>}
      </div>

      <div className={styles.body}>
        {bio && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{text.about}</h3>

            <Markdown inline resolveMention={resolveMention} className={styles.bio}>
              {bio}
            </Markdown>
          </section>
        )}

        {roles && roles.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{text.roles}</h3>

            <ul className={styles.roles}>
              {roles.map((role) => (
                <li
                  key={role.id ?? role.name}
                  className={styles.role}
                  style={role.color ? ({ '--role-color': role.color } as CSSProperties) : undefined}
                >
                  {role.name}
                </li>
              ))}
            </ul>
          </section>
        )}

        {children}

        {actions && variant === 'popover' && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}
