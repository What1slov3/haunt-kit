/*
 * Фильтр и ранжирование палитры команд — чистые функции над данными, без React. Порядок важнее полноты:
 * человек набирает начало слова и ждёт, что нужная команда будет первой, а не где-то в середине.
 */

import { ruStrings } from '../strings/ru';

import { switchLayout } from './command-layout';

export interface FilterableCommand {
  id: string;
  label: string;
  group?: string;
  description?: string;
  keywords?: readonly string[];
  disabled?: boolean;
}

/** Совпадение в подписи: [начало, конец) — для подсветки */
export type MatchRange = readonly [start: number, end: number];

export interface CommandScore {
  score: number;
  /** Диапазоны совпадений в `label`; совпадение по keywords или описанию подсветки не даёт */
  matches: MatchRange[];
  /** Нашлось только в другой раскладке */
  layout?: boolean;
}

export interface RankedCommand<T extends FilterableCommand> extends CommandScore {
  item: T;
}

export interface CommandSection<T extends FilterableCommand> {
  /** Подпись группы; у команд без группы — undefined */
  heading: string | undefined;
  items: RankedCommand<T>[];
}

/*
 * Уровни совпадения. Внутри уровня раньше то, где совпадение ближе к началу; при равенстве — исходный
 * порядок (сортировка стабильная), так экран сам решает, какая из равных команд важнее.
 */
const SCORE = {
  exact: 1000,
  prefix: 900,
  wordPrefix: 800,
  allWords: 700,
  substring: 600,
  keywordPrefix: 500,
  keyword: 400,
  description: 300,
} as const;

/** Больше любого прямого уровня: совпадение в другой раскладке всегда ниже прямого */
const LAYOUT_PENALTY = 1000;

/** Регистр и «ё» не важны: «ещё» находится по «еще» */
export function normalize(text: string): string {
  return text.toLowerCase().replaceAll('ё', 'е');
}

function tokenize(query: string): string[] {
  return normalize(query).trim().split(/\s+/).filter(Boolean);
}

