import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type FormEvent,
  type ReactNode,
} from 'react';

import { Button } from '../button/button';
import { cx } from '../lib/cx';
import { Progress } from '../progress/progress';
import { Steps } from '../steps/steps';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './wizard.module.css';
import {
  canJumpTo,
  clampStep,
  readSavedStep,
  saveStep,
  validationError,
  type WizardValidation,
} from './wizard-state';

export interface WizardStepApi {
  index: number;
  total: number;
  next: () => void;
  back: () => void;
}

export interface WizardStep {
  /** Уникален в мастере */
  id: string;
  title: ReactNode;
  /** Подпись под заголовком шага */
  description?: ReactNode;
  content: ReactNode | ((api: WizardStepApi) => ReactNode);
  /**
   * Проверка перед «Далее» и «Готово»: true / ничего — можно, false — нельзя (общий текст), строка —
   * нельзя, вот почему. Может быть промисом: кнопка ждёт со спиннером
   */
  validate?: () => WizardValidation | Promise<WizardValidation>;
}

export interface WizardProps extends Omit<ComponentPropsWithRef<'div'>, 'title' | 'onSubmit'> {
  steps: readonly WizardStep[];
  /** Текущий шаг с нуля; без него мастер ведёт шаг сам */
  step?: number;
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  /** «Готово» после проверки последнего шага; промис — кнопка ждёт, отказ — ошибка под шагом */
  onFinish: () => void | Promise<void>;
  /** Помнить текущий шаг в localStorage под этим ключом: закрыли и открыли — тот же шаг */
  storageKey?: string;
  backLabel?: string;
  nextLabel?: string;
  finishLabel?: string;
}

type Busy = 'next' | 'finish' | null;

/**
 * Многошаговая форма на `Steps`: список шагов слева (пройденные — кнопки назад), текущий шаг справа,
 * «Назад / Далее / Готово» внизу. Перед переходом вперёд — проверка шага (может быть асинхронной).
 * Шаг — форма: Enter в поле ведёт дальше. При смене шага фокус переходит на его заголовок — скринридер
 * читает, где человек оказался. Узкий контейнер вместо списка показывает полосу прогресса.
 */
export function Wizard({
  steps,
  step: stepProp,
  defaultStep = 0,
  onStepChange,
  onFinish,
  storageKey,
  backLabel,
  nextLabel,
  finishLabel,
  className,
  ...rest
}: WizardProps) {
  const strings = useUiStrings().wizard;
  const baseId = useId();
  const headingId = `${baseId}-heading`;
  const errorId = `${baseId}-error`;
  const total = steps.length;
  const [innerStep, setInnerStep] = useState(() => readSavedStep(storageKey, total, defaultStep));
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const movedRef = useRef(false);
  /** Переход, который ещё ждёт проверки: ответ устаревшей проверки не должен двигать мастер */
  const attemptRef = useRef(0);

  const index = clampStep(stepProp ?? innerStep, total);
  const current = steps[index];
  const last = index === total - 1;

  const goTo = (target: number) => {
    const next = clampStep(target, total);

    if (next === index) return;

    attemptRef.current++;
    movedRef.current = true;
    setError(null);
    setBusy(null);
    setInnerStep(next);
    saveStep(storageKey, next);
    onStepChange?.(next);
  };

  const advance = async () => {
    if (!current || busy) return;

    const attempt = ++attemptRef.current;

    setError(null);
    setBusy(last ? 'finish' : 'next');

    try {
      const problem = validationError(await current.validate?.());

      if (attempt !== attemptRef.current) return;

      if (problem !== null) {
        setError(problem || strings.stepInvalid);
        setBusy(null);

        return;
      }

      if (!last) {
        goTo(index + 1);

        return;
      }

      await onFinish();

      if (attempt !== attemptRef.current) return;

      saveStep(storageKey, null);
      setBusy(null);
    } catch (reason) {
      if (attempt !== attemptRef.current) return;

      setError(reason instanceof Error && reason.message ? reason.message : strings.finishFailed);
      setBusy(null);
    }
  };

  const api: WizardStepApi = {
    index,
    total,
    next: () => void advance(),
    back: () => goTo(index - 1),
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void advance();
  };

  // Фокус — на заголовок нового шага, но не при первом показе: открытие мастера не должно его красть
  useEffect(() => {
    if (!movedRef.current) return;

    movedRef.current = false;
    headingRef.current?.focus({ preventScroll: true });
  }, [index]);

  if (!current) return null;

  const progress = ((index + 1) / total) * 100;

  return (
    <div className={cx(styles.root, className)} {...rest}>
      <nav className={styles.nav} aria-label={strings.steps}>
        <Steps.Root className={styles.steps}>
          {steps.map((item, itemIndex) => (
            <Steps.Item
              key={item.id}
              done={itemIndex < index}
              current={itemIndex === index}
              title={
                canJumpTo(itemIndex, index) && !busy ? (
                  <button
                    type="button"
                    className={styles.stepButton}
                    onClick={() => goTo(itemIndex)}
                  >
                    {item.title}
                  </button>
                ) : (
                  <span className={styles.stepTitle} data-upcoming={itemIndex > index || undefined}>
                    {item.title}
                  </span>
                )
              }
            />
          ))}
        </Steps.Root>
      </nav>

      <form
        className={styles.main}
        aria-labelledby={headingId}
        aria-describedby={error !== null ? errorId : undefined}
        aria-busy={busy !== null || undefined}
        noValidate
        onSubmit={onSubmit}
      >
        <header className={styles.header}>
          <Progress
            value={progress}
            size="sm"
            label={strings.step(index + 1, total)}
            className={styles.progress}
          />

          <span className={styles.counter}>{strings.step(index + 1, total)}</span>

          <h2 ref={headingRef} id={headingId} tabIndex={-1} className={styles.heading}>
            {current.title}
          </h2>

          {current.description && <p className={styles.description}>{current.description}</p>}
        </header>

        <div className={styles.body}>
          {typeof current.content === 'function' ? current.content(api) : current.content}
        </div>

        {error !== null && (
          <span id={errorId} className={styles.error} role="alert">
            {error}
          </span>
        )}

        <footer className={styles.footer}>
          {index > 0 && (
            <Button type="button" variant="ghost" disabled={busy !== null} onClick={api.back}>
              {backLabel ?? strings.back}
            </Button>
          )}

          <Button
            type="submit"
            variant="accent"
            loading={busy !== null}
            arrow={!last}
            className={styles.primary}
          >
            {last ? (finishLabel ?? strings.finish) : (nextLabel ?? strings.next)}
          </Button>
        </footer>
      </form>
    </div>
  );
}
