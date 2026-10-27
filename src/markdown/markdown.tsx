import { lazy, Suspense } from 'react';

import { cx } from '../lib/cx';

import type { MarkdownProps } from './markdown-types';

import styles from './markdown.module.css';

// react-markdown с remark/rehype — десятки килобайт, а первому экрану нужен только текст
const MarkdownView = lazy(() => import('./markdown-view'));

/**
 * Пока рендер грузится — тот же текст как есть, с переносами (`pre-wrap`): строка ленты сразу нужной высоты
 * и не прыгает, когда приходит разметка. Экспортирован для истории «ленивая загрузка».
 */
export function MarkdownFallback({
  children,
  inline,
  className,
  resolveMention: _resolveMention,
  onLinkClick: _onLinkClick,
  emoji: _emoji,
  ...rest
}: MarkdownProps) {
  const Root = inline ? 'span' : 'div';

  return (
    <Root
      className={cx(styles.root, styles.fallback, inline && styles.inline, className)}
      data-loading
      {...rest}
    >
      {inline ? children.replace(/\s*\n\s*/g, ' ').trim() : children}
    </Root>
  );
}

/**
 * Текст сообщения: GFM (жирный, курсив, зачёркнутый, код, блоки кода, цитаты, списки, таблицы, задачи,
 * автоссылки), переносы строк как в чате, `||спойлер||`, упоминания и шорткоды эмодзи. Сырой HTML — текстом,
 * ссылки — только http, https и mailto, картинок нет. Рендер подгружается лениво.
 */
export function Markdown(props: MarkdownProps) {
  return (
    <Suspense fallback={<MarkdownFallback {...props} />}>
      <MarkdownView {...props} />
    </Suspense>
  );
}
