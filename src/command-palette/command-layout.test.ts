import { describe, expect, it } from 'vitest';

import {
  appendLoaded,
  rankCommands,
  scoreCommand,
  sectionCommands,
  type FilterableCommand,
} from './command-filter';
import { switchLayout, toEnglishLayout, toRussianLayout } from './command-layout';

describe('раскладка', () => {
  it('QWERTY → ЙЦУКЕН и обратно, клавиши знаков тоже', () => {
    expect(toRussianLayout('yfcnhjqrb')).toBe('настройки');
    expect(toRussianLayout('[`]')).toBe('хёъ');
    expect(toRussianLayout('Ntvf')).toBe('Тема');
    expect(toEnglishLayout('пщщпду')).toBe('google');
    expect(toEnglishLayout('хжэбю')).toBe("[;',.");
  });

  it('цифры и пробелы не трогает', () => {
    expect(toRussianLayout('ytn 42')).toBe('нет 42');
  });

  it('switchLayout переводит только запрос в одной раскладке', () => {
    expect(switchLayout('yfcn')).toBe('наст');
    expect(switchLayout('пуе')).toBe('get');
    expect(switchLayout('nastr в')).toBeNull();
    expect(switchLayout('42')).toBeNull();
  });
});

describe('поиск в неверной раскладке', () => {
  const commands = [
    { id: 'settings', label: 'Настройки' },
    { id: 'general', label: 'general' },
    { id: 'sync', label: 'yfc — синхронизация' },
  ];

  it('находит и подсвечивает подпись', () => {
    expect(scoreCommand(commands[0]!, 'yfcn')).toMatchObject({ matches: [[0, 4]], layout: true });
    expect(scoreCommand(commands[1]!, 'утук')).toMatchObject({ matches: [[1, 5]], layout: true });
  });

  it('ниже любого прямого совпадения', () => {
    // «yfc» прямо — подстрока третьей команды; «нас» в раскладке — начало «Настройки»
    expect(rankCommands(commands, 'yfc').map((entry) => entry.item.id)).toEqual([
      'sync',
      'settings',
    ]);

    const layout = scoreCommand(commands[0]!, 'yfcnhjqrb')!.score;
    const weakestDirect = scoreCommand(
      { id: 'x', label: 'x', description: 'настройки' },
      'настр',
    )!.score;

    expect(layout).toBeLessThan(weakestDirect);
  });

  it('прямое совпадение не помечено раскладкой', () => {
    expect(scoreCommand(commands[0]!, 'наст')?.layout).toBeUndefined();
  });
});

describe('appendLoaded', () => {
  const local = sectionCommands<FilterableCommand>(
    [{ id: 'a', label: 'Канал', group: 'Перейти' }],
    'кан',
  );

  it('подгруженные — после своих, в своём порядке, группа дополняется', () => {
    const sections = appendLoaded(
      local,
      [
        { id: 'b', label: 'Каналы сервера', group: 'Перейти' },
        { id: 'c', label: 'Неважно', group: 'Сервер' },
      ],
      'кан',
    );

    expect(sections.map((section) => section.heading)).toEqual(['Перейти', 'Сервер']);
    expect(sections[0]!.items.map((entry) => entry.item.id)).toEqual(['a', 'b']);
    expect(sections[0]!.items[1]!.matches).toEqual([[0, 3]]);
    // Источник решил, что подходит, — без совпадения подписи пункт остаётся, просто без подсветки
    expect(sections[1]!.items[0]).toMatchObject({ score: 0, matches: [] });
  });

  it('повтор id — остаётся своя команда, исходные секции не меняются', () => {
    const sections = appendLoaded(local, [{ id: 'a', label: 'Канал (сервер)' }], 'кан');

    expect(sections).toHaveLength(1);
    expect(sections[0]!.items).toHaveLength(1);
    expect(local[0]!.items).toHaveLength(1);
  });
});
