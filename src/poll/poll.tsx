import {
  useId,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
} from 'react';

import { Check, EyeOff } from 'lucide-react';

import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { cx } from '../lib/cx';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';
import { Timestamp } from '../timestamp/timestamp';
import type { TimestampInput } from '../timestamp/timestamp-format';

import { pollResults, toggleChoice } from './poll-math';
import styles from './poll.module.css';

export interface PollOption {
  id: string;
  label: string;
  votes: number;
  /** Эмодзи перед подписью */
  emoji?: string;
}

export interface PollProps extends Omit<ComponentPropsWithRef<'div'>, 'onChange'> {
  question: ReactNode;
  options: readonly PollOption[];
  /** Можно выбрать несколько вариантов */
  multiple?: boolean;
  /** Не больше стольких при множественном выборе */
  maxChoices?: number;
  /** Мои голоса — id вариантов; непустой список — я уже голосовал */
  votedFor?: readonly string[];
  /** Нажали «Голосовать» с выбранными вариантами */
  onVote?: (ids: string[]) => void;
  /** «Отменить голос»; без обработчика кнопки нет */
  onRetract?: () => void;
  /** Опрос завершён: только итоги, лидер выделен */
  closed?: boolean;
  /** Анонимный — пометка у итогов */
  anonymous?: boolean;
  /** Когда завершится (или завершился) — относительное время, живое */
  endsAt?: TimestampInput;
  /** Сколько человек проголосовало — при множественном выборе проценты от людей, а не от голосов */
  voters?: number;
  /** Итоги видны и до голосования */
  showResults?: boolean;
  /** Голос отправляется: кнопка со спиннером */
  pending?: boolean;
  /** Локаль чисел и времени; по умолчанию — из UiStringsProvider */
  locale?: string;
}

/**
 * Опрос: вопрос, варианты (один — радио, несколько — флажки, с лимитом), «Голосовать». После голоса или по
 * завершении — полосы итогов с процентами (в сумме ровно 100, наибольшим остатком), «ваш голос» галочкой,
 * у завершённого — лидер. Таймер — `Timestamp` живой. Клавиатура — родная у радио и флажков: стрелки, пробел.
 */
export function Poll({
  question,
  options,
  multiple,
  maxChoices,
  votedFor,
  onVote,
  onRetract,
  closed,
  anonymous,
  endsAt,
  voters,
  showResults,
  pending,
  locale: localeProp,
  className,
  ...rest
}: PollProps) {
  const text = useUiStrings().poll;
  const locale = useUiLocale(localeProp);
  const name = useId();
  const questionId = useId();
  const [selected, setSelected] = useState<string[]>([]);
  const voted = (votedFor?.length ?? 0) > 0;
  const results = closed || voted || showResults;
  const canVote = !closed && !voted;
  const computed = pollResults(options, { voters: multiple ? voters : undefined });
  const totalVotes = options.reduce((sum, option) => sum + Math.max(0, option.votes), 0);
  const mine = new Set(votedFor ?? []);
  const limitReached = multiple && maxChoices !== undefined && selected.length >= maxChoices;

  const rule = multiple
    ? maxChoices !== undefined
      ? text.chooseUpTo(maxChoices)
      : text.chooseMany
    : text.chooseOne;

  const choose = (id: string) =>
    setSelected((current) => toggleChoice(current, id, { multiple, max: maxChoices }));

  return (
    <div
      role="group"
      aria-labelledby={questionId}
      className={cx(styles.poll, className)}
      data-closed={closed || undefined}
      data-voted={voted || undefined}
      {...rest}
    >
      <div className={styles.head}>
        <span className={styles.kind}>{text.label}</span>

        <span id={questionId} className={styles.question}>
          {question}
        </span>

        {canVote && <span className={styles.rule}>{rule}</span>}
      </div>

      <ul className={styles.options}>
        {options.map((option, index) => {
          const result = computed[index]!;
          const isMine = mine.has(option.id);
          const ratio = { '--ratio': result.percent / 100 } as CSSProperties;

          if (canVote) {
            const checked = selected.includes(option.id);

            return (
              <li key={option.id}>
                <label
                  className={styles.option}
                  data-checked={checked || undefined}
                  style={results ? ratio : undefined}
                >
                  {results && <span className={styles.bar} aria-hidden />}

                  <input
                    type={multiple ? 'checkbox' : 'radio'}
                    name={name}
                    value={option.id}
                    checked={checked}
                    disabled={pending || (limitReached && !checked)}
                    onChange={() => choose(option.id)}
                    className={styles.input}
                  />

                  <span className={cx(styles.indicator, multiple && styles.square)} aria-hidden>
                    <Icon icon={Check} size="xs" />
                  </span>

                  {option.emoji && <span className={styles.emoji}>{option.emoji}</span>}

                  <span className={styles.optionLabel}>{option.label}</span>

                  {results && (
                    <span className={styles.percent} aria-hidden>
                      {result.percent}%
                    </span>
                  )}
                </label>
              </li>
            );
          }

          return (
            <li
              key={option.id}
              className={styles.result}
              data-mine={isMine || undefined}
              data-leading={(closed && result.leading) || undefined}
              aria-label={`${text.option(option.label, result.percent, result.votes)}${isMine ? `, ${text.yourVote}` : ''}`}
              style={ratio}
            >
              <span className={styles.bar} aria-hidden />

              <span className={styles.resultLabel} aria-hidden>
                {option.emoji && <span className={styles.emoji}>{option.emoji}</span>}

                <span className={styles.optionLabel}>{option.label}</span>

                {isMine && <Icon icon={Check} size="xs" className={styles.mineIcon} />}
              </span>

              <span className={styles.percent} aria-hidden>
                {result.percent}%
              </span>
            </li>
          );
        })}
      </ul>

      <div className={styles.footer}>
        <span className={styles.meta}>
          <span>
            {multiple && voters !== undefined ? text.voters(voters) : text.votes(totalVotes)}
          </span>

          {anonymous && (
            <span className={styles.flag}>
              <Icon icon={EyeOff} size="xs" />
              {text.anonymous}
            </span>
          )}

          {voted && <span className={styles.flag}>{text.voted}</span>}

          {closed ? (
            <span className={styles.flag}>
              {endsAt !== undefined ? (
                <>
                  {text.endedAt} <Timestamp date={endsAt} locale={locale} tooltip />
                </>
              ) : (
                text.closed
              )}
            </span>
          ) : (
            endsAt !== undefined && (
              <span className={styles.flag}>
                {text.endsIn} <Timestamp date={endsAt} locale={locale} live tooltip />
              </span>
            )
          )}
        </span>

        {canVote && (
          <Button
            size="sm"
            variant="accent"
            disabled={selected.length === 0}
            loading={pending}
            onClick={() => onVote?.(selected)}
          >
            {text.vote}
          </Button>
        )}

        {voted && !closed && onRetract && (
          <Button size="sm" variant="ghost" loading={pending} onClick={onRetract}>
            {text.retract}
          </Button>
        )}
      </div>
    </div>
  );
}
