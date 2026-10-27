import type { ComponentProps, ReactNode } from 'react';

import { Tooltip as RadixTooltip } from 'radix-ui';

import { Kbd } from '../kbd/kbd';
import { cx } from '../lib/cx';
import { usePortalContainer } from '../theme/portal-container';

import styles from './tooltip.module.css';

export interface TooltipProps {
  content: ReactNode;
  /** Шорткат справа от текста: «Ctrl+K» */
  shortcut?: string;
  /** Триггер; должен уметь принимать ref и пробрасывать пропсы (кнопка, ссылка, IconButton) */
  children: ReactNode;
  side?: ComponentProps<typeof RadixTooltip.Content>['side'];
  align?: ComponentProps<typeof RadixTooltip.Content>['align'];
  /** Задержка перед показом; общая задана в ThemeProvider */
  delayDuration?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

/** Подсказка по наведению и фокусу. Провайдер подключён в ThemeProvider, здесь только Root. */
export function Tooltip({
  content,
  shortcut,
  children,
  side = 'top',
  align = 'center',
  delayDuration,
  open,
  defaultOpen,
  onOpenChange,
  className,
}: TooltipProps) {
  const container = usePortalContainer();

  return (
    // disableHoverableContent — подсказка гаснет сразу, как курсор ушёл с триггера: внутри нет
    // ничего кликабельного, а «зона благодати» Radix оставляла её висеть при быстром уходе мыши
    <RadixTooltip.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      delayDuration={delayDuration}
      disableHoverableContent
    >
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>

      <RadixTooltip.Portal container={container}>
        <RadixTooltip.Content
          side={side}
          align={align}
          sideOffset={4}
          collisionPadding={8}
          className={cx(styles.content, className)}
        >
          {content}

          {shortcut && (
            <Kbd size="sm" className={styles.shortcut}>
              {shortcut}
            </Kbd>
          )}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
