import type { MarkdownMentionKind } from './markdown-types';

/*
 * Свой синтаксис сообщений поверх mdast: `||спойлер||`, упоминания `@ник` / `#канал`, шорткоды `:smile:`.
 * Плагин обходит только узлы `text`: код (`code`, `inlineCode`) — листья со своим `value`, их он не видит
 * по построению. Узлы выходят в hast как `span` с `data-haunt` — рендер в markdown-view.tsx узнаёт их по
 * этому атрибуту, а санитайзер пропускает только его значения. Типы mdast описаны здесь минимально:
 * `@types/mdast` — не прямая зависимость пакета.
 */

export interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, string>;
    hChildren?: Array<{ type: 'text'; value: string }>;
  };
}

export interface HauntSyntaxOptions {
  /** Разбирать упоминания; без резолвера они остаются текстом */
  mentions?: boolean;
  /** Словарь шорткодов без двоеточий: `{ smile: '😄' }` */
  emoji?: Readonly<Record<string, string>>;
}

export type TextSegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; kind: MarkdownMentionKind; name: string }
  | { type: 'emoji'; shortcode: string; value: string };

const SPOILER = '||';

/*
 * Упоминание начинается не посреди слова: в `mail@host` и `C#` его нет. Шорткод — латиница, цифры, `_+-`,
 * не длиннее 64: скан на каждом двоеточии ограничен, разбор остаётся линейным.
 */
