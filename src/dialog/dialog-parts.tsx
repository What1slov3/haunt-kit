import type { ComponentPropsWithRef } from 'react';

import { X } from 'lucide-react';
import { Dialog as RadixDialog } from 'radix-ui';

import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';
import { usePortalContainer } from '../theme/portal-container';

import styles from './dialog.module.css';

export type DialogContentProps = ComponentPropsWithRef<typeof RadixDialog.Content> & {
  /** Ширина окна: sm — подтверждение, md — форма, lg — настройки */
  size?: 'sm' | 'md' | 'lg';
  /** Крестик в углу; выключить, если закрытие — только через действия внутри */
  showClose?: boolean;
};

export function DialogContent({
  size = 'md',
  showClose = true,
  className,
  children,
  ...rest
}: DialogContentProps) {
  const container = usePortalContainer();
  const strings = useUiStrings();

  return (
    <RadixDialog.Portal container={container}>
      <RadixDialog.Overlay className={styles.overlay} />

      <RadixDialog.Content className={cx(styles.content, styles[size], className)} {...rest}>
        {children}

        {showClose && (
          <RadixDialog.Close asChild>
            <IconButton label={strings.dialog.close} size="sm" className={styles.close}>
              <Icon icon={X} size="sm" />
            </IconButton>
          </RadixDialog.Close>
        )}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export function DialogTitle({
  className,
  ...rest
}: ComponentPropsWithRef<typeof RadixDialog.Title>) {
  return <RadixDialog.Title className={cx(styles.title, className)} {...rest} />;
}

export function DialogDescription({
  className,
  ...rest
}: ComponentPropsWithRef<typeof RadixDialog.Description>) {
  return <RadixDialog.Description className={cx(styles.description, className)} {...rest} />;
}

/** Ряд кнопок внизу диалога, прижатый вправо */
export function DialogFooter({ className, ...rest }: ComponentPropsWithRef<'div'>) {
  return <div className={cx(styles.footer, className)} {...rest} />;
}

// Имена как в объекте-фасаде: так их показывают React DevTools и «Show code» в Storybook
DialogContent.displayName = 'Dialog.Content';
DialogTitle.displayName = 'Dialog.Title';
DialogDescription.displayName = 'Dialog.Description';
DialogFooter.displayName = 'Dialog.Footer';
