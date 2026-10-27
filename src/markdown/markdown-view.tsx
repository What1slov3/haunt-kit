import { useMemo, type ReactNode } from 'react';

import ReactMarkdown, { type Components, type ExtraProps } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { type Options as SanitizeSchema } from 'rehype-sanitize';

import { CodeBlock } from '../code-block/code-block';
import { cx } from '../lib/cx';
import { Link } from '../link/link';
import { Mention } from '../mention/mention';

import {
  isSafeUrl,
  rehypeRawAsText,
  remarkHauntSyntax,
  type HauntSyntaxOptions,
} from './markdown-plugins';
import type { MarkdownMentionKind, MarkdownProps } from './markdown-types';
import { Spoiler } from './spoiler';

import styles from './markdown.module.css';

/*
 * Ленивый рендер `Markdown`: react-markdown, remark-* и rehype-* импортируются только отсюда и из
 * markdown-plugins.ts, который импортирует только этот модуль. Лёгкий markdown.tsx грузит его через
 * `lazy(() => import(...))` — в стартовый чанк приложения пакеты не попадают.
 */

type HastElement = NonNullable<ExtraProps['node']>;

/** Только то, что рендерим сами; картинки выключены — вложения идут отдельным механизмом */
const BLOCK_ELEMENTS = [
  'p',
  'br',
  'strong',
  'em',
  'del',
  'code',
  'pre',
  'a',
  'span',
  'blockquote',
  'ul',
  'ol',
  'li',
  'input',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
];

/** Превью — одна строка: блоки разворачиваются в содержимое (`unwrapDisallowed`) */
const INLINE_ELEMENTS = ['strong', 'em', 'del', 'code', 'a', 'span'];

/*
 * Схема санитайзера — белый список под наш рендер, а не defaultSchema GitHub: та пропускает `img`, `details`,
 * `div` с атрибутами и сноски. data-* на `span` разрешены только с нашими значениями из markdown-plugins.ts.
 */
const schema: SanitizeSchema = {
  tagNames: BLOCK_ELEMENTS,
  attributes: {
    a: ['href'],
    code: [['className', /^language-./]],
    input: [['type', 'checkbox'], ['disabled', true], 'checked'],
    li: [['className', 'task-list-item']],
    ul: [['className', 'contains-task-list']],
    ol: ['start'],
    td: ['align'],
    th: ['align'],
    span: [['dataHaunt', 'spoiler', 'mention', 'emoji'], 'dataKind', 'dataName', 'dataShortcode'],
  },
  required: { input: { type: 'checkbox', disabled: true } },
  protocols: { href: ['http', 'https', 'mailto'] },
  ancestors: {
    tbody: ['table'],
    td: ['table'],
    th: ['table'],
    thead: ['table'],
    tr: ['table'],
  },
  clobber: ['id', 'name'],
  clobberPrefix: 'user-content-',
  strip: ['script', 'style'],
};

/** Ссылка с запрещённым протоколом теряет href и рендерится текстом (компонент `a` ниже) */
const urlTransform = (url: string) => (isSafeUrl(url) ? url : null);

function textOf(node: HastElement['children'][number]): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return node.children.map(textOf).join('');

  return '';
}

function codeOf(pre: HastElement | undefined): { code: string; language?: string } {
  const code = pre?.children.find(
    (child): child is HastElement => child.type === 'element' && child.tagName === 'code',
  );
  const classes = code?.properties.className;
  const language = (Array.isArray(classes) ? classes : [])
    .map(String)
    .find((name) => name.startsWith('language-'))
    ?.slice('language-'.length);

  return { code: code ? textOf(code) : '', language };
}

/** Блок кода в сообщении не растягивает ленту: дальше — прокрутка внутри */
const CODE_MAX_HEIGHT = 360;

function useComponents({
  resolveMention,
  onLinkClick,
}: Pick<MarkdownProps, 'resolveMention' | 'onLinkClick'>): Components {
  return useMemo(
    () => ({
      a: ({ href, children }) =>
        href ? (
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => onLinkClick?.(href, event)}
          >
            {children}
          </Link>
        ) : (
          <span>{children}</span>
        ),
      pre: ({ node }) => {
        const { code, language } = codeOf(node);

        // Язык — для подсветки CodeBlock; шапки с именем файла у сообщения нет, копирование — в углу
        return (
          <CodeBlock
            code={code}
            language={language}
            className={styles.codeBlock}
            maxHeight={CODE_MAX_HEIGHT}
          />
        );
      },
      code: ({ children }) => <code className={styles.code}>{children}</code>,
      input: ({ checked }) => (
        <input
          type="checkbox"
          checked={Boolean(checked)}
          disabled
          readOnly
          className={styles.task}
        />
      ),
      table: ({ children }) => (
        <div className={styles.tableWrap}>
          <table>{children}</table>
        </div>
      ),
      span: (props) => {
        const data = props as Record<string, unknown> & { children?: ReactNode };

        if (data['data-haunt'] === 'spoiler') return <Spoiler>{data.children}</Spoiler>;

        if (data['data-haunt'] === 'emoji') {
          return (
            <span
              className={styles.emoji}
              role="img"
              aria-label={`:${String(data['data-shortcode'])}:`}
            >
              {data.children}
            </span>
          );
        }

        if (data['data-haunt'] === 'mention') {
          const kind = data['data-kind'] as MarkdownMentionKind;
          const name = String(data['data-name']);
          const resolved = resolveMention?.(kind, name);

          if (!resolved) return <>{data.children}</>;

          const { label, ...mention } = resolved;

          return (
            <Mention kind={kind === 'channel' ? 'channel' : 'user'} {...mention}>
              {label ?? name}
            </Mention>
          );
        }

        return <span>{data.children}</span>;
      },
    }),
    [resolveMention, onLinkClick],
  );
}

export default function MarkdownView({
  children,
  inline,
  resolveMention,
  onLinkClick,
  emoji,
  className,
  ...rest
}: MarkdownProps) {
  const components = useComponents({ resolveMention, onLinkClick });
  const mentions = Boolean(resolveMention);

  // Разбор — на смену текста или словаря, а не на каждый рендер ленты
  const content = useMemo(() => {
    const syntax: [typeof remarkHauntSyntax, HauntSyntaxOptions] = [
      remarkHauntSyntax,
      { mentions, emoji },
    ];

    return (
      <ReactMarkdown
        remarkPlugins={inline ? [remarkGfm, syntax] : [remarkGfm, remarkBreaks, syntax]}
        rehypePlugins={[rehypeRawAsText, [rehypeSanitize, schema]]}
        allowedElements={inline ? INLINE_ELEMENTS : BLOCK_ELEMENTS}
        unwrapDisallowed
        urlTransform={urlTransform}
        components={components}
      >
        {/* Превью одной строкой: переносы — пробелы, иначе абзацы слиплись бы без пробела */}
        {inline ? children.replace(/\s*\n\s*/g, ' ').trim() : children}
      </ReactMarkdown>
    );
  }, [children, inline, mentions, emoji, components]);

  const Root = inline ? 'span' : 'div';

  return (
    <Root className={cx(styles.root, inline && styles.inline, className)} data-ready {...rest}>
      {content}
    </Root>
  );
}