const SYNTAX = /(?<![\p{L}\p{N}_])([@#])([\p{L}\p{N}_][\p{L}\p{N}_.-]*)|:([a-z0-9_+-]{1,64}):/gu;

/** Точка и дефис в конце — пунктуация предложения, а не часть ника: «спроси @ваню.» */
const TRAILING = /[.-]+$/;

const own = (record: object, key: string) => Object.prototype.hasOwnProperty.call(record, key);

function pushText(segments: TextSegment[], value: string) {
  if (!value) return;

  const last = segments.at(-1);

  if (last?.type === 'text') last.value += value;
  else segments.push({ type: 'text', value });
}

/** Текст → куски: обычный текст, упоминания и эмодзи. Неизвестный шорткод остаётся текстом */
export function splitText(value: string, options: HauntSyntaxOptions): TextSegment[] {
  const segments: TextSegment[] = [];
  const emoji = options.emoji;
  let cursor = 0;

  SYNTAX.lastIndex = 0;

  for (let match = SYNTAX.exec(value); match; match = SYNTAX.exec(value)) {
    const [whole, prefix, rawName, shortcode] = match;

    if (prefix && rawName) {
      const name = rawName.replace(TRAILING, '');

      if (!options.mentions || !name) continue;

      pushText(segments, value.slice(cursor, match.index));
      segments.push({ type: 'mention', kind: prefix === '#' ? 'channel' : 'user', name });
      cursor = match.index + prefix.length + name.length;
      SYNTAX.lastIndex = cursor;
      continue;
    }

    if (shortcode && emoji && own(emoji, shortcode)) {
      pushText(segments, value.slice(cursor, match.index));
      segments.push({ type: 'emoji', shortcode, value: emoji[shortcode]! });
      cursor = match.index + whole.length;
      continue;
    }

    // Мимо словаря: закрывающее двоеточие может открывать следующий шорткод — `:нет:smile:`
    SYNTAX.lastIndex = match.index + 1;
  }

  pushText(segments, value.slice(cursor));

  return segments;
}

function textNode(value: string): MdNode {
  return { type: 'text', value };
}

function mergeText(nodes: MdNode[]): MdNode[] {
  const merged: MdNode[] = [];

  for (const node of nodes) {
    const last = merged.at(-1);

    if (node.type === 'text' && last?.type === 'text') last.value = (last.value ?? '') + node.value;
    else if (node.type !== 'text' || node.value) merged.push(node);
  }

  return merged;
}

/**
 * `||…||` среди соседей одного родителя: маркеры могут стоять в разных текстовых узлах, а между ними —
 * форматирование (`||**жирный** спойлер||`). Пары — слева направо; непарный маркер и пустой спойлер —
 * текстом. Через границу абзаца или ссылки спойлер не тянется: у них разные родители.
 */
export function wrapSpoilers(children: MdNode[]): MdNode[] {
  const items: Array<MdNode | typeof SPOILER> = [];
  let markers = 0;

  for (const child of children) {
    if (child.type !== 'text' || !child.value?.includes(SPOILER)) {
      items.push(child);
      continue;
    }

    child.value.split(SPOILER).forEach((piece, index) => {
      if (index > 0) {
        items.push(SPOILER);
        markers++;
      }

      if (piece) items.push(textNode(piece));
    });
  }

  if (markers < 2) return children;

  const result: MdNode[] = [];
  let open: MdNode[] | null = null;

  for (const item of items) {
    if (item !== SPOILER) {
      (open ?? result).push(item);
    } else if (open === null) {
      open = [];
    } else {
      result.push(
        open.length > 0
          ? {
              type: 'hauntSpoiler',
              children: mergeText(open),
              data: { hName: 'span', hProperties: { dataHaunt: 'spoiler' } },
            }
          : textNode(SPOILER + SPOILER),
      );
      open = null;
    }
  }

  if (open !== null) result.push(textNode(SPOILER), ...open);

  return mergeText(result);
}

function segmentNode(segment: TextSegment): MdNode {
  if (segment.type === 'text') return textNode(segment.value);

  if (segment.type === 'emoji') {
    return {
      type: 'hauntEmoji',
      data: {
        hName: 'span',
        hProperties: { dataHaunt: 'emoji', dataShortcode: segment.shortcode },
        hChildren: [{ type: 'text', value: segment.value }],
      },
    };
  }

  return {
    type: 'hauntMention',
    data: {
      hName: 'span',
      hProperties: { dataHaunt: 'mention', dataKind: segment.kind, dataName: segment.name },
      hChildren: [{ type: 'text', value: (segment.kind === 'channel' ? '#' : '@') + segment.name }],
    },
  };
}

/** Внутри ссылки упоминание не разбирается: кнопка внутри `<a>` — недопустимая вложенность */
const LINKS = new Set(['link', 'linkReference']);

function walk(node: MdNode, options: HauntSyntaxOptions, inLink: boolean) {
  if (!node.children) return;

  const local = inLink ? { ...options, mentions: false } : options;

  node.children = wrapSpoilers(node.children).flatMap((child) =>
    child.type === 'text' ? splitText(child.value ?? '', local).map(segmentNode) : [child],
  );

  for (const child of node.children) walk(child, options, inLink || LINKS.has(child.type));
}

/** remark-плагин: `remarkPlugins={[[remarkHauntSyntax, options]]}` */
export function remarkHauntSyntax(options: HauntSyntaxOptions = {}) {
  return (tree: MdNode) => {
    walk(tree, options, false);
  };
}

interface HastNode {
  type: string;
  value?: string;
  children?: HastNode[];
}

/**
 * rehype-плагин до санитайзера: сырой HTML из сообщения (`<b>`, `<script>`) — это текст, который человек
 * набрал, а не разметка. Санитайзер выбросил бы узел `raw` целиком, и `<b>привет</b>` пропал бы из чата.
 */
export function rehypeRawAsText() {
  return (tree: HastNode) => {
    const visit = (node: HastNode) => {
      if (!node.children) return;

      node.children = node.children.map((child) =>
        child.type === 'raw' ? { type: 'text', value: child.value ?? '' } : child,
      );
      node.children.forEach(visit);
    };

    visit(tree);
  };
}

/** Ссылки в сообщениях — только http(s) и почта; относительные, `javascript:`, `data:` — текстом */
export function isSafeUrl(url: string): boolean {
  return /^(https?:\/\/[^\s/?#]+|mailto:[^\s@]+@[^\s@]+)/i.test(url.trim());
}
