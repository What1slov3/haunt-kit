import { useId, useState, type KeyboardEvent } from 'react';

import { ArrowBigUpDash, Eye, EyeOff } from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';

import { useFieldControl } from '../field/field-context';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { Input, type InputProps } from '../input/input';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';
import { Tooltip } from '../tooltip/tooltip';

import styles from './password-input.module.css';

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'endSlot' | 'prompt'> {
  /** Пароль показан — управляемо; без него — `defaultVisible` и своё состояние */
  visible?: boolean;
  defaultVisible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  /** Предупреждать о включённом Caps Lock; по умолчанию да */
  capsLockWarning?: boolean;
  /** Подписи кнопки и предупреждения поверх словаря */
  showLabel?: string;
  hideLabel?: string;
  capsLockLabel?: string;
}

/**
 * Сочетание показа без мыши — как у встроенного поля пароля Windows и Edge. Название клавиш одинаково на
 * всех языках, поэтому не в словаре
 */
const TOGGLE_SHORTCUT = 'Alt+F8';

const isToggleShortcut = (event: KeyboardEvent) =>
  event.altKey && !event.ctrlKey && !event.metaKey && event.key === 'F8';

/**
 * Поле пароля: `Input` в рамке поля, кнопка «показать / скрыть» справа, метка «Caps Lock», пока он включён.
 * Кнопка не берёт Tab — порядок формы «логин → пароль → войти» не ломается; с клавиатуры показ — Alt+F8,
 * фокус остаётся в поле, смена объявляется скринридеру. Caps Lock читается из `getModifierState` на каждом
 * нажатии в поле: другого способа узнать его состояние у браузера нет. Внутри `<Field>` связан с меткой.
 */
export function PasswordInput({
  visible: visibleProp,
  defaultVisible = false,
  onVisibleChange,
  capsLockWarning = true,
  showLabel,
  hideLabel,
  capsLockLabel,
  autoComplete = 'current-password',
  size = 'md',
  disabled,
  wrapperClassName,
  id: idProp,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...rest
}: PasswordInputProps) {
  const strings = useUiStrings().passwordInput;
  const field = useFieldControl({ id: idProp });
  const ownId = useId();
  const id = field.props.id ?? ownId;
  const [innerVisible, setInnerVisible] = useState(defaultVisible);
  const visible = visibleProp ?? innerVisible;
  const [capsLock, setCapsLock] = useState(false);
  // Объявление только после переключения пользователем: начальное состояние читать незачем
  const [announcement, setAnnouncement] = useState('');

  const toggle = () => {
    const next = !visible;

    if (visibleProp === undefined) setInnerVisible(next);

    setAnnouncement(next ? strings.shown : strings.hidden);
    onVisibleChange?.(next);
  };

  const readCapsLock = (event: KeyboardEvent<HTMLInputElement>) => {
    if (capsLockWarning) setCapsLock(event.getModifierState('CapsLock'));
  };

  const label = visible ? (hideLabel ?? strings.hide) : (showLabel ?? strings.show);
  const capsText = capsLockLabel ?? strings.capsLock;

  return (
    <>
      <Input
        {...rest}
        id={id}
        type={visible ? 'text' : 'password'}
        size={size}
        disabled={disabled}
        autoComplete={autoComplete}
        // Показанный пароль не должен уходить в проверку орфографии и автозамену
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-keyshortcuts={TOGGLE_SHORTCUT}
        wrapperClassName={cx(styles.root, styles[size], wrapperClassName)}
        onKeyDown={(event) => {
          readCapsLock(event);

          if (isToggleShortcut(event)) {
            event.preventDefault();
            toggle();
          }

          onKeyDown?.(event);
        }}
        onKeyUp={(event) => {
          readCapsLock(event);
          onKeyUp?.(event);
        }}
        onBlur={(event) => {
          setCapsLock(false);
          onBlur?.(event);
        }}
        endSlot={
          <>
            {capsLock && (
              <Tooltip content={capsText}>
                <span className={styles.caps} data-caps-lock>
                  <Icon icon={ArrowBigUpDash} size="sm" />
                  <span className={styles.capsText}>{strings.capsLockShort}</span>
                </span>
              </Tooltip>
            )}

            <Tooltip content={label} shortcut={TOGGLE_SHORTCUT}>
              <IconButton
                label={label}
                size="xs"
                // Вне порядка Tab: кнопка — дополнение к полю, а не ещё одна остановка в форме
                tabIndex={-1}
                aria-controls={id}
                disabled={disabled}
                className={styles.toggle}
                // Фокус остаётся в поле: иначе клик уводил бы его на кнопку и каретка терялась
                onMouseDown={(event) => event.preventDefault()}
                onClick={toggle}
              >
                <Icon icon={visible ? EyeOff : Eye} size="sm" />
              </IconButton>
            </Tooltip>
          </>
        }
      />

      <VisuallyHidden.Root role="status">
        {announcement}
        {capsLock ? ` ${capsText}` : ''}
      </VisuallyHidden.Root>
    </>
  );
}
