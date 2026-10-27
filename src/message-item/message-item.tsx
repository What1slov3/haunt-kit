import {
  useId,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { CircleAlert } from 'lucide-react';
import { ContextMenu as RadixContextMenu, VisuallyHidden } from 'radix-ui';

import { Button } from '../button/button';
import { ContextMenuContent } from '../context-menu/context-menu-parts';
import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';
import { Timestamp, type TimestampMode } from '../timestamp/timestamp';
import { formatExact, toDate, type TimestampInput } from '../timestamp/timestamp-format';
import { Tooltip } from '../tooltip/tooltip';

import styles from './message-item.module.css';

export interface MessageItemProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'title' | 'contextMenu'
> {
  /** Имя автора; узел — если имя кликается (карточка профиля) */
  author: ReactNode;
  /** Цвет роли автора — любой CSS-цвет; без него — цвет текста */
  authorColor?: string;
  /** Аватар первого сообщения группы (`Avatar size="lg" shape="rounded"`) */
  avatar?: ReactNode;
  /** Роли и пометки после имени (`Badge`) */
  badges?: ReactNode;
  /** Время отправки */
  timestamp: TimestampInput;
  /** Как подписать время в шапке; слева у продолжения — всегда часы */
  timeMode?: TimestampMode;
  /** Тело — обычно `Markdown`; при `editing` — поле правки */
  children?: ReactNode;
  /** Цитата ответа над шапкой — `ReplyPreview` */
  reply?: ReactNode;
  /** Вложения под телом — `MessageMedia`, `AttachmentCard`, `LinkPreview` */
  attachments?: ReactNode;
  /** Реакции под вложениями — `ReactionBar` */
  reactions?: ReactNode;
  /** Кнопки панели действий при наведении и фокусе внутри */
  actions?: ReactNode;
  /** Держать панель действий видимой — пока открыто меню из неё */
  actionsOpen?: boolean;
  /** Пункты контекстного меню (`ContextMenu.Item`…): правая кнопка, клавиша меню, Shift+F10 */
  contextMenu?: ReactNode;
  /** Продолжение группы: без аватара и шапки — след автора в колонке, время справа при наведении */
  grouped?: boolean;
  /**
   * Последнее в группе: отступ снизу, как у начала группы сверху. С `groupMessages` — `!grouped[i + 1]`;
   * строка сама не знает, что идёт за ней (в VirtualList соседи — в разных элементах списка)
   */
  groupEnd?: boolean;
  /** Компактная лента: время, имя и текст в строку, без аватара */
  compact?: boolean;
  /** Подсвечено: переход к сообщению, результат поиска, закреплённое */
  highlighted?: boolean;
  /** Упоминает текущего пользователя — тон акцента и полоса слева */
  mentioned?: boolean;
  /** Идёт правка — в `children` поле правки, панель действий скрыта */
  editing?: boolean;
  /** Отправляется — приглушено */
  pending?: boolean;
  /** Не отправлено — пометка и «Повторить» */
  failed?: boolean;
  onRetry?: () => void;
  /** Изменено: `true` или время правки (тогда точное время — в подсказке) */
  edited?: boolean | TimestampInput;
  /** Удалено: вместо тела — пометка, вложений, реакций и действий нет */
  deleted?: boolean;
  /** ↑ / ↓ переводят фокус на соседние сообщения; по умолчанию да */
  arrowNavigation?: boolean;
  /** Локаль времени; по умолчанию из UiStringsProvider */
  locale?: string;
  /** Подписи поверх словаря */
  retryLabel?: string;
  editedLabel?: string;
  deletedLabel?: string;
  actionsLabel?: string;
}

/** Строки ленты: соседи для ↑ / ↓ ищутся внутри ближайшего списка, иначе — во всём документе */
const ITEM_SELECTOR = '[data-message-item]';
const LIST_SELECTOR = "[data-message-list], [role='log'], [role='feed'], [role='list']";

function focusSibling(item: HTMLElement, step: 1 | -1) {
  // VirtualList кладёт каждую строку в свой listitem — список ищется выше него
  const scope = item.parentElement?.closest(LIST_SELECTOR) ?? item.ownerDocument;
  const items = Array.from(scope.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
  const next = items[items.indexOf(item) + step];

  if (!next) return false;

  next.focus();
  next.scrollIntoView({ block: 'nearest' });

  return true;
}

/**
 * Строка ленты сообщений — раскладка без бизнес-логики, всё пропсами и слотами: аватар, шапка (имя цветом
 * роли, бейджи), цитата ответа, тело, вложения, реакции. Первое в группе — с аватаром и шапкой; от аватара
 * вниз вдоль продолжений (`grouped`) идёт след — линия цвета автора, сообщения человека читаются одной
 * нитью. Время — моно у правого края первой строки (у продолжения — при наведении), действия при наведении
 * и фокусе встают рядом с ним в той же строке. Шапка продолжения скрыта только визуально, скринридер
 * слышит автора у каждого сообщения. Строка
 * фокусируема, ↑ / ↓ — соседние сообщения. Группировку считает `groupMessages`.
 */
export function MessageItem({
  author,
  authorColor,
  avatar,
  badges,
  timestamp,
  timeMode = 'relative',
  children,
  reply,
  attachments,
  reactions,
  actions,
  actionsOpen = false,
  contextMenu,
  grouped = false,
  groupEnd = false,
  compact = false,
  highlighted = false,
  mentioned = false,
  editing = false,
  pending = false,
  failed = false,
  onRetry,
  edited = false,
  deleted = false,
  arrowNavigation = true,
  locale: localeProp,
  retryLabel,
  editedLabel,
  deletedLabel,
  actionsLabel,
  className,
  style,
  onKeyDown,
  ...rest
}: MessageItemProps) {
  const strings = useUiStrings().messageItem;
  const locale = useUiLocale(localeProp);
  const authorId = useId();
  const timeId = useId();
  // Цитата ответа всегда начинает сообщение с шапкой: без автора не понять, кто отвечает
  const continued = grouped && !reply && !compact;
  const showActions = Boolean(actions) && !deleted && !editing;
  const editedDate = edited !== false && edited !== true ? toDate(edited) : null;

  const editedMark = edited !== false && !deleted && (
    <span className={styles.edited}>{editedLabel ?? strings.edited}</span>
  );

  const name = (
    <>
      <span id={authorId} className={styles.author}>
        {author}
      </span>

      {badges && <span className={styles.badges}>{badges}</span>}
    </>
  );

  const header = <div className={cx(styles.header, continued && styles.hiddenHeader)}>{name}</div>;

  const row = (
    <div
      role="article"
      tabIndex={0}
      aria-labelledby={`${authorId} ${timeId}`}
      aria-busy={pending || undefined}
      data-message-item=""
      data-grouped={continued || undefined}
      data-group-end={groupEnd || undefined}
      data-compact={compact || undefined}
      data-highlighted={highlighted || undefined}
      data-mentioned={mentioned || undefined}
      data-editing={editing || undefined}
      data-pending={pending || undefined}
      data-failed={failed || undefined}
      data-deleted={deleted || undefined}
      data-actions-open={(showActions && actionsOpen) || undefined}
      className={cx(styles.root, className)}
      style={
        authorColor ? ({ '--message-author-color': authorColor, ...style } as CSSProperties) : style
      }
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event);

        if (event.defaultPrevented || !arrowNavigation || event.target !== event.currentTarget)
          return;

        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

        if (focusSibling(event.currentTarget, event.key === 'ArrowUp' ? -1 : 1)) {
          event.preventDefault();
        }
      }}
      {...rest}
    >
      {reply && <div className={styles.reply}>{reply}</div>}

      <div className={styles.row}>
        <div className={styles.gutter}>
          {compact ? (
            <Timestamp
              date={timestamp}
              mode="time"
              locale={locale}
              className={styles.gutterTime}
              aria-hidden
            />
          ) : (
            !continued && avatar
          )}
        </div>

        <div className={styles.content}>
          {compact ? (
            <div className={styles.header}>
              {name}

              {/* Время видно слева; полное — для скринридера, оно же в подписи строки */}
              <VisuallyHidden.Root>
                <Timestamp
                  id={timeId}
                  date={timestamp}
                  mode={timeMode}
                  locale={locale}
                  tooltip={false}
                />
              </VisuallyHidden.Root>
            </div>
          ) : (
            header
          )}

          <div className={styles.body}>
            {deleted ? (
              <span className={styles.deleted}>{deletedLabel ?? strings.deleted}</span>
            ) : (
              children
            )}

            {editedMark &&
              (editedDate ? (
                <Tooltip content={strings.editedAt(formatExact(editedDate, locale))}>
                  {editedMark}
                </Tooltip>
              ) : (
                editedMark
              ))}

            {pending && <VisuallyHidden.Root>{strings.pending}</VisuallyHidden.Root>}

            {editing && <VisuallyHidden.Root>{strings.editing}</VisuallyHidden.Root>}
          </div>

          {!deleted && attachments && <div className={styles.attachments}>{attachments}</div>}

          {failed && !deleted && (
            <div className={styles.failure}>
              <Icon icon={CircleAlert} size="sm" />
              <span>{strings.failed}</span>

              {onRetry && (
                <Button size="sm" variant="ghost" className={styles.retry} onClick={onRetry}>
                  {retryLabel ?? strings.retry}
                </Button>
              )}
            </div>
          )}

          {!deleted && reactions && <div className={styles.reactions}>{reactions}</div>}
        </div>
      </div>

      {/* Время и действия делят правый край первой строки: действия встают рядом, а не над сообщением */}
      <div className={styles.aside}>
        {showActions && (
          <div role="group" aria-label={actionsLabel ?? strings.actions} className={styles.actions}>
            {actions}
          </div>
        )}

        {!compact && (
          <Timestamp
            id={timeId}
            date={timestamp}
            mode={timeMode}
            locale={locale}
            className={styles.time}
          />
        )}
      </div>
    </div>
  );

  if (!contextMenu || deleted) return row;

  return (
    <RadixContextMenu.Root>
      <RadixContextMenu.Trigger asChild>{row}</RadixContextMenu.Trigger>
      <ContextMenuContent>{contextMenu}</ContextMenuContent>
    </RadixContextMenu.Root>
  );
}
