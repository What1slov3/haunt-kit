import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { Toast as RadixToast } from 'radix-ui';

import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './toast.module.css';
import { toast, useToasts, type ToastItem, type ToastTone } from './toast-store';
import type { ToasterProps } from './toaster';

const toneIcon: Record<ToastTone, typeof Info | null> = {
  neutral: null,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
  info: Info,
};

function ToastView({ item }: { item: ToastItem }) {
  const ToneIcon = toneIcon[item.tone];
  const strings = useUiStrings();

  return (
    <RadixToast.Root
      duration={item.duration === 0 ? Infinity : item.duration}
      className={cx(styles.toast, styles[item.tone])}
      // Radix закрывает тост по таймеру и свайпу; из очереди он удаляется после анимации ухода
      onOpenChange={(open) => {
        if (!open) setTimeout(() => toast.dismiss(item.id), 150);
      }}
    >
      {ToneIcon && <Icon icon={ToneIcon} size="md" className={styles.icon} />}

      <div className={styles.body}>
        <RadixToast.Title className={styles.title}>{item.title}</RadixToast.Title>

        {item.description && (
          <RadixToast.Description className={styles.description}>
            {item.description}
          </RadixToast.Description>
        )}
      </div>

      {item.action && (
        <RadixToast.Action altText={item.action.label} asChild>
          <Button size="sm" variant="secondary" onClick={item.action.onClick}>
            {item.action.label}
          </Button>
        </RadixToast.Action>
      )}

      <RadixToast.Close asChild>
        <IconButton label={strings.toast.close} size="xs" className={styles.close}>
          <Icon icon={X} size="xs" />
        </IconButton>
      </RadixToast.Close>
    </RadixToast.Root>
  );
}

/**
 * Вьюпорт уведомлений на Radix Toast — грузится отдельным чанком при первом уведомлении (см. toaster.tsx).
 * Хоткей F8 (Radix) переводит фокус на тосты.
 */
export default function ToasterView({ position = 'bottom-right' }: ToasterProps) {
  const items = useToasts();
  const strings = useUiStrings();

  return (
    <RadixToast.Provider swipeDirection="right" duration={5000}>
      {items.map((item) => (
        <ToastView key={item.id} item={item} />
      ))}

      <RadixToast.Viewport
        className={cx(styles.viewport, styles[position])}
        label={strings.toast.region}
      />
    </RadixToast.Provider>
  );
}
