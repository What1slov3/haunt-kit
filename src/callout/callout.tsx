import type { ComponentPropsWithRef, ReactNode } from 'react';

import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';

import styles from './callout.module.css';

export type CalloutTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface CalloutProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  tone?: CalloutTone;
  title?: ReactNode;
  /** Своя иконка; false — без иконки */
  icon?: ReactNode | false;
  /** Кнопки справа или под текстом */
  action?: ReactNode;
  /** Полоса во всю ширину без скругления — баннер над чатом («нет соединения») */
  banner?: boolean;
}

const toneIcon: Record<CalloutTone, typeof Info> = {
  neutral: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

/** Встроенное сообщение: подсказка в настройках, предупреждение, баннер о состоянии */
export function Callout({
  tone = 'neutral',
  title,
  icon,
  action,
  banner,
  className,
  children,
  ...rest
}: CalloutProps) {
  const role = tone === 'danger' || tone === 'warning' ? 'alert' : 'status';

  return (
    <div
      role={role}
      className={cx(styles.callout, styles[tone], banner && styles.banner, className)}
      {...rest}
    >
      {icon !== false && (
        <span className={styles.icon}>{icon ?? <Icon icon={toneIcon[tone]} size="md" />}</span>
      )}

      <div className={styles.body}>
        {title && <div className={styles.title}>{title}</div>}

        {children && <div className={styles.text}>{children}</div>}
      </div>

      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
