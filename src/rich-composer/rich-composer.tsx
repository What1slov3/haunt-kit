import {
  useEffect,
  useEffectEvent,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';

import { VisuallyHidden } from 'radix-ui';

import { loadEmojiData } from '../emoji-picker/emoji-load';
import { searchEmoji } from '../emoji-picker/emoji-search';
import { useFieldControl } from '../field/field-context';
import { FieldFrame } from '../field-frame/field-frame';
import { currentPlatform, isApplePlatform } from '../lib/hotkey';
import { cx } from '../lib/cx';
import mentionStyles from '../mention/mention.module.css';
import { useUiStrings } from '../strings/ui-strings-context';

import {
  caretRect,
  createTokenRegistry,
  positionFromDom,
  readDocFromDom,
  readSelection,
  renderDoc,
  selectionInsideToken,
  writeSelection,
} from './composer-dom';
import {
  emptyHistory,
  recordEdit,
  redoHistory,
  undoHistory,
  type ComposerEdit,
} from './composer-history';
import {
  composerTextLength,
  composerToMarkdown,
  type ComposerSerializeOptions,
} from './composer-markdown';
import {
  applyTrigger,
  caretAt,
  clampSelection,
  deleteContent,
  docLength,
  emptyComposerDoc,
  findTrigger,
  insertSegments,
  insertText,
  isCollapsed,
  isDocEmpty,
  moveSelection,
  sameDoc,
  selectionRange,
  sliceDoc,
  wrapSelection,
  type ComposerDoc,
  type ComposerEditResult,
  type ComposerSelection,
  type ComposerToken,
  type ComposerTrigger,
  type ComposerTriggerRule,
  type ComposerUnit,
} from './composer-model';
import styles from './rich-composer.module.css';
import { SuggestionList } from './suggestion-list';

export interface ComposerSuggestion {
  /** Уникален в списке */
  key: string;
  /** Подпись в списке — в ней подсвечивается запрос */
  label: string;
  /** Вторая подпись справа: имя, число участников, название эмодзи */
  description?: string;
  /** Аватар, иконка канала, сам эмодзи */
  icon?: ReactNode;
  /** Что встанет в поле вместо `@запрос` */
  token: ComposerToken;
}

/**
 * Источник подсказок: запрос без знака и сигнал отмены — запрос меняется на каждый символ, прежний
 * ответ уже не нужен. Можно вернуть массив сразу или промис
 */
export type ComposerSource = (
  query: string,
  signal: AbortSignal,
) => readonly ComposerSuggestion[] | Promise<readonly ComposerSuggestion[]>;

export type ComposerSuggestionGroup = 'mention' | 'channel' | 'emoji';

export interface ComposerSources {
  /** `@` — участники и роли */
  mention?: ComposerSource;
  /** `#` — каналы */
  channel?: ComposerSource;
  /** `:` — эмодзи; по умолчанию встроенный набор (`loadEmojiData`), `false` — выключить */
  emoji?: ComposerSource | false;
}

export interface ComposerSubmit {
  doc: ComposerDoc;
  /** Текст сообщения в синтаксисе `Markdown`: `@ник`, `#канал` */
  text: string;
}

/** Управление полем из кнопок рядом: эмодзи-пикер, тулбар разметки, «отправить» */
export interface RichComposerApi {
  focus: () => void;
  insertText: (text: string) => void;
  insertToken: (token: ComposerToken) => void;
  /** Обернуть выделение маркерами разметки: `wrapSelection('**')` */
  wrapSelection: (before: string, after?: string) => void;
  submit: () => void;
  undo: () => void;
  redo: () => void;
}

export type RichComposerSlot = ReactNode | ((api: RichComposerApi) => ReactNode);

export interface RichComposerProps {
  value?: ComposerDoc;
  defaultValue?: ComposerDoc;
  /** Черновик целиком на каждую правку — его можно хранить и восстановить через `markdownToComposer` */
  onValueChange?: (doc: ComposerDoc) => void;
  /**
   * Enter. Без `value` поле очищается само, если не вернуть `false`; с `value` очищает экран. Пустое и
   * сверх лимита не отправляется
   */
  onSubmit?: (message: ComposerSubmit) => void | false;
  /** Отправлять пустое: у сообщения есть вложения */
  allowEmptySubmit?: boolean;
  /** ↑ в пустом поле — правка своего последнего сообщения */
  onEditLast?: () => void;
  /** Вставили или бросили файлы; превью — `attachments` */
  onFiles?: (files: File[]) => void;
  sources?: ComposerSources;
  placeholder?: string;
  /** Лимит символов отправляемого текста: счётчик с 80 %, сверх лимита — рамка ошибки и Enter не отправляет */
  maxLength?: number;
  /** Эмодзи в тексте сообщения: символом (по умолчанию) или `:шорткодом:` */
  emojiFormat?: ComposerSerializeOptions['emoji'];
  /** Кнопки слева от текста: прикрепить */
  start?: RichComposerSlot;
  /** Кнопки справа: эмодзи, отправить */
  end?: RichComposerSlot;
  /** Тулбар разметки над текстом — `Toolbar.Root` без рамки */
  toolbar?: RichComposerSlot;
  /** Превью вложений над текстом — `AttachmentCard` */
  attachments?: ReactNode;
  disabled?: boolean;
  invalid?: boolean;
  /** Градиентная кромка в фокусе, как у композера мессенджера; по умолчанию да */
  glow?: boolean;
  apiRef?: Ref<RichComposerApi>;
  id?: string;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

interface SuggestState {
  trigger: ComposerTrigger;
  group: ComposerSuggestionGroup;
  items: readonly ComposerSuggestion[];
  loading: boolean;
  active: number;
  anchor: DOMRect;
}

const GROUPS: Record<string, ComposerSuggestionGroup> = {
  '@': 'mention',
  '#': 'channel',
  ':': 'emoji',
};
const RULES: Record<ComposerSuggestionGroup, ComposerTriggerRule> = {
  mention: { char: '@' },
  channel: { char: '#' },
  emoji: { char: ':', minQuery: 2 },
};

/** Счётчик появляется с этой доли лимита: раньше он только шумит */
const COUNTER_FROM = 0.8;
const EMOJI_LIMIT = 8;

/** Элемент токена в поле — та же плашка, что `Mention` в сообщении, только не кнопка */
function createTokenElement(token: ComposerToken): HTMLElement {
  const element = document.createElement('span');

  element.dataset.token = token.type;

  if (token.type === 'emoji') {
    element.className = styles.emoji ?? '';
    element.textContent = token.char;

    if (token.shortcode) element.title = `:${token.shortcode}:`;

    return element;
  }

  const color = token.type === 'mention' ? token.color : undefined;
  const prefix = document.createElement('span');

  element.className = cx(mentionStyles.mention, color && mentionStyles.colored, styles.token) ?? '';
  element.dataset.kind = token.type === 'channel' ? 'channel' : token.kind;

  if (color) element.style.setProperty('--mention-color', color);

  prefix.className = mentionStyles.prefix ?? '';
  prefix.textContent = token.type === 'channel' ? '#' : '@';
  element.append(prefix, token.label ?? token.name);

  return element;
}

const renderSlot = (slot: RichComposerSlot | undefined, api: RichComposerApi) =>
  typeof slot === 'function' ? slot(api) : slot;

const isThenable = <T,>(value: unknown): value is Promise<T> =>
  typeof (value as Promise<T> | null)?.then === 'function';

/**
 * Поле сообщения: текст с атомарными упоминаниями, каналами и эмодзи, подсказки по `@`, `#`, `:`,
 * вставка файлов, своя история правок. Под капотом — contenteditable, но правит его только модель
 * (`composer-model.ts`): ввод браузера отменяется в `beforeinput` и применяется к документу, DOM
 * перерисовывается из него. Исключение — набор через IME: его браузер ведёт сам, и итог композиции
 * переносится в модель по `compositionend`.
 */
export function RichComposer({
  value,
  defaultValue = emptyComposerDoc,
  onValueChange,
  onSubmit,
  allowEmptySubmit,
  onEditLast,
  onFiles,
  sources,
  placeholder: placeholderProp,
  maxLength,
  emojiFormat,
  start,
  end,
  toolbar,
  attachments,
  disabled,
  invalid,
  glow = true,
  apiRef,
  id,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: RichComposerProps) {
  const strings = useUiStrings();
  const placeholder = placeholderProp ?? strings.richComposer.placeholder;
  const control = useFieldControl({ id, invalid, 'aria-describedby': ariaDescribedBy });
  const baseId = useId();
  const listId = `${baseId}-suggestions`;
  const optionId = (index: number) => `${baseId}-suggestion-${index}`;

  const [innerDoc, setInnerDoc] = useState<ComposerDoc>(defaultValue);
  const [suggest, setSuggest] = useState<SuggestState | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [composing, setComposing] = useState(false);
  // Перерисовать DOM без смены документа: после композиции IME браузер оставил в нём своё
  const [renderTick, setRenderTick] = useState(0);
  const [registry] = useState(() => createTokenRegistry(createTokenElement));

  const doc = value ?? innerDoc;
  const editorRef = useRef<HTMLDivElement>(null);
  /** Последний документ: между правкой и рендером обработчики видят уже новый */
  const docRef = useRef<ComposerDoc>(doc);
  const selectionRef = useRef<ComposerSelection>(caretAt(docLength(doc)));
  /** Выделение, которое надо поставить после рендера этого документа */
  const pendingRef = useRef<{ doc: ComposerDoc; selection: ComposerSelection } | null>(null);
  /** Что поле отдало в onValueChange последним: другое значение пришло извне (очистили после отправки) */
  const emittedRef = useRef<ComposerDoc | null>(null);
  const historyRef = useRef(emptyHistory);
  const composingRef = useRef(false);
  const compositionStartRef = useRef<ComposerSelection | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const suggestKeyRef = useRef('');
  /** Esc закрыл подсказку с этого знака — пока курсор у него, она не открывается снова */
  const dismissedRef = useRef<number | null>(null);
  const pointerFocusRef = useRef(false);

  const count = maxLength === undefined ? 0 : composerTextLength(doc, { emoji: emojiFormat });
  const over = maxLength !== undefined && count > maxLength;
  const showCounter = maxLength !== undefined && count >= maxLength * COUNTER_FROM;
  const counterTone = over
    ? 'danger'
    : maxLength !== undefined && count >= maxLength * 0.9
      ? 'warning'
      : 'default';

  const emojiSource: ComposerSource = async (query, signal) => {
    const categories = await loadEmojiData();

    if (signal.aborted) return [];

    return searchEmoji(categories, query, EMOJI_LIMIT).map((emoji) => ({
      key: emoji.char,
      label: `:${emoji.shortcode}:`,
      description: strings.emojiPicker.emojiName(emoji),
      icon: <span className={styles.emojiIcon}>{emoji.char}</span>,
      token: { type: 'emoji', char: emoji.char, shortcode: emoji.shortcode },
    }));
  };

  const sourceFor = (group: ComposerSuggestionGroup): ComposerSource | undefined => {
    if (group === 'emoji')
      return sources?.emoji === false ? undefined : (sources?.emoji ?? emojiSource);

    return sources?.[group];
  };

  const rules = (Object.keys(RULES) as ComposerSuggestionGroup[])
    .filter((group) => sourceFor(group))
    .map((group) => RULES[group]);

  // --- Подсказки ----------------------------------------------------------------------------------

  const closeSuggestions = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    suggestKeyRef.current = '';
    setSuggest(null);
  };

  /** Подсказка у курсора: открыть, обновить запрос или закрыть */
  const refreshSuggestions = () => {
    const root = editorRef.current;
    const selection = selectionRef.current;
    const focused = root !== null && root.ownerDocument.activeElement === root;
    const trigger =
      focused && !composingRef.current && isCollapsed(selection)
        ? findTrigger(docRef.current, selection.focus, rules)
        : null;

    if (!trigger || dismissedRef.current === trigger.start) {
      if (!trigger) dismissedRef.current = null;
      if (suggestKeyRef.current) closeSuggestions();

      return;
    }

    const key = `${trigger.char}${trigger.start}:${trigger.query}`;

    if (key === suggestKeyRef.current) return;

    const group = GROUPS[trigger.char] as ComposerSuggestionGroup;
    const source = sourceFor(group);
    const anchor = caretRect(root!, trigger.start, registry) ?? root!.getBoundingClientRect();

    if (!source) return;

    requestRef.current?.abort();

    const controller = new AbortController();

    requestRef.current = controller;
    suggestKeyRef.current = key;

    const ready = (items: readonly ComposerSuggestion[]) => {
      if (controller.signal.aborted) return;

      setSuggest({ trigger, group, items, loading: false, active: 0, anchor });
      setAnnouncement(
        items.length ? strings.richComposer.results(items.length) : strings.richComposer.empty,
      );
    };

    let result: ReturnType<ComposerSource>;

    try {
      result = source(trigger.query, controller.signal);
    } catch {
      result = [];
    }

    if (!isThenable<readonly ComposerSuggestion[]>(result)) {
      ready(result);

      return;
    }

    // Пока ищется — прежние пункты той же группы: список не мигает пустым на каждый символ
    setSuggest((previous) => ({
      trigger,
      group,
      items: previous?.group === group ? previous.items : [],
      loading: true,
      active: 0,
      anchor,
    }));
    result.then(ready, () => ready([]));
  };

  // --- Правки -------------------------------------------------------------------------------------

  const emit = (next: ComposerDoc, selection: ComposerSelection) => {
    docRef.current = next;
    selectionRef.current = selection;
    pendingRef.current = { doc: next, selection };
    emittedRef.current = next;

    if (value === undefined) setInnerDoc(next);

    onValueChange?.(next);
  };

  const apply = (result: ComposerEditResult, edit: ComposerEdit) => {
    const root = editorRef.current;

    if (sameDoc(result.doc, docRef.current)) {
      selectionRef.current = result.selection;

      if (root) writeSelection(root, result.selection, registry);

      refreshSuggestions();

      return;
    }

    historyRef.current = recordEdit(
      historyRef.current,
      { doc: docRef.current, selection: selectionRef.current },
      edit,
      Date.now(),
    );
    emit(result.doc, result.selection);
  };

  /** Выделение прямо из DOM: selectionchange приходит асинхронно и мог ещё не дойти */
  const currentSelection = (): ComposerSelection => {
    const root = editorRef.current;
    const fromDom = root ? readSelection(root, registry) : null;

    if (fromDom) selectionRef.current = clampSelection(docRef.current, fromDom);

    return selectionRef.current;
  };

  const travel = (entry: 'undo' | 'redo') => {
    const current = { doc: docRef.current, selection: selectionRef.current };
    const result =
      entry === 'undo'
        ? undoHistory(historyRef.current, current)
        : redoHistory(historyRef.current, current);

    if (!result) return;

    historyRef.current = result.history;
    emit(result.entry.doc, result.entry.selection);
  };

  const submit = () => {
    const current = docRef.current;

    if (disabled || over) return;
    if (!allowEmptySubmit && isDocEmpty(current)) return;

    const handled = onSubmit?.({
      doc: current,
      text: composerToMarkdown(current, { emoji: emojiFormat }),
    });

    if (value === undefined && handled !== false) {
      historyRef.current = emptyHistory;
      emit(emptyComposerDoc, caretAt(0));
    }
  };

  const choose = (index: number) => {
    const item = suggest?.items[index];

    if (!suggest || !item) return;

    closeSuggestions();
    apply(applyTrigger(docRef.current, suggest.trigger, item.token), { kind: 'other' });
  };

  const focus = () => {
    const root = editorRef.current;

    if (!root) return;

    root.focus({ preventScroll: true });
    writeSelection(root, selectionRef.current, registry);
  };

  const handlers = {
    focus,
    insertText: (text: string) =>
      apply(insertText(docRef.current, selectionRef.current, text), { kind: 'other' }),
    insertToken: (token: ComposerToken) =>
      apply(
        insertSegments(docRef.current, selectionRef.current, [token, { type: 'text', text: ' ' }]),
        {
          kind: 'other',
        },
      ),
    wrapSelection: (before: string, after?: string) =>
      apply(wrapSelection(docRef.current, selectionRef.current, before, after), { kind: 'other' }),
    submit,
    undo: () => travel('undo'),
    redo: () => travel('redo'),
  };
  const handlersRef = useRef(handlers);

  useLayoutEffect(() => {
    handlersRef.current = handlers;
  });

  // Объект API постоянный: кнопки снаружи могут держать его в замыканиях; методы берут свежие обработчики
  const [api] = useState<RichComposerApi>(() => ({
    focus: () => handlersRef.current.focus(),
    insertText: (text) => {
      handlersRef.current.insertText(text);
      handlersRef.current.focus();
    },
    insertToken: (token) => {
      handlersRef.current.insertToken(token);
      handlersRef.current.focus();
    },
    wrapSelection: (before, after) => {
      handlersRef.current.wrapSelection(before, after);
      handlersRef.current.focus();
    },
    submit: () => handlersRef.current.submit(),
    undo: () => handlersRef.current.undo(),
    redo: () => handlersRef.current.redo(),
  }));

  useImperativeHandle(apiRef, () => api, [api]);

  // --- DOM из документа ---------------------------------------------------------------------------

  useLayoutEffect(() => {
    docRef.current = doc;
  });

  useLayoutEffect(() => {
    const root = editorRef.current;

    if (!root || composingRef.current) return;

    renderDoc(root, doc, registry);

    const pending = pendingRef.current;

    if (doc !== emittedRef.current) {
      // Значение пришло извне: черновик восстановили или очистили после отправки — история с нуля
      historyRef.current = emptyHistory;
      emittedRef.current = doc;
      selectionRef.current = caretAt(docLength(doc));
    } else {
      selectionRef.current = clampSelection(
        doc,
        pending?.doc === doc ? pending.selection : selectionRef.current,
      );
    }

    pendingRef.current = null;

    if (root.ownerDocument.activeElement === root) {
      writeSelection(root, selectionRef.current, registry);
      keepCaretVisible(root);
    }

    refreshSuggestions();
    // refreshSuggestions читает свежие ref-ы; перерисовка — только по документу и принудительному тику
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, renderTick, registry]);

  // --- События поля -------------------------------------------------------------------------------

  const onBeforeInput = useEffectEvent((event: InputEvent) => {
    const type = event.inputType;

    // Композицию IME ведёт браузер (её не отменить), итог забираем в compositionend
    if (composingRef.current || type.includes('Composition')) return;

    event.preventDefault();

    if (disabled) return;

    let selection = currentSelection();
    const deletion: Record<string, [-1 | 1, ComposerUnit]> = {
      deleteContentBackward: [-1, 'char'],
      deleteContentForward: [1, 'char'],
      deleteWordBackward: [-1, 'word'],
      deleteWordForward: [1, 'word'],
      deleteSoftLineBackward: [-1, 'line'],
      deleteHardLineBackward: [-1, 'line'],
      deleteSoftLineForward: [1, 'line'],
      deleteHardLineForward: [1, 'line'],
    };

    if (type in deletion) {
      const [direction, unit] = deletion[type]!;

      apply(deleteContent(docRef.current, selection, direction, unit), { kind: 'delete' });

      return;
    }

    if (type === 'historyUndo' || type === 'historyRedo') {
      travel(type === 'historyUndo' ? 'undo' : 'redo');

      return;
    }

    if (type === 'insertLineBreak' || type === 'insertParagraph') {
      apply(insertText(docRef.current, selection, '\n'), { kind: 'insert', text: '\n' });

      return;
    }

    const text = event.data ?? event.dataTransfer?.getData('text/plain') ?? '';

    if (!text || !type.startsWith('insert')) return;

    // Исправление орфографии меняет слово, а не выделение: его диапазон — в targetRanges
    const target = type === 'insertReplacementText' ? event.getTargetRanges()[0] : undefined;
    const root = editorRef.current;

    if (target && root) {
      selection = {
        anchor: positionFromDom(root, target.startContainer, target.startOffset, registry),
        focus: positionFromDom(root, target.endContainer, target.endOffset, registry),
      };
    }

    apply(insertText(docRef.current, selection, text), {
      kind: type === 'insertText' ? 'insert' : 'other',
      text,
    });
  });

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    // Enter и стрелки во время набора IME выбирают иероглиф, а не действие
    if (event.isComposing || event.keyCode === 229 || disabled) return;

    const apple = isApplePlatform(currentPlatform());
    const mod = apple ? event.metaKey : event.ctrlKey;
    const open = suggest !== null;
    const items = suggest?.items ?? [];

    if (open && event.key === 'Escape') {
      event.preventDefault();
      dismissedRef.current = suggest.trigger.start;
      closeSuggestions();

      return;
    }

    if (open && items.length > 0) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();

        const step = event.key === 'ArrowDown' ? 1 : -1;

        setSuggest({ ...suggest, active: (suggest.active + step + items.length) % items.length });

        return;
      }

      if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
        event.preventDefault();
        choose(suggest.active);

        return;
      }
    }

    if (mod && event.code === 'KeyZ') {
      event.preventDefault();
      travel(event.shiftKey ? 'redo' : 'undo');

      return;
    }

    if (mod && event.code === 'KeyY' && !apple) {
      event.preventDefault();
      travel('redo');

      return;
    }

    // Разметка с клавиатуры — маркерами markdown, а не <b> браузера
    if (
      mod &&
      !event.shiftKey &&
      !event.altKey &&
      (event.code === 'KeyB' || event.code === 'KeyI')
    ) {
      event.preventDefault();
      currentSelection();
      handlers.wrapSelection(event.code === 'KeyB' ? '**' : '*');

      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      if (event.shiftKey) {
        apply(insertText(docRef.current, currentSelection(), '\n'), { kind: 'insert', text: '\n' });
      } else {
        submit();
      }

      return;
    }

    if (event.key === 'ArrowUp' && onEditLast && docLength(docRef.current) === 0) {
      event.preventDefault();
      onEditLast();

      return;
    }

    // ←/→ сами: шаг через токен — одна клавиша, а не две (через распорку рядом с ним)
    const wordKey = apple ? event.altKey : event.ctrlKey;
    const otherModifier = event.metaKey || (apple ? event.ctrlKey : event.altKey);

    if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && !otherModifier) {
      event.preventDefault();

      const root = editorRef.current;
      const next = moveSelection(
        docRef.current,
        currentSelection(),
        event.key === 'ArrowLeft' ? -1 : 1,
        {
          extend: event.shiftKey,
          unit: wordKey ? 'word' : 'char',
        },
      );

      selectionRef.current = next;

      if (root) writeSelection(root, next, registry);

      refreshSuggestions();
    }
  });

  const onCompositionStart = useEffectEvent(() => {
    composingRef.current = true;
    compositionStartRef.current = currentSelection();
    setComposing(true);
    closeSuggestions();
  });

  const onCompositionEnd = useEffectEvent((event: CompositionEvent) => {
    composingRef.current = false;
    setComposing(false);

    const selection = compositionStartRef.current ?? selectionRef.current;
    const data = event.data ?? '';

    compositionStartRef.current = null;
    selectionRef.current = selection;

    if (data) apply(insertText(docRef.current, selection, data), { kind: 'insert', text: data });

    setRenderTick((tick) => tick + 1);
  });

  /** Запасной путь: браузер изменил DOM сам — читаем документ из DOM и перерисовываем начисто */
  const onInput = useEffectEvent(() => {
    const root = editorRef.current;

    if (!root || composingRef.current) return;

    const fromDom = readDocFromDom(root, registry);

    if (sameDoc(fromDom, docRef.current)) return;

    const selection = readSelection(root, registry) ?? caretAt(docLength(fromDom));

    apply({ doc: fromDom, selection: clampSelection(fromDom, selection) }, { kind: 'other' });
    setRenderTick((tick) => tick + 1);
  });

  const onPaste = useEffectEvent((event: ClipboardEvent) => {
    event.preventDefault();

    const data = event.clipboardData;

    if (!data || disabled) return;

    const files = Array.from(data.files);

    // Картинку из буфера браузер кладёт ещё и как HTML / адрес — это не текст сообщения
    if (files.length > 0) {
      onFiles?.(files);

      return;
    }

    const text = data.getData('text/plain');

    if (text) apply(insertText(docRef.current, currentSelection(), text), { kind: 'other' });
  });

  const onDragOver = useEffectEvent((event: DragEvent) => {
    if (event.dataTransfer?.types.includes('Files') && onFiles) event.preventDefault();
  });

  const onDrop = useEffectEvent((event: DragEvent) => {
    event.preventDefault();

    const data = event.dataTransfer;

    if (!data || disabled) return;

    const files = Array.from(data.files);

    if (files.length > 0) {
      onFiles?.(files);

      return;
    }

    const text = data.getData('text/plain');

    if (text) apply(insertText(docRef.current, currentSelection(), text), { kind: 'other' });
  });

  const onCopy = useEffectEvent((event: ClipboardEvent, cut: boolean) => {
    const selection = currentSelection();

    if (isCollapsed(selection) || !event.clipboardData) return;

    event.preventDefault();

    const [from, to] = selectionRange(selection);

    event.clipboardData.setData(
      'text/plain',
      composerToMarkdown(sliceDoc(docRef.current, from, to), { emoji: emojiFormat }),
    );

    if (cut && !disabled) apply(deleteContent(docRef.current, selection, -1), { kind: 'other' });
  });

  const onSelectionChange = useEffectEvent(() => {
    const root = editorRef.current;

    if (!root || composingRef.current || root.ownerDocument.activeElement !== root) return;

    const selection = readSelection(root, registry);

    if (!selection) return;

    selectionRef.current = clampSelection(docRef.current, selection);

    // Клик по токену или ↑↓ браузера поставили каретку внутрь него — на край
    if (selectionInsideToken(root, registry)) writeSelection(root, selectionRef.current, registry);

    refreshSuggestions();
  });

  const onFocus = useEffectEvent(() => {
    const root = editorRef.current;

    // С клавиатуры (Tab) браузер ставит каретку в начало — возвращаем ту, где человек остановился
    if (root && !pointerFocusRef.current) writeSelection(root, selectionRef.current, registry);

    pointerFocusRef.current = false;
    refreshSuggestions();
  });

  const onBlur = useEffectEvent(() => {
    closeSuggestions();
  });

  useEffect(() => {
    const root = editorRef.current;

    if (!root) return;

    const document = root.ownerDocument;
    const listeners: Array<[EventTarget, string, (event: Event) => void]> = [
      [root, 'beforeinput', (event) => onBeforeInput(event as InputEvent)],
      [root, 'input', () => onInput()],
      [root, 'keydown', (event) => onKeyDown(event as KeyboardEvent)],
      [root, 'compositionstart', () => onCompositionStart()],
      [root, 'compositionend', (event) => onCompositionEnd(event as CompositionEvent)],
      [root, 'paste', (event) => onPaste(event as ClipboardEvent)],
      [root, 'dragover', (event) => onDragOver(event as DragEvent)],
      [root, 'drop', (event) => onDrop(event as DragEvent)],
      [root, 'copy', (event) => onCopy(event as ClipboardEvent, false)],
      [root, 'cut', (event) => onCopy(event as ClipboardEvent, true)],
      [root, 'focus', () => onFocus()],
      [root, 'blur', () => onBlur()],
      [root, 'pointerdown', () => (pointerFocusRef.current = true)],
      [document, 'selectionchange', () => onSelectionChange()],
    ];

    for (const [target, type, listener] of listeners) target.addEventListener(type, listener);

    return () => {
      for (const [target, type, listener] of listeners) target.removeEventListener(type, listener);
    };
  }, []);

  useEffect(() => () => requestRef.current?.abort(), []);

  const active = suggest && suggest.items.length > 0 ? suggest.active : -1;
  const counterLabel =
    maxLength === undefined
      ? ''
      : over
        ? strings.richComposer.overLimit(count - maxLength)
        : strings.field.countOf(count, maxLength);

  return (
    <div className={cx(styles.root, className)}>
      <FieldFrame
        fullWidth
        glow={glow}
        invalid={control.invalid || over}
        disabled={disabled}
        className={styles.frame}
      >
        {attachments && <div className={styles.attachments}>{attachments}</div>}

        {toolbar && <div className={styles.toolbar}>{renderSlot(toolbar, api)}</div>}

        <div className={styles.row}>
          {start && <div className={styles.slot}>{renderSlot(start, api)}</div>}

          <div className={styles.field}>
            {docLength(doc) === 0 && !composing && (
              <span className={styles.placeholder} aria-hidden>
                {placeholder}
              </span>
            )}

            <div
              ref={editorRef}
              className={styles.editor}
              contentEditable={!disabled}
              suppressContentEditableWarning
              role="textbox"
              tabIndex={disabled ? -1 : 0}
              aria-multiline
              aria-label={ariaLabel ?? strings.richComposer.label}
              aria-placeholder={placeholder}
              aria-invalid={control.invalid || over || undefined}
              aria-disabled={disabled || undefined}
              aria-autocomplete={rules.length ? 'list' : undefined}
              aria-haspopup={rules.length ? 'listbox' : undefined}
              aria-controls={suggest ? listId : undefined}
              aria-activedescendant={active >= 0 ? optionId(active) : undefined}
              enterKeyHint="send"
              spellCheck
              {...control.props}
            />
          </div>

          {showCounter && (
            <span className={styles.counter} data-tone={counterTone}>
              <span aria-hidden>{over ? maxLength! - count : `${count}/${maxLength}`}</span>

              <VisuallyHidden.Root>{counterLabel}</VisuallyHidden.Root>
            </span>
          )}

          {end && <div className={styles.slot}>{renderSlot(end, api)}</div>}
        </div>
      </FieldFrame>

      {suggest && (
        <SuggestionList
          id={listId}
          title={strings.richComposer.suggestions[suggest.group]}
          items={suggest.items}
          activeIndex={active}
          optionId={optionId}
          query={suggest.trigger.query}
          loading={suggest.loading}
          loadingText={strings.richComposer.loading}
          emptyText={strings.richComposer.empty}
          anchor={suggest.anchor}
          placement="top"
          onActiveChange={(index) => setSuggest({ ...suggest, active: index })}
          onChoose={choose}
        />
      )}

      <VisuallyHidden.Root role="status">{announcement}</VisuallyHidden.Root>
    </div>
  );
}

/** Каретка ушла за край прокрутки поля (длинный черновик) — подвинуть, браузер сам этого не сделает */
function keepCaretVisible(root: HTMLElement) {
  const selection = root.ownerDocument.getSelection();

  if (!selection || selection.rangeCount === 0 || root.scrollHeight <= root.clientHeight) return;

  const rect = selection.getRangeAt(0).getClientRects()[0];

  if (!rect) return;

  const box = root.getBoundingClientRect();

  if (rect.bottom > box.bottom) root.scrollTop += rect.bottom - box.bottom;
  else if (rect.top < box.top) root.scrollTop -= box.top - rect.top;
}
