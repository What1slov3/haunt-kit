import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from 'react';

import { VisuallyHidden } from 'radix-ui';

import { cx } from '../../../lib/cx';
import { useInView } from '../../../motion-core/use-in-view';
import { useFxEnvironment } from '../../use-fx-environment';

import { groupLines, splitReveal } from './split-text';
import styles from './text-reveal.module.css';

export interface TextRevealProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  text: string;
  /** Единица появления: строка (по фактическим переносам), слово или символ */
  by?: 'line' | 'word' | 'char';
  /** Шаг каскада, мс; по умолчанию — по единице */
  stagger?: number;
  /** Появление одной единицы, мс */
  duration?: number;
  /** Когда появляться: при прокрутке в окно или сразу при монтировании */
  trigger?: 'view' | 'mount';
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4';
}

const DEFAULT_STAGGER = { line: 90, word: 35, char: 14 } as const;

/**
 * Текст появляется каскадом — строками, словами или символами — когда попадает в окно. Строки — по
 * настоящим переносам: позиции слов меряются после раскладки и при смене ширины. Только opacity,
 * transform и filter. Скринридер читает текст целиком (скрытая копия), разбивка скрыта.
 * `data-effects="off"` и reduced-motion — текст сразу на месте.
 */
export function TextReveal({
  text,
  by = 'line',
  stagger,
  duration = 520,
  trigger = 'view',
  as = 'span',
  className,
  style,
  ...rest
}: TextRevealProps) {
  const rootRef = useRef<HTMLElement>(null);
  const { motion } = useFxEnvironment(rootRef);
  const inView = useInView(rootRef, {
    margin: '0px 0px -8% 0px',
    disabled: trigger !== 'view' || !motion,
  });
  // Переход нужен из начального кадра: элемент, смонтированный сразу «появившимся», не анимируется
  const [armed, setArmed] = useState(false);
  const revealed = motion && armed && (trigger === 'mount' || inView);
  const Tag = as as 'span';
  const tokens = splitReveal(text);

  useEffect(() => {
    if (!motion) return;

    // Два кадра: браузер успевает посчитать начальный стиль, и смена на «появился» становится переходом
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setArmed(true));
    });

    return () => cancelAnimationFrame(frame);
  }, [motion]);

  // Номер строки — по высоте слова в раскладке; перемер при смене ширины
  useLayoutEffect(() => {
    const root = rootRef.current;

    if (by !== 'line' || !root || !motion) return;

    const measure = () => {
      const words = [...root.querySelectorAll<HTMLElement>('[data-word]')];
      const lines = groupLines(words.map((word) => word.offsetTop));

      words.forEach((word, index) => word.style.setProperty('--i', String(lines[index] ?? 0)));
    };

    measure();

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(measure);

    observer.observe(root);

    return () => observer.disconnect();
  }, [by, text, motion]);

  return (
    <Tag
      ref={rootRef}
      className={cx(styles.root, className)}
      data-static={motion ? undefined : ''}
      data-revealed={revealed ? '' : undefined}
      style={
        {
          '--reveal-stagger': `${stagger ?? DEFAULT_STAGGER[by]}ms`,
          '--reveal-duration': `${duration}ms`,
          ...style,
        } as CSSProperties
      }
      {...rest}
    >
      <VisuallyHidden.Root>{text}</VisuallyHidden.Root>

      <span aria-hidden>
        {tokens.map((token, index) => {
          if (token.type === 'space') return token.text;

          if (by === 'char') {
            return (
              <span key={index} className={styles.word}>
                {token.chars.map((char, offset) => (
                  <span
                    key={offset}
                    className={styles.piece}
                    style={{ '--i': token.charStart + offset } as CSSProperties}
                  >
                    {char}
                  </span>
                ))}
              </span>
            );
          }

          return (
            <span
              key={index}
              data-word=""
              className={cx(styles.word, styles.piece)}
              style={by === 'word' ? ({ '--i': token.word } as CSSProperties) : undefined}
            >
              {token.text}
            </span>
          );
        })}
      </span>
    </Tag>
  );
}
