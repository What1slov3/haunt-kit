import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
} from 'react';

import { VisuallyHidden } from 'radix-ui';

import { cx } from '../../../lib/cx';
import { schedule } from '../../scheduler';
import { useFxEnvironment } from '../../use-fx-environment';

import {
  boardCells,
  FLAP_ALPHANUMERIC,
  flapCell,
  flapFrame,
  planFlaps,
  type FlapPlan,
} from './flap-queue';
import styles from './split-flap.module.css';

export interface SplitFlapProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  value: string | number;
  /** Число ячеек; по умолчанию — по длине значения */
  length?: number;
  /** Барабан символов: `FLAP_DIGITS`, `FLAP_TIME`, `FLAP_ALPHANUMERIC` или свой; первый — пустой флажок */
  charset?: string;
  /** Выравнивание короткого значения: числа — по правому краю, коды — по левому */
  align?: 'start' | 'end';
  /** Один переброс флажка, мс */
  flipMs?: number;
  /** Задержка старта соседней ячейки, мс */
  staggerMs?: number;
  /** Не больше стольких перебросов на ячейку: длинный барабан докручивается к цели */
  maxFlips?: number;
  /** При монтировании ячейки перекидываются от пустых флажков */
  appear?: boolean;
  /** Высота ячейки: 24 / 32 / 48 px */
  size?: 'sm' | 'md' | 'lg';
}

interface Running {
  plan: FlapPlan;
  steps: number[];
  /** Номер плана: ключ флажков, чтобы новая смена перезапустила их анимацию */
  id: number;
}

/**
 * Табло с перекидными флажками: при смене значения ячейки по очереди перекидываются вперёд по барабану
 * до нужного символа — время события, счёт, код. Флажок — две половины с поворотом `rotateX`, только
 * transform и filter. Кадры — общий цикл `fx/scheduler`. Скринридер читает значение целиком (скрытая
 * копия), табло скрыто. `data-effects="off"` и reduced-motion — сразу новое значение.
 */
export function SplitFlap({
  value,
  length,
  charset = FLAP_ALPHANUMERIC,
  align = 'end',
  flipMs = 70,
  staggerMs = 45,
  maxFlips = 10,
  appear = false,
  size = 'md',
  className,
  style,
  ...rest
}: SplitFlapProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const { motion } = useFxEnvironment(rootRef);
  const text = String(value);
  const target = boardCells(text, length, align);
  const targetKey = target.join('\u0000');
  const [shown, setShown] = useState<string[]>(() => (appear ? target.map(() => ' ') : target));
  const [running, setRunning] = useState<Running | null>(null);
  const displayedRef = useRef<string[]>(shown);
  const timing = useRef({ flipMs, staggerMs, maxFlips, charset });

  // Без движения — сразу итог, ещё до отрисовки (синхронизация с пропом, а не эффект ради эффекта)
  if (!motion && (running || shown.join('\u0000') !== targetKey)) {
    setRunning(null);
    setShown(target);
  }

  const cells = running
    ? running.plan.cells.map((cell, index) => flapCell(cell, running.steps[index] ?? 0))
    : shown.map((char) => ({ current: char, next: null }));

  useLayoutEffect(() => {
    // Прерванная смена продолжается с того, что видно сейчас: флажок на середине считается упавшим
    displayedRef.current = cells.map((cell) => cell.next ?? cell.current);
    timing.current = { flipMs, staggerMs, maxFlips, charset };
  });

  useEffect(() => {
    const root = rootRef.current;

    if (!motion || !root) return;

    const next = targetKey.split('\u0000');
    const { charset: drum, ...flapTiming } = timing.current;
    const plan = planFlaps(displayedRef.current, next, drum, flapTiming);

    if (plan.duration === 0) {
      setRunning(null);
      setShown(next);

      return;
    }

    let startedAt = 0;
    let last = '';
    const id = Math.random();
    const handle = schedule(
      {
        frame: (now) => {
          startedAt ||= now;

          const elapsed = now - startedAt;

          if (elapsed >= plan.duration) {
            handle.cancel();
            setRunning(null);
            setShown(next);

            return;
          }

          const steps = flapFrame(plan, elapsed);
          const key = steps.join(',');

          // Рендер — только когда какая-то ячейка начала новый переброс, а не на каждый кадр
          if (key !== last) {
            last = key;
            setRunning({ plan, steps, id });
          }
        },
      },
      { element: root },
    );

    return () => handle.cancel();
  }, [targetKey, motion]);

  return (
    <span
      ref={rootRef}
      className={cx(styles.root, styles[size], className)}
      style={{ '--flip-ms': `${flipMs}ms`, ...style } as CSSProperties}
      data-flipping={running ? '' : undefined}
      {...rest}
    >
      <VisuallyHidden.Root>{text}</VisuallyHidden.Root>

      <span className={styles.board} aria-hidden>
        {cells.map((cell, index) => {
          const step = running?.steps[index] ?? 0;

          return (
            <span key={index} className={styles.cell} data-char={cell.next ?? cell.current}>
              <span className={cx(styles.half, styles.top)}>
                <span className={styles.glyph}>{cell.next ?? cell.current}</span>
              </span>

              <span className={cx(styles.half, styles.bottom)}>
                <span className={styles.glyph}>{cell.current}</span>
              </span>

              {cell.next !== null && (
                <>
                  <span
                    key={`t${running?.id}-${step}`}
                    className={cx(styles.half, styles.top, styles.flapTop)}
                  >
                    <span className={styles.glyph}>{cell.current}</span>
                  </span>

                  <span
                    key={`b${running?.id}-${step}`}
                    className={cx(styles.half, styles.bottom, styles.flapBottom)}
                  >
                    <span className={styles.glyph}>{cell.next}</span>
                  </span>
                </>
              )}
            </span>
          );
        })}
      </span>
    </span>
  );
}
