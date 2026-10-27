import { useEffect, useRef, useState, type ComponentPropsWithRef, type CSSProperties } from 'react';

import { VisuallyHidden } from 'radix-ui';

import { cx } from '../../../lib/cx';
import { useFxEnvironment } from '../../use-fx-environment';
import { graphemes } from '../text-utils';

import { glitchLayout } from './glitch';
import styles from './glitch-text.module.css';

export interface GlitchTextProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  text: string;
  /** Когда сбоить: при наведении, при смене текста или и так и так */
  trigger?: 'hover' | 'change' | 'both';
  /** Наибольший сдвиг символов и каналов, px */
  intensity?: number;
  /** Длительность вспышки, мс */
  duration?: number;
}

/**
 * Текст со сбоем сигнала: короткая вспышка RGB-сдвига (две цветные копии строки за текстом) и дрожь
 * отдельных символов — на наведении и при смене текста. Только transform и opacity, ступенями.
 * Скринридер читает настоящий текст (скрытая копия), вспышка скрыта. `data-effects="off"` и
 * reduced-motion — просто текст.
 */
export function GlitchText({
  text,
  trigger = 'both',
  intensity = 2,
  duration = 420,
  className,
  style,
  onPointerEnter,
  ...rest
}: GlitchTextProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const { motion } = useFxEnvironment(rootRef);
  const [previousText, setPreviousText] = useState(text);
  // Номер вспышки: ключ слоя (перезапуск анимации) и seed раскладки дрожи; 0 — сбоя ещё не было
  const [flash, setFlash] = useState(0);
  const [active, setActive] = useState(false);

  if (text !== previousText) {
    setPreviousText(text);

    if (motion && trigger !== 'hover') {
      setFlash((count) => count + 1);
      setActive(true);
    }
  }

  useEffect(() => {
    if (!active) return;

    // Дрожь символов идёт с задержкой до 120 мс — вспышка кончается после неё
    const timer = window.setTimeout(() => setActive(false), duration + 150);

    return () => window.clearTimeout(timer);
  }, [active, flash, duration]);

  const glitching = active && motion;
  const layout = glitching
    ? glitchLayout(graphemes(text), { seed: flash, amplitude: intensity })
    : null;

  return (
    <span
      ref={rootRef}
      className={cx(styles.root, className)}
      style={
        {
          '--glitch-amp': `${intensity}px`,
          '--glitch-duration': `${duration}ms`,
          ...style,
        } as CSSProperties
      }
      onPointerEnter={(event) => {
        if (motion && trigger !== 'change') {
          setFlash((count) => count + 1);
          setActive(true);
        }

        onPointerEnter?.(event);
      }}
      {...rest}
    >
      <VisuallyHidden.Root>{text}</VisuallyHidden.Root>

      <span
        key={flash}
        aria-hidden
        className={styles.glyphs}
        data-text={text}
        data-glitching={glitching ? '' : undefined}
      >
        {layout
          ? layout.map((item, index) =>
              item.jitter ? (
                <span
                  key={index}
                  className={styles.char}
                  style={
                    {
                      '--gx': `${item.x}px`,
                      '--gy': `${item.y}px`,
                      '--gd': `${item.delay}ms`,
                    } as CSSProperties
                  }
                >
                  {item.char}
                </span>
              ) : (
                item.char
              ),
            )
          : text}
      </span>
    </span>
  );
}
