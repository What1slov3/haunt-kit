import type { ComponentPropsWithRef, CSSProperties } from 'react';

import { CornerDownRight, CornerUpLeft, Image, X } from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';

import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import { replyExcerpt } from './reply-excerpt';
import styles from './reply-preview.module.css';

export type ReplyPreviewVariant = 'inline' | 'composer';

export interface ReplyPreviewProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Имя автора исходного сообщения */
  author: string;
  /** Цвет роли автора — любой CSS-цвет; без него — цвет текста */
  authorColor?: string;
  /** Текст исходного сообщения; в цитату идёт первая строка без разметки */
  text?: string;
  /** Сколько вложений: без текста цитата — «Вложение» / «3 вложения» */
  attachments?: number;
  /** Исходное сообщение удалено — имени и текста нет */
  deleted?: boolean;
  /** inline — над телом сообщения, composer — над полем ввода с крестиком */
  variant?: ReplyPreviewVariant;
  /** Переход к исходному сообщению; без него цитата не кликается */
  onJump?: () => void;
  /** Отменить ответ — крестик у варианта composer */
  onClose?: () => void;
  /** Подписи поверх словаря */
  closeLabel?: string;
  attachmentLabel?: string;
}

/**
 * Цитата ответа: имя цветом роли и первая строка исходного сообщения (без разметки, спойлер закрыт) или
 * «вложение». `inline` — строка-след над шапкой сообщения: `↳ Имя · текст`, клик ведёт к исходному;
 * `composer` — плашка над полем ввода: «Ответ пользователю Имя» и крестик отмены.
 */
export function ReplyPreview({
  author,
  authorColor,
  text,
  attachments = 0,
  deleted = false,
  variant = 'inline',
  onJump,
  onClose,
  closeLabel,
  attachmentLabel,
  className,
  style,
  ...rest
}: ReplyPreviewProps) {
  const strings = useUiStrings().replyPreview;
  const excerpt = text ? replyExcerpt(text) : '';
  const attachmentText =
    attachmentLabel ?? (attachments > 1 ? strings.attachments(attachments) : strings.attachment);

  const summary = deleted ? (
    <span className={styles.missing}>{strings.deleted}</span>
  ) : (
    <>
      {variant === 'inline' && (
        <Icon icon={CornerDownRight} size="xs" className={styles.trailIcon} />
      )}
      {variant === 'composer' && <span className={styles.prefix}>{strings.replyingTo}</span>}
      {variant === 'composer' && ' '}
      <span className={styles.author}>{author}</span>
      {/* Пробел — чтобы скринридер не склеил имя с текстом: имя вычисляется из содержимого без отступов */}{' '}
      {excerpt ? (
        <span className={styles.text}>{excerpt}</span>
      ) : (
        attachments > 0 && <span className={styles.missing}>{attachmentText}</span>
      )}
      {excerpt && attachments > 0 && (
        <Icon icon={Image} size="xs" className={styles.attachmentIcon} label={attachmentText} />
      )}
    </>
  );

  const body = (
    <>
      {variant === 'inline' && <VisuallyHidden.Root>{strings.replyTo} </VisuallyHidden.Root>}
      {summary}
    </>
  );

  return (
    <div
      className={cx(styles.root, styles[variant], className)}
      style={
        authorColor ? ({ '--reply-author-color': authorColor, ...style } as CSSProperties) : style
      }
      data-deleted={deleted || undefined}
      {...rest}
    >
      {variant === 'composer' && (
        <Icon icon={CornerUpLeft} size="sm" className={styles.composerIcon} />
      )}

      {onJump && !deleted ? (
        <button type="button" className={styles.summary} onClick={onJump}>
          {body}
        </button>
      ) : (
        <span className={styles.summary}>{body}</span>
      )}

      {variant === 'composer' && onClose && (
        <IconButton
          label={closeLabel ?? strings.cancel}
          size="xs"
          className={styles.close}
          onClick={onClose}
        >
          <Icon icon={X} size="xs" />
        </IconButton>
      )}
    </div>
  );
}
