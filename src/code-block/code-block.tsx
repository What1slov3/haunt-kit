import { useEffect, useState, type ComponentPropsWithRef, type ReactNode } from 'react';

import { Check, Copy, FileCode2 } from 'lucide-react';

import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { cx } from '../lib/cx';
import { useUiStrings } from '../strings/ui-strings-context';

import styles from './code-block.module.css';
import { CodeLine } from './code-line';
import { useHighlight } from './use-highlight';

export interface CodeBlockProps extends Omit<ComponentPropsWithRef<'figure'>, 'title'> {
  /** Текст кода */
  code: string;
  /** Имя файла или подпись в шапке; без него кнопка копирования висит в углу */
  title?: ReactNode;
  /** Иконка у подписи; по умолчанию — файл с кодом */
  icon?: ReactNode;
  /**
   * Язык — в data-language, подписью справа в шапке и для подсветки (`ts`, `tsx`, `rust`, `sh`… — список в
   * languages.ts). Незнакомый язык — блок без подсветки
   */
  language?: string;
  /** Подсветка синтаксиса (shiki, грузится лениво при первом блоке); по умолчанию — есть */
  syntax?: boolean;
  /** Номера строк слева */
  lineNumbers?: boolean;
  /** Номера выделенных строк, с 1 */
  highlight?: number[];
  /** Кнопка «копировать»; по умолчанию есть */
  copyable?: boolean;
  /** Высота, после которой блок прокручивается */
  maxHeight?: number | string;
}

/** Сколько держится галочка после копирования */
const COPIED_MS = 1500;

/**
 * Блок кода в духе Fumadocs: шапка с именем файла и копированием, моно 12 px на тихом фоне,
 * выделенные строки — полосой акцента. Подсветка синтаксиса — shiki, лениво: пока грамматика грузится,
 * блок показан простым текстом той же раскладки. Цвета — из токенов темы (`--code-*` в модуле).
 */
export function CodeBlock({
  code,
  title,
  icon,
  language,
  syntax = true,
  lineNumbers,
  highlight,
  copyable = true,
  maxHeight,
  className,
  ...rest
}: CodeBlockProps) {
  const strings = useUiStrings();
  const [copied, setCopied] = useState(false);
  const source = code.replace(/\n$/, '');
  const lines = source.split('\n');
  const marked = new Set(highlight);
  const tokens = useHighlight(source, language, syntax);

  useEffect(() => {
    if (!copied) return;

    const timer = window.setTimeout(() => setCopied(false), COPIED_MS);

    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Буфер обмена недоступен (нет фокуса, запрет браузера) — кнопка просто не отмечается
    }
  };

  const copyButton = copyable && (
    <IconButton
      label={copied ? strings.codeBlock.copied : strings.codeBlock.copy}
      size="xs"
      variant="ghost"
      className={cx(styles.copy, !title && styles.copyFloating)}
      onClick={copy}
      data-copied={copied || undefined}
    >
      <Icon icon={copied ? Check : Copy} size="xs" />
    </IconButton>
  );

  return (
    <figure
      className={cx(styles.root, className)}
      data-language={language}
      data-syntax={tokens ? 'on' : undefined}
      {...rest}
    >
      {title && (
        <figcaption className={styles.header}>
          <span className={styles.icon}>{icon ?? <Icon icon={FileCode2} size="sm" />}</span>

          <span className={styles.title}>{title}</span>

          {language && <span className={styles.language}>{language}</span>}

          {copyButton}
        </figcaption>
      )}

      {!title && copyButton}

      <pre className={styles.pre} style={{ maxHeight }} tabIndex={0}>
        <code className={cx(styles.code, lineNumbers && styles.numbered)}>
          {lines.map((line, index) => (
            <span
              // Строки кода не переставляются: индекс — стабильный ключ
              key={index}
              className={styles.line}
              data-highlighted={marked.has(index + 1) || undefined}
            >
              <CodeLine text={line} tokens={tokens?.[index]} />
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}
