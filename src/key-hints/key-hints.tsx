import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { isEditableTarget, parseHotkey } from '../lib/hotkey';
import { useHotkey } from '../lib/use-hotkey';
import { useUiStrings } from '../strings/ui-strings-context';
import { usePortalContainer } from '../theme/portal-container';

import {
  DEFAULT_HINT_ALPHABET,
  hintLabels,
  letterFromCode,
  matchHints,
  placeHints,
  readingOrder,
  type HintRect,
} from './key-hints-model';
import styles from './key-hints.module.css';

export interface KeyHintsProps {
  /** Сочетания, открывающие подсказки. Без модификатора — только вне полей ввода */
  hotkey?: string | readonly string[];
  /** Буквы меток */
  alphabet?: string;
  /**
   * Что делать с выбранным: auto — поле ввода фокусировать, остальное нажать; focus — только фокус;
   * click — фокус и нажатие
   */
  action?: 'auto' | 'focus' | 'click';
  /** Выключить без условного рендера */
  enabled?: boolean;
  /** Элемент выбран — после фокуса и нажатия */
  onSelect?: (element: HTMLElement) => void;
  /** Область: подсказки получают фокусируемые элементы внутри неё */
  children: ReactNode;
}

interface Hint {
  element: HTMLElement;
  label: string;
  x: number;
  y: number;
}

/** Всё, что можно нажать или сфокусировать: ссылки, контролы, tabindex и роли интерактивного */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
  // Roving tabindex (вкладки, пункты тулбара) держит соседей на -1, но нажать их можно
  '[role="tab"]',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="radio"]',
].join(',');

/** Высота метки и ширина буквы — как в CSS модуля (моно 11 px с отступами 4) */
const LABEL_HEIGHT = 18;
const LABEL_CHAR = 7;
const LABEL_PADDING = 8;

function isHintable(element: HTMLElement, viewport: { width: number; height: number }): boolean {
  if (element.closest('[inert], [aria-hidden="true"]')) return false;
  if (element.getAttribute('aria-disabled') === 'true') return false;

  const rect = element.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) return false;
  if (
    rect.bottom < 0 ||
    rect.right < 0 ||
    rect.top > viewport.height ||
    rect.left > viewport.width
  ) {
    return false;
  }

  return getComputedStyle(element).visibility !== 'hidden';
}

/** Внутри другого кандидата (кнопка в строке с role=option) — метка одна, у внешнего */
function outermost(elements: HTMLElement[]): HTMLElement[] {
  const set = new Set(elements);

  return elements.filter((element) => {
    for (let node = element.parentElement; node; node = node.parentElement) {
      if (set.has(node) && !node.matches('[role="tab"], [role="option"], [role="menuitem"]')) {
        return false;
      }
    }

    return true;
  });
}

function collectHints(root: HTMLElement, alphabet: string): Hint[] {
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const elements = outermost(
    [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) =>
      isHintable(element, viewport),
    ),
  );
  const rects: HintRect[] = elements.map((element) => {
    const { left, top, width, height } = element.getBoundingClientRect();

    return { left, top, width, height };
  });
  const order = readingOrder(rects);
  const ordered = order.map((index) => elements[index] as HTMLElement);
  const orderedRects = order.map((index) => rects[index] as HintRect);
  const labels = hintLabels(ordered.length, alphabet);
  const positions = placeHints(orderedRects, labels, {
    viewport,
    labelWidth: (length) => length * LABEL_CHAR + LABEL_PADDING,
    labelHeight: LABEL_HEIGHT,
  });

  return labels.map((label, index) => ({
    element: ordered[index] as HTMLElement,
    label,
    x: positions[index]?.x ?? 0,
    y: positions[index]?.y ?? 0,
  }));
}

/**
 * Подсказки клавиш, как в Vimium: по `f` (вне полей ввода) или `mod+.` над каждым фокусируемым элементом
 * области появляется метка из букв; набор метки фокусирует или нажимает элемент, Backspace стирает букву,
 * Esc, клик или прокрутка — выход. Буквы — по физическим клавишам, работают в русской раскладке. Метки
 * — стекло и моно поверх всего, раскладка — чистые функции `key-hints-model.ts`.
 */
