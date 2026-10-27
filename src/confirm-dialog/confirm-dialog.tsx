import { useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';

import { AlertDialog } from 'radix-ui';

import { Button } from '../button/button';
import dialogStyles from '../dialog/dialog.module.css';
import { Field } from '../field/field';
import { Input } from '../input/input';
import { cx } from '../lib/cx';
import { useReturnFocus } from '../lib/use-return-focus';
import { useUiStrings } from '../strings/ui-strings-context';
import { usePortalContainer } from '../theme/portal-container';

import styles from './confirm-dialog.module.css';

export interface ConfirmDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Кнопка, открывающая диалог (оборачивается в `AlertDialog.Trigger asChild`) */
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Подпись кнопки действия: глагол того, что случится, а не «ОК» */
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger — необратимое (удалить, выгнать), accent — важное, но обратимое */
  tone?: 'danger' | 'accent';
  /**
   * «Введите название, чтобы подтвердить»: кнопка действия активна только при точном совпадении. Для
   * действий, которые нельзя отменить и легко совершить по привычке (удалить канал, пространство)
   */
  confirmText?: string;
  /** Своя подпись поля подтверждения вместо «Введите «…», чтобы подтвердить» */
  confirmTextLabel?: ReactNode;
  /**
   * Действие. Promise — кнопка показывает загрузку, диалог закроется, когда он выполнится; отклонён — диалог
   * остаётся открытым (ошибку показывает вызывающий, например тостом)
   */
  onConfirm: () => void | Promise<unknown>;
  /** Дополнительное содержимое между описанием и кнопками: что именно пропадёт */
  children?: ReactNode;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as PromiseLike<unknown> | undefined)?.then === 'function';
}

/**
 * Подтверждение на Radix AlertDialog: в отличие от Dialog не закрывается кликом мимо, фокус при открытии —
 * на «Отмене» (Enter по привычке ничего не удалит), с `confirmText` — в поле ввода.
 */
export function ConfirmDialog({
  open,
  defaultOpen = false,
  onOpenChange,
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'danger',
  confirmText,
  confirmTextLabel,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const container = usePortalContainer();
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Без trigger диалог открывают из меню или сочетанием — Radix некуда вернуть фокус
  const returnFocus = useReturnFocus();
  const isOpen = open ?? innerOpen;

  const setOpen = (next: boolean) => {
    if (open === undefined) setInnerOpen(next);

    onOpenChange?.(next);
  };

  const confirm = async () => {
    const result = onConfirm();

    if (!isPromiseLike(result)) {
      setOpen(false);

      return;
    }

    setPending(true);

    try {
      await result;
      setOpen(false);
    } catch {
      // Ошибку показывает вызывающий; здесь только не закрываемся, чтобы можно было повторить
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog.Root open={isOpen} onOpenChange={(next) => !pending && setOpen(next)}>
      {trigger && <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>}

      <AlertDialog.Portal container={container}>
        <AlertDialog.Overlay className={dialogStyles.overlay} />

        <AlertDialog.Content
          className={cx(dialogStyles.content, dialogStyles.sm)}
          // Без описания Radix предупреждает в консоли; явный undefined при описании затёр бы его id
          {...(description ? {} : { 'aria-describedby': undefined })}
          onEscapeKeyDown={(event) => pending && event.preventDefault()}
          onCloseAutoFocus={trigger ? undefined : returnFocus.restore}
          onOpenAutoFocus={(event) => {
            if (!trigger) returnFocus.remember();
            if (confirmText === undefined) return;

            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <AlertDialog.Title className={dialogStyles.title}>{title}</AlertDialog.Title>

          {description && (
            <AlertDialog.Description className={dialogStyles.description}>
              {description}
            </AlertDialog.Description>
          )}

          {/* Отдельный компонент: набранный текст сбрасывается с каждым открытием */}
          <ConfirmBody
            inputRef={inputRef}
            confirmText={confirmText}
            confirmTextLabel={confirmTextLabel}
            confirmLabel={confirmLabel}
            cancelLabel={cancelLabel}
            tone={tone}
            pending={pending}
            onConfirm={() => void confirm()}
          >
            {children}
          </ConfirmBody>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

ConfirmDialog.displayName = 'ConfirmDialog';

interface ConfirmBodyProps extends Pick<
  ConfirmDialogProps,
  'confirmText' | 'confirmTextLabel' | 'confirmLabel' | 'cancelLabel' | 'tone' | 'children'
> {
  inputRef: RefObject<HTMLInputElement | null>;
  pending: boolean;
  onConfirm: () => void;
}

function ConfirmBody({
  inputRef,
  confirmText,
  confirmTextLabel,
  confirmLabel,
  cancelLabel,
  tone,
  pending,
  onConfirm,
  children,
}: ConfirmBodyProps) {
  const strings = useUiStrings();
  const [typed, setTyped] = useState('');
  // Пробелы по краям прощаем (вставка из буфера часто их приносит), регистр — нет: «General» ≠ «general»
  const matches = confirmText === undefined || typed.trim() === confirmText;

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (matches && !pending) onConfirm();
  };

  return (
    // Форма — чтобы Enter в поле подтверждения нажимал кнопку действия, когда текст совпал
    <form className={styles.form} onSubmit={submit}>
      {children && <div className={styles.extra}>{children}</div>}

      {confirmText !== undefined && (
        <Field
          className={styles.field}
          label={
            confirmTextLabel ?? (
              <>
                {strings.confirmDialog.typeBefore}
                <span className={styles.expected}>{confirmText}</span>
                {strings.confirmDialog.typeAfter}
              </>
            )
          }
        >
          <Input
            ref={inputRef}
            mono
            fullWidth
            autoComplete="off"
            spellCheck={false}
            value={typed}
            disabled={pending}
            onChange={(event) => setTyped(event.target.value)}
          />
        </Field>
      )}

      <div className={dialogStyles.footer}>
        <AlertDialog.Cancel asChild>
          <Button variant="ghost" disabled={pending}>
            {cancelLabel ?? strings.confirmDialog.cancel}
          </Button>
        </AlertDialog.Cancel>

        <Button type="submit" variant={tone} loading={pending} disabled={!matches}>
          {confirmLabel ?? strings.confirmDialog.confirm}
        </Button>
      </div>
    </form>
  );
}
