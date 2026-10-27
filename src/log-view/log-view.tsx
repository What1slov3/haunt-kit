import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';

import { BoxFrame } from '../box-frame/box-frame';
import { BOX_GLYPHS, horizontalRun } from '../box-frame/box-glyphs';
import { CommandLine } from '../command-line/command-line';
import { cx } from '../lib/cx';
import { useUiLocale, useUiStrings } from '../strings/ui-strings-context';
import { toDate, type TimestampInput } from '../timestamp/timestamp-format';
import { useVirtualWindow } from '../virtual-list/use-virtual-window';

import { formatLogTime, isNearBottom, visibleLines } from './log-view-model';
import styles from './log-view.module.css';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogLine {
  /** Устойчивый ключ: по нему видно, что пришла новая строка */
  id: string | number;
  time?: TimestampInput;
  level?: LogLevel;
  /** Источник: бот, модуль, участник — в скобках-метке (гаснут с data-tui="off") */
  source?: string;
  text: ReactNode;
}

export interface LogViewProps extends Omit<ComponentPropsWithRef<'div'>, 'onSubmit'> {
  lines: readonly LogLine[];
  /** Сколько последних строк держать; старые уходят сверху */
  maxLines?: number;
  /**
   * Виртуализация: в DOM только строки в окне. По умолчанию включается сама, когда строк больше 200 —
   * журнал на тысячи строк (`maxLines` 5000) не держит их все в DOM
   */
  virtual?: boolean;
  /** Высота журнала; по умолчанию 240 px */
  height?: number | string;
  /** Строка ввода внизу (консоль бота): Enter отправляет команду и очищает поле */
  onSubmit?: (command: string) => void;
  /** Приглашение строки ввода — как у `CommandLine` */
  prompt?: boolean | string;
  inputPlaceholder?: string;
  /** Сколько отправленных команд помнить для ↑ / ↓; 0 — без истории. По умолчанию 50 */
  historySize?: number;
  /** История с прошлого раза (от старых к новым) — например, из localStorage экрана */
  defaultHistory?: readonly string[];
  /** Подпись журнала и строки ввода для скринридера */
  label?: string;
  /** Локаль времени строк; по умолчанию — из UiStringsProvider (без него ru) */
  locale?: string;
}

/** С этого числа строк журнал виртуализируется сам: сотня строк дешевле измерений окна */
const VIRTUAL_FROM = 200;
/** Строка журнала — кегль 12 px × 1.45; длинные переносятся и измеряются */
const LINE_ESTIMATE = 16;

const levelLabel: Record<LogLevel, string> = {
  debug: 'DBG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERR',
};

function LogRow({
  line,
  locale,
  index,
  measure,
}: {
  line: LogLine;
  locale: string;
  index?: number;
  measure?: (element: HTMLElement | null) => void | (() => void);
}) {
  const date = line.time === undefined ? undefined : toDate(line.time);
  const validDate = date && !Number.isNaN(date.getTime()) ? date : undefined;

  return (
    <div ref={measure} className={styles.line} data-level={line.level} data-virtual-index={index}>
      {validDate && (
        <time className={styles.time} dateTime={validDate.toISOString()}>
          {formatLogTime(validDate, locale)}
        </time>
      )}

      {line.level && <span className={styles.level}>{levelLabel[line.level]}</span>}

      {line.source && <span className={styles.source}>{line.source}</span>}

      <span className={styles.text}>{line.text}</span>
    </div>
  );
}

/**
 * Терминальный журнал: журнал событий сообщества, консоль бота. Окно из псевдографики, моно-строки в
 * клетках сетки — время, уровень цветом, источник, текст; высота области строк — целое число строк,
 * поэтому внизу журнала верхняя строка не обрезана. Пока пользователь внизу, новые строки прокручивают
 * журнал; прокрутил вверх читать — журнал стоит, а внизу появляется строка «новые строки ↓» в обратном
 * цвете. Строка ввода — `CommandLine` под разделителем `├──┤`: история ↑ / ↓ и курсор — её.
 */
