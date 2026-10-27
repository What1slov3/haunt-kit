import { useRef, type ComponentPropsWithRef, type ElementType, type ReactNode } from 'react';

import { Badge } from '../badge/badge';
import { cx } from '../lib/cx';
import { useSharedIndicator } from '../lib/use-shared-indicator';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './nav-item.module.css';

export interface NavItemProps extends ComponentPropsWithRef<'button'> {
  /** Иконка канала или аватар участника слева */
  icon?: ReactNode;
  /** Подстрока под названием: последнее сообщение, роль; выключает compact */
  description?: ReactNode;
  /** Счётчик непрочитанных справа; 0 не показывается */
  unread?: number;
  /** Есть непрочитанное без счётчика — название ярче */
  hasUnread?: boolean;
  /** Упоминание — счётчик красный */
  mention?: boolean;
  /** Открытый канал: подсветка с градиентной кромкой и aria-current="page" */
  active?: boolean;
  /** Заглушённый канал или участник не в сети — приглушённый текст */
  muted?: boolean;
  /** Кнопки справа, видны при наведении и фокусе внутри строки */
  actions?: ReactNode;
  /** 28 px без описания (каналы), 32 px (участники с аватаром); с description — всегда выше */
  density?: 'compact' | 'default';
  /** Со ссылкой рендерится как <a>; при появлении роутера сюда придёт его Link через as */
  href?: string;
  as?: ElementType;
  /**
   * Общий id для строк одного списка: подсветка активной строки переезжает между ними, а не прыгает
   * (FLIP через useSharedIndicator). Без него подсветка статична.
   */
  activeLayoutId?: string;
}

/** Подсветка активной строки с градиентной кромкой; с группой — переезжает от прежней активной */
function NavHighlight({ group }: { group?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useSharedIndicator(group, ref);

  return <span ref={ref} className={styles.highlight} data-edge="gradient" aria-hidden />;
}

/**
 * Строка списка каналов или участников. С `actions` строка — обёртка <div>, а кнопка строки и
 * кнопки действий лежат рядом: вложенные <button> запрещены в HTML и ломают гидрацию.
 */
export function NavItem({
  icon,
  description,
  unread,
  hasUnread,
  mention,
  active,
  muted,
  actions,
  density = 'compact',
  href,
  as,
  activeLayoutId,
  className,
  children,
  ...rest
}: NavItemProps) {
  const strings = useUiStrings();
  const Component: ElementType = as ?? (href ? 'a' : 'button');
  const showUnread = unread !== undefined && unread > 0;
  const unreadLabel = unread !== undefined && unread > 99 ? '99+' : unread;

  const highlight = active ? <NavHighlight group={activeLayoutId} /> : null;

  const item = (
    <Component
      type={Component === 'button' ? 'button' : undefined}
      href={href}
      data-active={active || undefined}
      data-muted={muted || undefined}
      data-unread={hasUnread || showUnread || undefined}
      aria-current={active ? 'page' : undefined}
      className={cx(
        styles.item,
        styles[density],
        Boolean(description) && styles.withDescription,
        !actions && className,
      )}
      {...rest}
    >
      {highlight}

      {icon && <span className={styles.icon}>{icon}</span>}

      <span className={styles.text}>
        <span className={styles.label}>{children}</span>

        {description && <span className={styles.description}>{description}</span>}
      </span>

      {showUnread && (
        <Badge
          size="sm"
          variant="solid"
          tone={mention ? 'danger' : 'neutral'}
          className={styles.unread}
          aria-label={strings.navItem.unread(unread ?? 0)}
        >
          {unreadLabel}
        </Badge>
      )}
    </Component>
  );

  if (!actions) return item;

  return (
    <div className={cx(styles.row, className)}>
      {item}

      <span className={styles.actions}>{actions}</span>
    </div>
  );
}
