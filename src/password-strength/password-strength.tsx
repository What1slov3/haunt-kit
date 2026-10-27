import type { ComponentPropsWithRef, ReactNode } from 'react';

import { VisuallyHidden } from 'radix-ui';

import { cx } from '../lib/cx';
import { Meter } from '../meter/meter';
import { useUiStrings } from '../strings/ui-strings-context';

import { scorePassword, type PasswordHint, type PasswordScoreOptions } from './password-score';
import styles from './password-strength.module.css';

export interface PasswordStrengthProps
  extends Omit<ComponentPropsWithRef<'div'>, 'children'>, PasswordScoreOptions {
  password: string;
  /** Подпись шкалы; по умолчанию «Надёжность» */
  label?: ReactNode;
  /** Подсказки, что улучшить; по умолчанию да */
  showHints?: boolean;
  /** Пустой пароль — ничего не показывать (по умолчанию), иначе пустая шкала */
  hideWhenEmpty?: boolean;
}

/** Оценок пять, делений тоже: «очень слабый» — одно горящее деление, а не пустая шкала */
const LEVELS = 5;

/**
 * Шкала надёжности пароля на `Meter` и подсказки, что улучшить. Оценка — `scorePassword`, без внешних
 * словарей: длина, классы символов, повторы, последовательности, частые пароли. Связать с полем —
 * `id` шкалы в `aria-describedby` поля пароля. Уровень объявляется скринридеру, только когда сменился.
 */
export function PasswordStrength({
  password,
  minLength,
  userInputs,
  maxHints,
  label,
  showHints = true,
  hideWhenEmpty = true,
  className,
  ...rest
}: PasswordStrengthProps) {
  const strings = useUiStrings().passwordStrength;
  const result = scorePassword(password, { minLength, userInputs, maxHints });
  const empty = password.length === 0;

  if (empty && hideWhenEmpty) return null;

  const level = strings.levels[result.score];
  const hintText = (hint: PasswordHint) =>
    hint === 'tooShort' ? strings.hints.tooShort(minLength ?? 8) : strings.hints[hint];

  return (
    <div
      className={cx(styles.root, className)}
      data-score={empty ? undefined : result.score}
      {...rest}
    >
      <Meter
        value={empty ? 0 : result.score + 1}
        min={0}
        max={LEVELS}
        segments={LEVELS}
        direction="low-is-bad"
        danger={2}
        warning={3}
        size="sm"
        label={label ?? strings.label}
        valueLabel={empty ? false : level}
        valueText={empty ? '' : level}
      />

      {showHints && result.hints.length > 0 && (
        <ul className={styles.hints} aria-label={strings.hintsLabel}>
          {result.hints.map((hint) => (
            <li key={hint} className={styles.hint}>
              {hintText(hint)}
            </li>
          ))}
        </ul>
      )}

      <VisuallyHidden.Root role="status">{empty ? '' : level}</VisuallyHidden.Root>
    </div>
  );
}