export function LogView({
  lines,
  maxLines,
  virtual,
  height = 240,
  onSubmit,
  prompt = true,
  inputPlaceholder,
  historySize = 50,
  defaultHistory,
  label: labelProp,
  locale: localeProp,
  className,
  style,
  ...rest
}: LogViewProps) {
  const text = useUiStrings().logView;
  const locale = useUiLocale(localeProp);
  const label = labelProp ?? text.label;
  const viewportRef = useRef<HTMLDivElement>(null);
  // Флаг, а не состояние: меняется на каждом событии прокрутки, и рендер на это не нужен
  const followRef = useRef(true);
  const [unseen, setUnseen] = useState(false);
  const shown = visibleLines(lines, maxLines);
  const lastId = shown.at(-1)?.id;
  const isVirtual = virtual ?? shown.length > VIRTUAL_FROM;

  const windowed = useVirtualWindow({
    count: shown.length,
    getKey: (index) => shown[index]?.id ?? index,
    estimateSize: () => LINE_ESTIMATE,
    scrollRef: viewportRef,
    enabled: isVirtual,
    overscan: 12,
    stickToBottom: true,
  });

  // Layout-эффект: прокрутка до отрисовки, иначе новая строка мелькнёт под нижним краем
  useLayoutEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || lastId === undefined) return;

    if (followRef.current) {
      viewport.scrollTop = viewport.scrollHeight;
    } else {
      setUnseen(true);
    }
  }, [lastId]);

  const onScroll = () => {
    const viewport = viewportRef.current;

    if (!viewport) return;

    followRef.current = isNearBottom(viewport);

    if (followRef.current) setUnseen(false);
  };

  const jumpToEnd = () => {
    const viewport = viewportRef.current;

    if (!viewport) return;

    followRef.current = true;
    viewport.scrollTop = viewport.scrollHeight;
    windowed.scrollToEnd();
    setUnseen(false);
  };

  const glyphs = BOX_GLYPHS.single;

  return (
    <BoxFrame
      padding="none"
      className={cx(styles.root, className)}
      style={{ height, ...style }}
      {...rest}
    >
      <div className={styles.pane}>
        <div className={styles.body}>
          <div
            ref={viewportRef}
            role="log"
            aria-label={label}
            // Фокусируемая область прокрутки: журнал листается с клавиатуры
            tabIndex={0}
            className={styles.viewport}
            data-virtual={isVirtual || undefined}
            onScroll={onScroll}
          >
            {isVirtual ? (
              <div style={{ paddingTop: windowed.before, paddingBottom: windowed.after }}>
                {windowed.items.map((item) => (
                  <LogRow
                    key={item.key}
                    line={shown[item.index] as LogLine}
                    locale={locale}
                    index={item.index}
                    measure={windowed.measureElement}
                  />
                ))}
              </div>
            ) : (
              shown.map((line) => <LogRow key={line.id} line={line} locale={locale} />)
            )}
          </div>

          {unseen && (
            <button type="button" className={styles.newLines} onClick={jumpToEnd}>
              {text.newLines}
            </button>
          )}
        </div>

        {onSubmit && (
          <>
            {/* Разделитель ложится поверх боковых «│» рамки: ├ и ┤ содержат их целиком */}
            <div className={styles.rule} aria-hidden>
              <span>{glyphs.tRight}</span>

              <span className={styles.ruleRun}>{horizontalRun(glyphs.h)}</span>

              <span>{glyphs.tLeft}</span>
            </div>

            <CommandLine
              size="sm"
              className={styles.input}
              prompt={prompt}
              placeholder={inputPlaceholder ?? text.inputPlaceholder}
              label={text.input(label)}
              historySize={historySize}
              defaultHistory={defaultHistory}
              onSubmit={(command) => {
                onSubmit(command);
                // Своя команда — повод вернуться вниз, даже если журнал листали
                jumpToEnd();
              }}
            />
          </>
        )}
      </div>
    </BoxFrame>
  );
}