/** Начала слов в подписи: после пробела, дефиса, точки, слеша, скобки, `#` и `@` */
function wordStarts(text: string): number[] {
  const starts: number[] = [];

  for (let i = 0; i < text.length; i++) {
    if (i === 0 || /[\s\-_./()#@:]/.test(text[i - 1]!)) starts.push(i);
  }

  return starts;
}

function scoreLabel(label: string, query: string, tokens: string[]): CommandScore | null {
  const text = normalize(label);

  if (text === query) return { score: SCORE.exact, matches: [[0, label.length]] };
  if (text.startsWith(query)) return { score: SCORE.prefix, matches: [[0, query.length]] };

  const starts = wordStarts(text);
  const wordHit = starts.find((start) => text.startsWith(query, start));

  if (wordHit !== undefined) {
    return { score: SCORE.wordPrefix - wordHit, matches: [[wordHit, wordHit + query.length]] };
  }

  // «нов кан» → «Новый канал»: каждое слово запроса — начало слова подписи, по порядку
  if (tokens.length > 1) {
    const matches: MatchRange[] = [];
    let from = 0;

    for (const token of tokens) {
      const start = starts.find(
        (candidate) => candidate >= from && text.startsWith(token, candidate),
      );

      if (start === undefined) break;

      matches.push([start, start + token.length]);
      from = start + token.length;
    }

    if (matches.length === tokens.length)
      return { score: SCORE.allWords - matches[0]![0], matches };
  }

  const index = text.indexOf(query);

  if (index >= 0)
    return { score: SCORE.substring - index, matches: [[index, index + query.length]] };

  return null;
}

/**
 * Оценка одной команды; null — не подходит. Не нашлось прямо — пробуем запрос в другой раскладке
 * («yfcnhjqrb» → «настройки»): такое совпадение ниже любого прямого, человек ведь набирал не это.
 */
export function scoreCommand(command: FilterableCommand, rawQuery: string): CommandScore | null {
  const tokens = tokenize(rawQuery);

  if (!tokens.length) return { score: 0, matches: [] };

  const direct = scoreTokens(command, tokens);

  if (direct) return direct;

  const switched = switchLayout(tokens.join(' '));
  const viaLayout = switched ? scoreTokens(command, tokenize(switched)) : null;

  return viaLayout ? { ...viaLayout, score: viaLayout.score - LAYOUT_PENALTY, layout: true } : null;
}

function scoreTokens(command: FilterableCommand, tokens: string[]): CommandScore | null {
  const query = tokens.join(' ');
  const label = scoreLabel(command.label, query, tokens);

  if (label) return label;

  const keywords = (command.keywords ?? []).map(normalize);

  if (keywords.some((keyword) => keyword.startsWith(query))) {
    return { score: SCORE.keywordPrefix, matches: [] };
  }

  if (keywords.some((keyword) => keyword.includes(query)))
    return { score: SCORE.keyword, matches: [] };

  if (command.description && normalize(command.description).includes(query)) {
    return { score: SCORE.description, matches: [] };
  }

  return null;
}

/** Подходящие команды, лучшие первыми. Пустой запрос — все команды в исходном порядке */
export function rankCommands<T extends FilterableCommand>(
  items: readonly T[],
  query: string,
): RankedCommand<T>[] {
  const ranked: RankedCommand<T>[] = [];

  for (const item of items) {
    const result = scoreCommand(item, query);

    if (result) ranked.push({ item, ...result });
  }

  // Array.prototype.sort стабилен: равные остаются в исходном порядке
  return ranked.sort((a, b) => b.score - a.score);
}

export interface SectionOptions {
  /** id недавних команд, свежие первыми; показываются отдельной группой, пока запрос пуст */
  recent?: readonly string[];
  /** Подпись группы недавних */
  recentHeading?: string;
}

/**
 * Раскладка результата по группам. С запросом группы идут по лучшей команде внутри (что ближе к запросу —
 * выше); без запроса — в исходном порядке, а недавние — первой группой и не повторяются в своих: id
 * пункта в списке должен быть единственным.
 */
export function sectionCommands<T extends FilterableCommand>(
  items: readonly T[],
  query: string,
  { recent = [], recentHeading = ruStrings.commandPalette.recent }: SectionOptions = {},
): CommandSection<T>[] {
  const ranked = rankCommands(items, query);
  const sections: CommandSection<T>[] = [];
  const byHeading = new Map<string | undefined, CommandSection<T>>();
  const showRecent = !tokenize(query).length && recent.length > 0;
  const recentIds = new Set(showRecent ? recent : []);

  if (showRecent) {
    const byId = new Map(ranked.map((entry) => [entry.item.id, entry]));
    const recentItems = recent.flatMap((id) => byId.get(id) ?? []);

    if (recentItems.length) sections.push({ heading: recentHeading, items: recentItems });
  }

  for (const entry of ranked) {
    if (recentIds.has(entry.item.id)) continue;

    let section = byHeading.get(entry.item.group);

    if (!section) {
      section = { heading: entry.item.group, items: [] };
      byHeading.set(entry.item.group, section);
      sections.push(section);
    }

    section.items.push(entry);
  }

  return sections;
}

/**
 * Подгруженные команды (`loadItems`) — после своих. Источник уже отобрал их по запросу, поэтому порядок
 * его, а подсветка наша — где подпись совпала. Группа с той же подписью дополняется; повтор id — остаётся своя.
 */
export function appendLoaded<T extends FilterableCommand>(
  sections: readonly CommandSection<T>[],
  loaded: readonly T[],
  query: string,
): CommandSection<T>[] {
  const result = sections.map((section) => ({ ...section, items: [...section.items] }));
  const seen = new Set(result.flatMap((section) => section.items.map((entry) => entry.item.id)));

  for (const item of loaded) {
    if (seen.has(item.id)) continue;

    seen.add(item.id);

    let section = result.find((candidate) => candidate.heading === item.group);

    if (!section) {
      section = { heading: item.group, items: [] };
      result.push(section);
    }

    section.items.push({ item, ...(scoreCommand(item, query) ?? { score: 0, matches: [] }) });
  }

  return result;
}

/** Недавние после выбора: выбранная — первой, без повторов, не больше limit */
export function pushRecent(recent: readonly string[], id: string, limit = 5): string[] {
  return [id, ...recent.filter((other) => other !== id)].slice(0, limit);
}

/** Подпись, разрезанная на куски для подсветки: [текст, совпало ли] */
export function splitByMatches(
  label: string,
  matches: readonly MatchRange[],
): Array<[string, boolean]> {
  const parts: Array<[string, boolean]> = [];
  let cursor = 0;

  for (const [start, end] of [...matches].sort((a, b) => a[0] - b[0])) {
    if (start > cursor) parts.push([label.slice(cursor, start), false]);
    if (end > Math.max(start, cursor))
      parts.push([label.slice(Math.max(start, cursor), end), true]);

    cursor = Math.max(cursor, end);
  }

  if (cursor < label.length) parts.push([label.slice(cursor), false]);

  return parts;
}
