import {
  Children,
  isValidElement,
  type ComponentPropsWithoutRef,
  type JSX,
  type ReactElement,
  type ReactNode,
} from 'react';

import { NAVIGATE_URL } from 'storybook/internal/core-events';
import { addons } from 'storybook/preview-api';

import { Callout, CodeBlock, Divider, Heading, Link, Text } from '@haunt/ui';

import styles from './mdx.module.css';

/*
 * Элементы MDX — компонентами кита: страница документации сделана из того же, из чего экраны, а не из
 * прозы Storybook, перекрашенной селекторами. Класс `sb-unstyled` на каждом корне — сигнал Storybook не
 * трогать элемент и его содержимое: его стили документации написаны как `:not(.sb-unstyled, .sb-unstyled *)`.
 */

const UNSTYLED = 'sb-unstyled';

/** Текст узла: для якоря заголовка и для кода из блока ``` */
function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);

  if (Array.isArray(node)) return node.map(textOf).join('');

  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);

  return '';
}

/** Якорь заголовка: оглавление справа (tocbot) находит заголовки по id, ссылка #раздел ведёт сюда */
function slug(node: ReactNode): string {
  return textOf(node)
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

type Props<T extends keyof JSX.IntrinsicElements> = ComponentPropsWithoutRef<T>;

function H1({ children }: Props<'h1'>) {
  return (
    <Heading level={1} size="3xl" id={slug(children)} className={`${UNSTYLED} ${styles.h1}`}>
      {children}
    </Heading>
  );
}

// Разделы страницы — с TUI-маркером `>`, как заголовки разделов в ките
function H2({ children }: Props<'h2'>) {
  return (
    <Heading level={2} size="xl" marker id={slug(children)} className={`${UNSTYLED} ${styles.h2}`}>
      {children}
    </Heading>
  );
}

function H3({ children }: Props<'h3'>) {
  return (
    <Heading level={3} size="lg" id={slug(children)} className={`${UNSTYLED} ${styles.h3}`}>
      {children}
    </Heading>
  );
}

function H4({ children }: Props<'h4'>) {
  return (
    <Heading level={4} size="md" id={slug(children)} className={`${UNSTYLED} ${styles.h4}`}>
      {children}
    </Heading>
  );
}

function P({ children }: Props<'p'>) {
  return (
    <Text as="p" className={`${UNSTYLED} ${styles.p}`}>
      {children}
    </Text>
  );
}

/*
 * Внешние — в новой вкладке со значком. Ссылка на другую страницу каталога (`?path=/docs/…`) уходит в
 * менеджер событием NAVIGATE_URL, как у ссылок Storybook: страница живёт во фрейме, и обычный переход
 * открыл бы каталог внутри него. Якорь (#раздел) — как есть, прокрутка в пределах страницы.
 */
function A({ href = '', children }: Props<'a'>) {
  const external = /^https?:\/\//.test(href);
  const internal = !external && !href.startsWith('#');

  return (
    <Link
      href={href}
      external={external}
      target={external ? '_blank' : undefined}
      className={UNSTYLED}
      onClick={
        internal
          ? (event) => {
              event.preventDefault();
              addons.getChannel().emit(NAVIGATE_URL, href);
            }
          : undefined
      }
    >
      {children}
    </Link>
  );
}

function InlineCode({ children }: Props<'code'>) {
  return <code className={`${UNSTYLED} ${styles.code}`}>{children}</code>;
}

/** Блок ``` → CodeBlock кита: язык из класса `language-tsx`, заголовок — из `title="…"` в мета-строке */
function Pre({ children }: Props<'pre'>) {
  const code = Children.toArray(children).find(isValidElement) as
    ReactElement<{ className?: string; children?: ReactNode; title?: string }> | undefined;
  const language = /language-(\S+)/.exec(code?.props.className ?? '')?.[1];
  const text = textOf(code?.props.children ?? children).replace(/\n$/, '');

  return (
    <CodeBlock
      code={text}
      language={language}
      title={code?.props.title}
      lineNumbers={text.split('\n').length > 6}
      className={`${UNSTYLED} ${styles.pre}`}
    />
  );
}

// Цитата в MDX — заметка: `> Важно: …` на странице руководства читается как Callout
function Blockquote({ children }: Props<'blockquote'>) {
  return (
    <Callout tone="info" className={`${UNSTYLED} ${styles.callout}`}>
      {children}
    </Callout>
  );
}

function Hr() {
  return <Divider className={`${UNSTYLED} ${styles.hr}`} />;
}

function Ul({ children }: Props<'ul'>) {
  return <ul className={`${UNSTYLED} ${styles.list}`}>{children}</ul>;
}

function Ol({ children }: Props<'ol'>) {
  return <ol className={`${UNSTYLED} ${styles.list}`}>{children}</ol>;
}

function Li({ children }: Props<'li'>) {
  return <li className={styles.item}>{children}</li>;
}

// Таблица — карточкой с прокруткой по ширине: длинные пути в ячейках не ломают страницу
function Table({ children }: Props<'table'>) {
  return (
    <div className={`${UNSTYLED} ${styles.tableWrap}`}>
      <table className={styles.table}>{children}</table>
    </div>
  );
}

export const mdxComponents = {
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  p: P,
  a: A,
  code: InlineCode,
  pre: Pre,
  blockquote: Blockquote,
  hr: Hr,
  ul: Ul,
  ol: Ol,
  li: Li,
  table: Table,
};
