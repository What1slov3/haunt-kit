import { CopyButton } from '../copy-button/copy-button';
import { Input, type InputProps } from '../input/input';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './copy-field.module.css';

export interface CopyFieldProps extends Omit<
  InputProps,
  'value' | 'defaultValue' | 'onChange' | 'readOnly' | 'endSlot' | 'onCopy'
> {
  /** Что показано и копируется: ссылка-приглашение, id, токен */
  value: string;
  /** Подпись кнопки копирования */
  copyLabel?: string;
  /** Скопировано успешно */
  onCopy?: (text: string) => void;
}

/**
 * Значение только для чтения с кнопкой копирования в рамке: ссылка-приглашение, id сообщества. Фокус
 * выделяет текст целиком — его можно скопировать и с клавиатуры, Ctrl+C.
 */
export function CopyField({
  value,
  copyLabel,
  onCopy,
  size = 'md',
  mono = true,
  disabled,
  wrapperClassName,
  onFocus,
  ...rest
}: CopyFieldProps) {
  const strings = useUiStrings();

  return (
    <Input
      readOnly
      value={value}
      size={size}
      mono={mono}
      disabled={disabled}
      wrapperClassName={cx(styles.root, styles[size], wrapperClassName)}
      onFocus={(event) => {
        event.currentTarget.select();
        onFocus?.(event);
      }}
      endSlot={
        <CopyButton
          value={value}
          label={copyLabel ?? strings.copyField.copy}
          size="xs"
          disabled={disabled}
          className={styles.copy}
          onCopy={onCopy}
        />
      }
      {...rest}
    />
  );
}
