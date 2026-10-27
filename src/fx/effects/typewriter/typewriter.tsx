import { useEffect, useRef, useState, type ComponentPropsWithRef } from 'react';

import { VisuallyHidden } from 'radix-ui';

import { Caret } from '../../../caret/caret';
import { cx } from '../../../lib/cx';
import { useInView } from '../../../motion-core/use-in-view';
import { schedule } from '../../scheduler';
import { useFxEnvironment } from '../../use-fx-environment';

import {
  planTypewriter,
  typedText,
  typewriterFrame,
  type TypewriterPhase,
} from './typewriter-plan';
import styles from './typewriter.module.css';

export interface TypewriterProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  /** Строка или несколько: печатается, стирается и сменяется следующей */
  text: string | readonly string[];
  /** Символ печатается за, мс */
  speed?: number;
  /** Символ стирается за, мс */
  deleteSpeed?: number;
  /** Пауза на напечатанной строке перед стиранием, мс */
  hold?: number;
  /** Пауза перед первым символом, мс */
  startDelay?: number;
  /** После последней строки — снова первая */
  loop?: boolean;
  /** Каретка кита: всегда, только пока печатает, или без неё */
  caret?: 'always' | 'typing' | 'none';
  caretShape?: 'block' | 'bar';
  /** Начать при монтировании или когда строка появится в окне */
  trigger?: 'mount' | 'view';
  /** Напечатана последняя строка (без loop) */
  onDone?: () => void;
}

/**
 * Печатная машинка с кареткой кита. Время символов считается заранее (паузы после знаков препинания),
 * кадры — общий цикл `fx/scheduler`, рендер — только когда меняется видимый текст. Ненапечатанный
 * остаток стоит невидимым — строка не прыгает и не переносит соседей. Скринридер читает строку целиком.
 * `data-effects="off"` и reduced-motion — сразу итог (первая строка при `loop`, иначе последняя).
 */
export function Typewriter({
  text,
  speed = 45,
  deleteSpeed = 22,
  hold = 1600,
  startDelay = 0,
  loop = false,
  caret = 'always',
  caretShape = 'block',
  trigger = 'mount',
  onDone,
  className,
  ...rest
}: TypewriterProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const { motion } = useFxEnvironment(rootRef);
  const texts = typeof text === 'string' ? [text] : text;
  const textsKey = texts.join('\u0000');
  const inView = useInView(rootRef, { disabled: trigger !== 'view' || !motion });
  const started = trigger === 'mount' || inView;
  const [frame, setFrame] = useState<{ index: number; typed: string; phase: TypewriterPhase }>({
    index: 0,
    typed: '',
    phase: 'waiting',
  });
  const doneRef = useRef(onDone);
  const timing = useRef({ speed, deleteSpeed, hold, startDelay, loop });

  useEffect(() => {
    doneRef.current = onDone;
    timing.current = { speed, deleteSpeed, hold, startDelay, loop };
  });

  useEffect(() => {
    const root = rootRef.current;

    if (!motion || !started || !root) return;

    const current = timing.current;
    const plan = planTypewriter(textsKey.split('\u0000'), {
      typeMs: current.speed,
      deleteMs: current.deleteSpeed,
      holdMs: current.hold,
      startDelay: current.startDelay,
      loop: current.loop,
    });
    let startedAt = 0;
    let last = '';
    const handle = schedule(
      {
        frame: (now) => {
          startedAt ||= now;

          const next = typewriterFrame(plan, now - startedAt);
          const typed = typedText(plan, next);
          const key = `${next.index}:${typed}:${next.phase}`;

          if (key !== last) {
            last = key;
            setFrame({ index: next.index, typed, phase: next.phase });
          }

          if (next.phase === 'done') {
            handle.cancel();
            doneRef.current?.();
          }
        },
      },
      { element: root },
    );

    return () => handle.cancel();
  }, [textsKey, motion, started]);

  // Без движения итог показан сразу — и «напечатано» тоже сразу, чтобы экран не ждал вечно
  useEffect(() => {
    if (!motion && !timing.current.loop) doneRef.current?.();
  }, [motion, textsKey]);

  const finalIndex = loop ? 0 : texts.length - 1;
  const index = motion ? frame.index : finalIndex;
  const line = texts[index] ?? '';
  const typed = motion ? (frame.phase === 'waiting' ? '' : frame.typed) : line;
  const typing = motion && frame.phase !== 'done';
  const showCaret = caret === 'always' || (caret === 'typing' && typing);

  return (
    <span
      ref={rootRef}
      className={cx(styles.root, className)}
      data-phase={motion ? frame.phase : 'done'}
      {...rest}
    >
      <VisuallyHidden.Root>{line}</VisuallyHidden.Root>

      <span aria-hidden className={styles.line}>
        {typed}
        {showCaret && <Caret shape={caretShape} className={styles.caret} />}
        {/* Остаток держит ширину строки: печать не двигает соседей и не меняет переносы */}
        <span className={styles.rest}>{line.slice(typed.length)}</span>
      </span>
    </span>
  );
}
