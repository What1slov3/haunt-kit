import { describe, expect, it } from 'vitest';

import { dateTileParts, durationParts, eventPhase, timeRange } from './event-time';

const start = '2026-03-13T19:00:00Z';
const end = '2026-03-13T21:30:00Z';

describe('dateTileParts', () => {
  it('день, месяц и день недели в поясе события', () => {
    expect(dateTileParts(new Date(start), 'en', 'UTC')).toEqual({
      day: '13',
      month: 'Mar',
      weekday: 'Fri',
    });
  });

  it('снимает точку сокращения', () => {
    expect(dateTileParts(new Date(start), 'ru', 'UTC').month).not.toMatch(/\.$/);
  });

  it('день считается в заданном поясе', () => {
    expect(dateTileParts(new Date('2026-03-13T23:30:00Z'), 'en', 'Asia/Tokyo').day).toBe('14');
  });
});

describe('eventPhase', () => {
  it('до, во время и после', () => {
    expect(eventPhase(start, end, new Date('2026-03-13T18:00:00Z'))).toBe('upcoming');
    expect(eventPhase(start, end, new Date('2026-03-13T20:00:00Z'))).toBe('live');
    expect(eventPhase(start, end, new Date('2026-03-13T21:30:00Z'))).toBe('ended');
  });

  it('без конца после начала — идёт', () => {
    expect(eventPhase(start, undefined, new Date('2026-03-20T00:00:00Z'))).toBe('live');
  });
});

describe('durationParts', () => {
  it('часы и минуты', () => {
    expect(durationParts(start, end)).toEqual({ hours: 2, minutes: 30 });
  });

  it('конец раньше начала — ноль', () => {
    expect(durationParts(end, start)).toEqual({ hours: 0, minutes: 0 });
  });
});

describe('timeRange', () => {
  it('начало и конец одного дня', () => {
    expect(timeRange(start, end, 'ru', 'UTC')).toBe('19:00–21:30');
  });

  it('без конца — только начало', () => {
    expect(timeRange(start, undefined, 'ru', 'UTC')).toBe('19:00');
  });

  it('конец в другой день — с датой', () => {
    expect(timeRange(start, '2026-03-14T02:00:00Z', 'ru', 'UTC')).toMatch(/^19:00–14 .+, 0?2:00$/);
  });
});
