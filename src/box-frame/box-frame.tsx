import type { ComponentPropsWithRef, ReactNode } from 'react';

import { cx } from '../lib/cx';

import { BOX_GLYPHS, horizontalRun, verticalRun, type BoxFrameVariant } from './box-glyphs';
import styles from './box-frame.module.css';

export type { BoxFrameVariant } from './box-glyphs';

export interface BoxFrameProps extends Omit<ComponentPropsWithRef<'section'>, 'title'> {
  /** Заголовок в верхней линии: `┌─ Журнал ──┐` */
  title?: ReactNode;
  /** Подпись в нижней линии справа: статус, счётчик */
  footer?: ReactNode;
  /** одинарная `┌─┐`, двойная `╔═╗`, скруглённая `╭─╮`, жирная `┏━┓` */
  variant?: BoxFrameVariant;
  /** Цвет линий: тихий, как рамки, или цвет акцента — активное окно */
  tone?: 'default' | 'accent';
  /** Отступ содержимого от линий; по умолчанию — один знак по бокам */
  padding?: 'none' | 'default';
}

/**
 * Рамка-окно терминала из настоящих знаков `┌─┐│└┘` (шрифт глифов кита, клетка моно-сетки). Линии
 * тянутся по содержимому без измерения в JS (`box-glyphs.ts`), строки рамки — высотой в строку TUI,
 * так что содержимое моно ложится в ту же сетку знаков. Заголовок и подпись — настоящий текст в линии,
 * читаются скринридером; сами линии скрыты. При `data-tui="off"` — обычная тонкая рамка со
 * скруглением, заголовок — строка над содержимым.
 */
export function BoxFrame({
  title,
  footer,
  variant = 'single',
  tone = 'default',
  padding = 'default',
  className,
  children,
  ...rest
}: BoxFrameProps) {
  const glyphs = BOX_GLYPHS[variant];
  const hasTitle = title !== undefined && title !== null;
  const hasFooter = footer !== undefined && footer !== null;

  return (
    <section
      className={cx(
        styles.root,
        tone === 'accent' && styles.accent,
        padding === 'none' && styles.flush,
        className,
      )}
      data-variant={variant}
      {...rest}
    >
      <div className={cx(styles.edge, styles.top)}>
        <span className={styles.glyph} aria-hidden>
          {glyphs.tl}
        </span>

        {hasTitle && (
          <>
            <span className={styles.glyph} aria-hidden>
              {glyphs.h}
            </span>

            <span className={styles.title}>{title}</span>
          </>
        )}

        <span className={styles.run} aria-hidden>
          {horizontalRun(glyphs.h)}
        </span>

        <span className={styles.glyph} aria-hidden>
          {glyphs.tr}
        </span>
      </div>

      <div className={styles.middle}>
        <span className={styles.side} aria-hidden>
          {verticalRun(glyphs.v)}
        </span>

        <div className={styles.content}>{children}</div>

        <span className={styles.side} aria-hidden>
          {verticalRun(glyphs.v)}
        </span>
      </div>

      <div className={cx(styles.edge, styles.bottom)}>
        <span className={styles.glyph} aria-hidden>
          {glyphs.bl}
        </span>

        <span className={styles.run} aria-hidden>
          {horizontalRun(glyphs.h)}
        </span>

        {hasFooter && (
          <>
            <span className={styles.footer}>{footer}</span>

            <span className={styles.glyph} aria-hidden>
              {glyphs.h}
            </span>
          </>
        )}

        <span className={styles.glyph} aria-hidden>
          {glyphs.br}
        </span>
      </div>
    </section>
  );
}
