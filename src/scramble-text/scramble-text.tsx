import { useEffect, useLayoutEffect, useRef, useState, type ComponentPropsWithRef } from 'react';

import { VisuallyHidden } from 'radix-ui';

import { cx } from '../lib/cx';

import { runScramble, SCRAMBLE_CHARSET } from './scramble';
import styles from './scramble-text.module.css';

export interface ScrambleTextProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  text: string;
  /** Когда расшифровывать: при появлении (и смене текста), при наведении или и так и так */
  trigger?: 'mount' | 'hover' | 'both';
  /** Длительность расшифровки, мс */
  duration?: number;
  /** Символы шума */
  charset?: string;
}

/**
 * Текст «расшифровывается» из случайных моно-символов — для заголовков и названий в духе TUI. При
 * `data-effects="off"` и reduced-motion сразу итог. Скринридер читает настоящий текст (скрытая копия),
 * шум от него скрыт. Моно всегда: символы одной ширины, и строка не прыгает, пока идёт шум.
 */
export function ScrambleText({
  text,
  trigger = 'mount',
  duration = 700,
  charset = SCRAMBLE_CHARSET,
  className,
  onPointerEnter,
  ...rest
}: ScrambleTextProps) {
  const glyphsRef = useRef<HTMLSpanElement>(null);
  const cancelRef = useRef<() => void>(() => {});
  const [frame, setFrame] = useState<string | null>(null);

  // Layout-эффект: первый кадр шума — до отрисовки, иначе мелькнёт итоговый текст
  useLayoutEffect(() => {
    const element = glyphsRef.current;

    if (trigger === 'hover' || !element) return;

    cancelRef.current();
    cancelRef.current = runScramble(element, { text, duration, charset }, setFrame);

    return () => {
      cancelRef.current();
      // Прерванная расшифровка не должна оставить шум вместо текста
      setFrame(null);
    };
  }, [text, trigger, duration, charset]);

  useEffect(() => () => cancelRef.current(), []);

  const replay = () => {
    const element = glyphsRef.current;

    if (!element) return;

    cancelRef.current();
    cancelRef.current = runScramble(element, { text, duration, charset }, setFrame);
  };

  return (
    <span
      className={cx(styles.root, className)}
      onPointerEnter={(event) => {
        if (trigger !== 'mount') replay();

        onPointerEnter?.(event);
      }}
      {...rest}
    >
      <VisuallyHidden.Root>{text}</VisuallyHidden.Root>

      <span
        ref={glyphsRef}
        className={styles.glyphs}
        data-scrambling={frame ? '' : undefined}
        aria-hidden
      >
        {frame ?? text}
      </span>
    </span>
  );
}