export function KeyHints({
  hotkey = ['f', 'mod+.'],
  alphabet = DEFAULT_HINT_ALPHABET,
  action = 'auto',
  enabled = true,
  onSelect,
  children,
}: KeyHintsProps) {
  const strings = useUiStrings().keyHints;
  const container = usePortalContainer();
  const rootRef = useRef<HTMLDivElement>(null);
  const [hints, setHints] = useState<Hint[] | null>(null);
  const [typed, setTypedState] = useState('');
  // То же в ref: несколько букв подряд приходят быстрее рендера
  const typedRef = useRef('');
  const combos = typeof hotkey === 'string' ? [hotkey] : [...hotkey];
  const hasModifier = (combo: string) => {
    const parsed = parseHotkey(combo);

    return parsed.mod || parsed.ctrl || parsed.meta || parsed.alt;
  };

  const setTyped = (next: string) => {
    typedRef.current = next;
    setTypedState(next);
  };

  const open = () => {
    const root = rootRef.current;

    if (!root || hints) return;

    const next = collectHints(root, alphabet);

    if (next.length === 0) return;

    setTyped('');
    setHints(next);
  };

  // Без модификатора — буква: в поле ввода это текст; с модификатором — работает и в поле
  const plain = combos.filter((combo) => !hasModifier(combo));
  const modified = combos.filter(hasModifier);

  useHotkey(plain, open, { enabled: enabled && plain.length > 0 });
  useHotkey(modified, open, { enabled: enabled && modified.length > 0, allowInInput: true });

  const active = hints !== null;

  useEffect(() => {
    if (!hints) return;

    const type = (next: string) => {
      typedRef.current = next;
      setTypedState(next);
    };

    const close = () => {
      setHints(null);
      type('');
    };

    const select = (hint: Hint) => {
      close();

      const { element } = hint;
      const editable = isEditableTarget(element) || element instanceof HTMLSelectElement;

      element.focus({ preventScroll: true });

      if (action === 'click' || (action === 'auto' && !editable)) element.click();

      onSelect?.(element);
    };

    // Перехват на фазе захвата: пока метки на экране, буквы не должны дойти до чужих сочетаний и полей
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;

      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'Escape') return close();

      if (event.key === 'Backspace') {
        type(typedRef.current.slice(0, -1));

        return;
      }

      const letter = letterFromCode(event.code);

      if (!letter || event.ctrlKey || event.metaKey || event.altKey) return close();

      const next = typedRef.current + letter;
      const match = matchHints(
        hints.map((hint) => hint.label),
        next,
      );
      const hint = match.exact === null ? undefined : hints[match.exact];

      if (hint) select(hint);
      // Неверная буква не стирает набранное: промахнулся — набирай дальше
      else if (match.candidates.length > 0) type(next);
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('pointerdown', close, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);

    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('pointerdown', close, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
    };
  }, [hints, action, onSelect]);

  const overlay =
    active && typeof document !== 'undefined'
      ? createPortal(
          <div className={styles.overlay} data-key-hints="">
            {hints.map((hint) => {
              const matches = hint.label.startsWith(typed);

              return (
                <span
                  key={hint.label}
                  aria-hidden
                  className={styles.hint}
                  data-dim={matches ? undefined : ''}
                  // left / top, а не transform: transform занят анимацией появления, а метка не двигается
                  style={{ left: hint.x, top: hint.y }}
                >
                  <span className={styles.typed}>{matches ? typed : ''}</span>
                  {matches ? hint.label.slice(typed.length) : hint.label}
                </span>
              );
            })}

            <span role="status" className={styles.status}>
              {strings.active(hints.length)}
            </span>
          </div>,
          container ?? document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={styles.root} data-key-hints-active={active || undefined}>
      {children}

      {overlay}
    </div>
  );
}
