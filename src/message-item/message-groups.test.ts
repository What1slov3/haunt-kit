import { describe, expect, it } from 'vitest';

import { GROUP_WINDOW, groupMessages, sameDay } from './message-groups';

interface Message {
  author: string;
  at: Date;
  reply?: boolean;
}

// Местное время: граница дня — та, что видит пользователь, а не UTC
const at = (hours: number, minutes: number, day = 27) => new Date(2026, 9, day, hours, minutes);

const options = {
  author: (message: Message) => message.author,
  time: (message: Message) => message.at,
};

describe('groupMessages', () => {
  it('тот же автор подряд в пределах окна — продолжение', () => {
    const messages = [
      { author: 'ada', at: at(12, 0) },
      { author: 'ada', at: at(12, 1) },
      { author: 'ada', at: at(12, 4) },
    ];

    expect(groupMessages(messages, options)).toEqual([false, true, true]);
  });

  it('другой автор начинает группу', () => {
    const messages = [
      { author: 'ada', at: at(12, 0) },
      { author: 'lev', at: at(12, 0) },
      { author: 'ada', at: at(12, 1) },
    ];

    expect(groupMessages(messages, options)).toEqual([false, false, false]);
  });

  it('окно — от предыдущего сообщения, ровно пять минут уже рвут', () => {
    const messages = [
      { author: 'ada', at: at(12, 0) },
      { author: 'ada', at: at(12, 4) },
      { author: 'ada', at: at(12, 8) },
      { author: 'ada', at: at(12, 13) },
    ];

    expect(groupMessages(messages, options)).toEqual([false, true, true, false]);
  });

  it('своё окно', () => {
    const messages = [
      { author: 'ada', at: at(12, 0) },
      { author: 'ada', at: at(12, 2) },
    ];

    expect(groupMessages(messages, { ...options, window: 60_000 })).toEqual([false, false]);
    expect(GROUP_WINDOW).toBe(300_000);
  });

  it('смена дня рвёт группу даже в пределах окна', () => {
    const messages = [
      { author: 'ada', at: at(23, 58) },
      { author: 'ada', at: at(0, 1, 28) },
    ];

    expect(groupMessages(messages, options)).toEqual([false, false]);
  });

  it('время назад и неверная дата — новая группа', () => {
    const messages = [
      { author: 'ada', at: at(12, 5) },
      { author: 'ada', at: at(12, 1) },
      { author: 'ada', at: new Date(Number.NaN) },
    ];

    expect(groupMessages(messages, options)).toEqual([false, false, false]);
  });

  it('breakBefore — своя причина начать заново', () => {
    const messages = [
      { author: 'ada', at: at(12, 0) },
      { author: 'ada', at: at(12, 1), reply: true },
      { author: 'ada', at: at(12, 2) },
    ];

    expect(
      groupMessages(messages, { ...options, breakBefore: (message) => Boolean(message.reply) }),
    ).toEqual([false, false, true]);
  });

  it('время строкой и числом', () => {
    const messages = [
      { author: 'ada', time: '2026-10-27T12:00:00' },
      { author: 'ada', time: new Date(2026, 9, 27, 12, 3).getTime() },
    ];

    expect(
      groupMessages(messages, {
        author: (message) => message.author,
        time: (message) => message.time,
      }),
    ).toEqual([false, true]);
  });

  it('пустой список', () => {
    expect(groupMessages([], options)).toEqual([]);
  });
});

describe('sameDay', () => {
  it('по местному календарю', () => {
    expect(sameDay(at(0, 0), at(23, 59))).toBe(true);
    expect(sameDay(at(23, 59), at(0, 0, 28))).toBe(false);
  });
});
