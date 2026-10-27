import { useEffect, useState, type MouseEvent } from 'react';

import { Check, Copy, X } from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';

import { Icon, type IconSize } from '../icon/icon';
import { IconButton, type IconButtonProps } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './copy-button.module.css';
import { copyText } from './copy-text';

export interface CopyButtonProps extends Omit<
  IconButtonProps,
  'label' | 'value' | 'children' | 'onCopy'
> {
  /** Что копировать; функция — если текст собирается в момент нажатия */
  value: string | (() => string);
  /** Подпись до копирования */
  label?: string;
  /** Подпись и объявление для скринридера после копирования */
  copiedLabel?: string;
  /** Сколько держится галочка, мс */
  timeout?: number;
  /** Скопировано успешно */
  onCopy?: (text: string) => void;
}

type CopyState = 'idle' | 'copied' | 'failed';

const iconSize: Record<NonNullable<IconButtonProps['size']>, IconSize> = {
  xs: 'xs',
  sm: 'sm',
  md: 'md',
  lg: 'md',
};

/**
 * Кнопка «копировать»: иконка сменяется галочкой на ~1.5 с, скринридер слышит «Скопировано». Буфер
 * недоступен — крестик тоном ошибки на то же время, без исключения: копирование — не повод ронять экран.
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
  timeout = 1500,
  onCopy,
  size = 'sm',
  variant = 'ghost',
  className,
  onClick,
  ...rest
}: CopyButtonProps) {
  const strings = useUiStrings();
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state === 'idle') return;

    const timer = window.setTimeout(() => setState('idle'), timeout);

    return () => window.clearTimeout(timer);
  }, [state, timeout]);

  const copy = async (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    if (event.defaultPrevented) return;

    const text = typeof value === 'function' ? value() : value;
    const ok = await copyText(text);

    setState(ok ? 'copied' : 'failed');

    if (ok) onCopy?.(text);
  };

  const currentLabel = {
    idle: label ?? strings.copyButton.copy,
    copied: copiedLabel ?? strings.copyButton.copied,
    failed: strings.copyButton.failed,
  }[state];

  return (
    <>
      <IconButton
        label={currentLabel}
        size={size}
        variant={variant}
        className={cx(styles.button, className)}
        data-copy-state={state}
        onClick={copy}
        {...rest}
      >
        {/* Все иконки в одной клетке: смена — перекрёстным затуханием, без скачка раскладки */}
        <span className={styles.icons} aria-hidden>
          <Icon icon={Copy} size={iconSize[size]} className={styles.copy} />
          <Icon icon={Check} size={iconSize[size]} className={styles.check} />
          <Icon icon={X} size={iconSize[size]} className={styles.fail} />
        </span>
      </IconButton>

      {/* Объявление — рядом, а не внутри: содержимое кнопки для скринридера «презентационное» */}
      <VisuallyHidden.Root role="status">
        {state === 'idle' ? '' : currentLabel}
      </VisuallyHidden.Root>
    </>
  );
}
