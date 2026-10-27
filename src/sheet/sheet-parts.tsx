import type { ComponentPropsWithRef } from 'react';

import { X } from 'lucide-react';
import { Dialog as RadixDialog } from 'radix-ui';

import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';
import { usePortalContainer } from '../theme/portal-container';

import styles from './sheet.module.css';

export type SheetSide = 'right' | 'left';
export type SheetSize = 'sm' | 'md' | 'lg';

export type SheetContentProps = ComponentPropsWithRef<typeof RadixDialog.Content> & {
  /** С какой стороны выезжает: справа — профиль, настройки канала; слева — навигация */
  side?: SheetSide;
  /** Ширина: sm 320 — профиль, md 400 — настройки, lg 560 — редактор */
  size?: SheetSize;
  /** Крестик в шапке; выключить, если закрытие — только через действия внутри */
  showClose?: boolean;
};

/**
 * Панель — модальный диалог Radix: фокус-ловушка, Esc и клик по затемнению закрывают, фокус возвращается
 * на триггер. Отстоит от края экрана, как всё плавающее, а не прилипает к нему.
 */
export function SheetContent({
  side = 'right',
  size = 'md',
  showClose = true,
  className,
  children,
  ...rest
}: SheetContentProps) {
  const container = usePortalContainer();
  const strings = useUiStrings();

  return (
    <RadixDialog.Portal container={container}>
      <RadixDialog.Overlay className={styles.overlay} data-side={side} />

      <RadixDialog.Content
        className={cx(styles.content, styles[size], className)}
        data-side={side}
        {...rest}
      >
        {children}

        {showClose && (
          <RadixDialog.Close asChild>
            <IconButton label={strings.sheet.close} size="sm" className={styles.close}>
              <Icon icon={X} size="sm" />
            </IconButton>
          </RadixDialog.Close>
        )}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

/** Шапка: заголовок и описание; справа над ней — крестик */
export function SheetHeader({ className, ...rest }: ComponentPropsWithRef<'div'>) {
  return <div className={cx(styles.header, className)} {...rest} />;
}

export function SheetTitle({
  className,
  ...rest
}: ComponentPropsWithRef<typeof RadixDialog.Title>) {
  return <RadixDialog.Title className={cx(styles.title, className)} {...rest} />;
}

export function SheetDescription({
  className,
  ...rest
}: ComponentPropsWithRef<typeof RadixDialog.Description>) {
  return <RadixDialog.Description className={cx(styles.description, className)} {...rest} />;
}

/** Прокручиваемое тело между шапкой и подвалом */
export function SheetBody({ className, ...rest }: ComponentPropsWithRef<'div'>) {
  return <div className={cx(styles.body, className)} {...rest} />;
}

/** Ряд кнопок внизу, прижатый вправо; остаётся на месте при прокрутке тела */
export function SheetFooter({ className, ...rest }: ComponentPropsWithRef<'div'>) {
  return <div className={cx(styles.footer, className)} {...rest} />;
}

// Имена как в объекте-фасаде: так их показывают React DevTools и «Show code» в Storybook
SheetContent.displayName = 'Sheet.Content';
SheetHeader.displayName = 'Sheet.Header';
SheetTitle.displayName = 'Sheet.Title';
SheetDescription.displayName = 'Sheet.Description';
SheetBody.displayName = 'Sheet.Body';
SheetFooter.displayName = 'Sheet.Footer';
