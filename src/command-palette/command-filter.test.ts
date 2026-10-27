import { describe, expect, it } from 'vitest';

import {
  normalize,
  pushRecent,
  rankCommands,
  scoreCommand,
  sectionCommands,
  splitByMatches,
  type FilterableCommand,
} from './command-filter';

const commands: FilterableCommand[] = [
  { id: 'settings', label: 'Настройки', group: 'Перейти', keywords: ['preferences', 'опции'] },
  { id: 'new-channel', label: 'Новый канал', group: 'Создать' },
  { id: 'channel', label: 'Канал #general', group: 'Перейти' },
  {
    id: 'invite',
    label: 'Пригласить в канал',
    group: 'Создать',
    description: 'Ссылка-приглашение',
  },
  { id: 'theme', label: 'Сменить тему', group: 'Настроить', keywords: ['dark', 'light'] },
];

const ids = (query: string) => rankCommands(commands, query).map((entry) => entry.item.id);

describe('scoreCommand', () => {
  it('пустой запрос подходит всем без подсветки', () => {
    expect(scoreCommand(commands[0]!, '   ')).toEqual({ score: 0, matches: [] });
  });

  it('уровни: целиком > начало > начало слова > подстрока > keywords > описание', () => {
    const score = (label: string, query: string, extra: Partial<FilterableCommand> = {}) =>
      scoreCommand({ id: 'x', label, ...extra }, query)?.score ?? -1;

    const exact = score('Канал', 'канал');
    const prefix = score('Канал #general', 'кан');
    const wordPrefix = score('Новый канал', 'кан');
    const substring = score('Сканер', 'кан');
    const keyword = score('Тема', 'dark', { keywords: ['dark'] });
    const description = score('Тема', 'цвет', { description: 'Цвет интерфейса' });

    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(wordPrefix);
    expect(wordPrefix).toBeGreaterThan(substring);
    expect(substring).toBeGreaterThan(keyword);
    expect(keyword).toBeGreaterThan(description);
    expect(description).toBeGreaterThan(0);
  });

  it('несколько слов запроса — начала слов подписи по порядку', () => {
    expect(scoreCommand(commands[1]!, 'нов кан')?.matches).toEqual([
      [0, 3],
      [6, 9],
    ]);
    expect(scoreCommand(commands[1]!, 'кан нов')).toBeNull();
  });

  it('регистр и ё не важны', () => {
    expect(normalize('ЕЩЁ')).toBe('еще');
    expect(scoreCommand({ id: 'x', label: 'Ещё действия' }, 'еще')).not.toBeNull();
  });

  it('совпадение по keywords не подсвечивает подпись', () => {
    expect(scoreCommand(commands[0]!, 'pref')).toEqual({ score: 500, matches: [] });
  });

  it('не подходит — null', () => {
    expect(scoreCommand(commands[0]!, 'zzz')).toBeNull();
  });
});

describe('rankCommands', () => {
  it('лучшие первыми, равные — в исходном порядке', () => {
    // «Канал #general» — начало подписи, «Новый канал» и «Пригласить в канал» — начало слова
    expect(ids('канал')).toEqual(['channel', 'new-channel', 'invite']);
  });

  it('ближе к началу — выше в пределах уровня', () => {
    const ranked = rankCommands(
      [
        { id: 'far', label: 'Пригласить в канал' },
        { id: 'near', label: 'Новый канал' },
      ],
      'кан',
    );

    expect(ranked.map((entry) => entry.item.id)).toEqual(['near', 'far']);
  });

  it('пустой запрос — все в исходном порядке', () => {
    expect(ids('')).toEqual(commands.map((command) => command.id));
  });
});

describe('sectionCommands', () => {
  it('без запроса группы в исходном порядке, недавние — первыми и без повторов', () => {
    const sections = sectionCommands(commands, '', { recent: ['theme', 'missing', 'channel'] });

    expect(sections.map((section) => section.heading)).toEqual(['Недавние', 'Перейти', 'Создать']);
    expect(sections[0]!.items.map((entry) => entry.item.id)).toEqual(['theme', 'channel']);
    expect(sections[1]!.items.map((entry) => entry.item.id)).toEqual(['settings']);
  });

  it('с запросом недавних нет, группы идут по лучшему пункту', () => {
    const sections = sectionCommands(commands, 'тем', { recent: ['settings'] });

    expect(sections).toHaveLength(1);
    expect(sections[0]!.heading).toBe('Настроить');

    const byBest = sectionCommands(commands, 'канал');

    expect(byBest.map((section) => section.heading)).toEqual(['Перейти', 'Создать']);
  });

  it('команды без группы собираются в секцию без подписи', () => {
    const sections = sectionCommands([{ id: 'a', label: 'А' }], '');

    expect(sections).toEqual([
      { heading: undefined, items: [{ item: { id: 'a', label: 'А' }, score: 0, matches: [] }] },
    ]);
  });
});

describe('pushRecent', () => {
  it('выбранная — первой, без повторов, не больше лимита', () => {
    expect(pushRecent(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
    expect(pushRecent(['a', 'b', 'c'], 'd', 3)).toEqual(['d', 'a', 'b']);
  });
});

describe('splitByMatches', () => {
  it('режет подпись на совпавшие и обычные куски', () => {
    expect(
      splitByMatches('Новый канал', [
        [6, 9],
        [0, 3],
      ]),
    ).toEqual([
      ['Нов', true],
      ['ый ', false],
      ['кан', true],
      ['ал', false],
    ]);
  });

  it('без совпадений — подпись целиком', () => {
    expect(splitByMatches('Тема', [])).toEqual([['Тема', false]]);
  });
});
