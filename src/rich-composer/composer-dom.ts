import {
  normalizeDoc,
  type ComposerDoc,
  type ComposerSegment,
  type ComposerSelection,
  type ComposerToken,
} from './composer-model';

/*
 * Модель ⇄ DOM поля. DOM рисуем мы: React в contenteditable не рендерит (браузер правил бы узлы React
 * под ним), содержимое — плоский список прямых детей корня:
 *   текстовый узел — текстовый сегмент; <span contenteditable=false> — токен;
 *   распорка — текстовый узел с нулевым пробелом там, где у токена нет текста по соседству (начало,
 *   конец, между двумя токенами): без неё Chromium и WebKit не ставят видимую каретку рядом с
 *   нередактируемым элементом; длина распорки в модели — 0;
 *   <br data-composer-break> в конце, если текст кончается `\n`: иначе последняя пустая строка не видна.
 */

// Кодом, а не литералом: невидимый символ в исходнике легко потерять при правке
const ZWSP = String.fromCharCode(0x200b);
const BREAK_ATTR = 'data-composer-break';

const spacers = new WeakSet<Node>();

export interface TokenRegistry {
  /** Элемент токена; один и тот же объект токена — тот же элемент, его не пересоздаём на каждый рендер */
  elementFor: (token: ComposerToken) => HTMLElement;
  tokenOf: (node: Node) => ComposerToken | undefined;
}

export function createTokenRegistry(create: (token: ComposerToken) => HTMLElement): TokenRegistry {
  const elements = new WeakMap<ComposerToken, HTMLElement>();
  const tokens = new WeakMap<Node, ComposerToken>();

  return {
    elementFor(token) {
      let element = elements.get(token);

      if (!element) {
        element = create(token);
        element.contentEditable = 'false';
        elements.set(token, element);
        tokens.set(element, token);
      }

      return element;
    },
    tokenOf: (node) => tokens.get(node),
  };
}

function createSpacer(document: Document): Text {
  const spacer = document.createTextNode(ZWSP);

  spacers.add(spacer);

  return spacer;
}

const isText = (node: Node): node is Text => node.nodeType === 3;
const isSpacer = (node: Node) => spacers.has(node);

/** Длина прямого ребёнка корня в единицах модели */
function nodeLength(node: Node, registry: TokenRegistry): number {
  if (isText(node)) return isSpacer(node) ? 0 : node.data.length;

  return registry.tokenOf(node) ? 1 : 0;
}

/**
 * Привести DOM к документу. Текстовые узлы и элементы токенов переиспользуются: перерисовка на каждый
 * символ не пересоздаёт узлы (проверка орфографии и выделение не мигают), лишние узлы браузера
 * (вставленные `<br>`, `<div>`, текст после композиции IME) уходят.
 */
export function renderDoc(root: HTMLElement, doc: ComposerDoc, registry: TokenRegistry): void {
  const document = root.ownerDocument;
  const existing = Array.from(root.childNodes);
  const texts = existing.filter((node): node is Text => isText(node) && !isSpacer(node));
  const spacerPool = existing.filter(isSpacer) as Text[];
  const used = new Set<Node>();
  const desired: Node[] = [];

  const spacer = () => {
    const node = spacerPool.shift() ?? createSpacer(document);

    if (node.data !== ZWSP) node.data = ZWSP;

    return node;
  };

  doc.forEach((segment: ComposerSegment, index) => {
    if (segment.type === 'text') {
      const node = texts.shift() ?? document.createTextNode('');

      if (node.data !== segment.text) node.data = segment.text;

      desired.push(node);

      return;
    }

    if (doc[index - 1]?.type !== 'text') desired.push(spacer());

    let element = registry.elementFor(segment);

    // Один объект токена дважды в документе (вставили тот же объект ещё раз) — второй элемент свой
    if (used.has(element)) element = element.cloneNode(true) as HTMLElement;

    used.add(element);
    desired.push(element);
  });

  const last = doc.at(-1);

  if (last && last.type !== 'text') desired.push(spacer());

  if (last?.type === 'text' && last.text.endsWith('\n')) {
    const lineBreak =
      existing.find((node) => node instanceof HTMLElement && node.hasAttribute(BREAK_ATTR)) ??
      document.createElement('br');

    (lineBreak as HTMLElement).setAttribute(BREAK_ATTR, '');
    desired.push(lineBreak);
  }

  const same =
    desired.length === existing.length && desired.every((node, index) => node === existing[index]);

  if (!same) root.replaceChildren(...desired);
}

/** Прямой ребёнок корня, внутри которого лежит узел */
function topChild(root: Node, node: Node): Node | null {
  let current: Node | null = node;

  while (current && current.parentNode !== root) current = current.parentNode;

  return current;
}

/**
 * Позиция модели по точке DOM. Точка внутри токена — к ближнему краю: курсор в токен не встаёт; в
 * распорке — у токена; где-то в чужом узле — у его начала.
 */
export function positionFromDom(
  root: HTMLElement,
  node: Node,
  offset: number,
  registry: TokenRegistry,
): number {
  const children = Array.from(root.childNodes);

  if (node === root) {
    return children.slice(0, offset).reduce((sum, child) => sum + nodeLength(child, registry), 0);
  }

  const child = topChild(root, node);

  if (!child) return 0;

  const index = children.indexOf(child as ChildNode);
  const base = children.slice(0, index).reduce((sum, item) => sum + nodeLength(item, registry), 0);

  if (isText(child)) return isSpacer(child) ? base : base + Math.min(offset, child.data.length);

  if (registry.tokenOf(child)) {
    if (node === child) return offset === 0 ? base : base + 1;

    // Точка в тексте внутри токена: до середины — перед ним, дальше — после
    const inner = isText(node) ? node.data.length : 1;

    return offset * 2 < inner && node === child.firstChild ? base : base + 1;
  }

  return base;
}

/** Точка DOM для позиции модели: в тексте — в текстовом узле, у токена без текста рядом — в распорке */
export function domPoint(
  root: HTMLElement,
  position: number,
  registry: TokenRegistry,
): [Node, number] {
  let cursor = 0;
  const children = Array.from(root.childNodes);

  for (const child of children) {
    if (isText(child)) {
      if (isSpacer(child)) {
        // За нулевым пробелом: каретка рисуется вплотную к токену с любой стороны
        if (position === cursor) return [child, child.data.length];

        continue;
      }

      if (position >= cursor && position <= cursor + child.data.length) {
        return [child, position - cursor];
      }

      cursor += child.data.length;
      continue;
    }

    if (registry.tokenOf(child)) cursor += 1;
  }

  const last = children.at(-1);
  const trailingBreak = last instanceof HTMLElement && last.hasAttribute(BREAK_ATTR);

  return [root, children.length - (trailingBreak ? 1 : 0)];
}

export function readSelection(
  root: HTMLElement,
  registry: TokenRegistry,
): ComposerSelection | null {
  const selection = root.ownerDocument.getSelection();

  if (!selection || selection.rangeCount === 0) return null;

  const { anchorNode, anchorOffset, focusNode, focusOffset } = selection;

  if (!anchorNode || !focusNode || !root.contains(anchorNode) || !root.contains(focusNode)) {
    return null;
  }

  return {
    anchor: positionFromDom(root, anchorNode, anchorOffset, registry),
    focus: positionFromDom(root, focusNode, focusOffset, registry),
  };
}

/** Поставить выделение модели в DOM; если оно уже там — не трогать (лишний selectionchange) */
export function writeSelection(
  root: HTMLElement,
  selection: ComposerSelection,
  registry: TokenRegistry,
): void {
  const domSelection = root.ownerDocument.getSelection();

  if (!domSelection) return;

  const [anchorNode, anchorOffset] = domPoint(root, selection.anchor, registry);
  const [focusNode, focusOffset] = domPoint(root, selection.focus, registry);

  if (
    domSelection.anchorNode === anchorNode &&
    domSelection.anchorOffset === anchorOffset &&
    domSelection.focusNode === focusNode &&
    domSelection.focusOffset === focusOffset
  ) {
    return;
  }

  domSelection.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
}

/** Выделение DOM попало внутрь токена (клик по нему, ↑↓ браузера) — его надо переставить на край */
export function selectionInsideToken(root: HTMLElement, registry: TokenRegistry): boolean {
  const selection = root.ownerDocument.getSelection();

  return [selection?.anchorNode, selection?.focusNode].some((node) => {
    if (!node || node === root || !root.contains(node)) return false;

    const child = topChild(root, node);

    return Boolean(child && child !== node && registry.tokenOf(child));
  });
}

/**
 * Документ по DOM — запасной путь, когда браузер всё-таки изменил содержимое сам (событие, которое не
 * отменить: автозамена на мобильных, редкие типы ввода). Блоки браузера (`<div>`, `<p>`) — новые строки.
 */
export function readDocFromDom(root: HTMLElement, registry: TokenRegistry): ComposerSegment[] {
  const segments: ComposerSegment[] = [];
  const pushText = (text: string) => {
    if (text) segments.push({ type: 'text', text });
  };
  const endsWithBreak = () => {
    const last = segments.at(-1);

    return !last || (last.type === 'text' && last.text.endsWith('\n'));
  };

  const walk = (parent: Node) => {
    for (const node of Array.from(parent.childNodes)) {
      if (isText(node)) {
        if (!isSpacer(node)) pushText(node.data.replaceAll(ZWSP, ''));

        continue;
      }

      const token = registry.tokenOf(node);

      if (token) {
        segments.push(token);
        continue;
      }

      if (!(node instanceof HTMLElement)) continue;

      if (node.tagName === 'BR') {
        if (!node.hasAttribute(BREAK_ATTR)) pushText('\n');

        continue;
      }

      if (node.tagName === 'DIV' || node.tagName === 'P') {
        if (!endsWithBreak()) pushText('\n');
      }

      walk(node);
    }
  };

  walk(root);

  return normalizeDoc(segments);
}

/** Прямоугольник символа в позиции (знак `@` подсказки) или каретки там — к нему крепится список */
export function caretRect(
  root: HTMLElement,
  position: number,
  registry: TokenRegistry,
): DOMRect | null {
  const [node, offset] = domPoint(root, position, registry);
  const range = root.ownerDocument.createRange();

  range.setStart(node, offset);

  if (isText(node) && offset < node.data.length) range.setEnd(node, offset + 1);
  else range.collapse(true);

  const rect = range.getClientRects()[0] ?? range.getBoundingClientRect?.();

  return rect && (rect.width || rect.height) ? rect : null;
}
