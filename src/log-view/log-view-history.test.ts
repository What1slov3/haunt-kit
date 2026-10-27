import { describe, expect, it } from 'vitest';

import { createHistory, historyNext, historyPrevious, pushCommand } from './log-view-history';

describe('historyPrevious', () => {
  it('пустая история — поле не меняется', () => {
    expect(historyPrevious(createHistory(), 'черн')).toBeNull();
  });

  it('первый ↑ запоминает черновик и ставит самую новую команду', () => {
    const step = historyPrevious(createHistory(['/a', '/b']), '/ban @x');

    expect(step?.value).toBe('/b');
    expect(step?.history).toEqual({ entries: ['/a', '/b'], index: 1, draft: '/ban @x' });
  });

  it('дальше — старше, на самой старой останавливается', () => {
    const first = historyPrevious(createHistory(['/a', '/b']), '');
    const second = first && historyPrevious(first.history, first.value);

    expect(second?.value).toBe('/a');
    expect(second && historyPrevious(second.history, second.value)).toBeNull();
  });

  it('черновик не перезаписывается при движении по истории', () => {
    const first = historyPrevious(createHistory(['/a', '/b']), 'черновик');
    const second = first && historyPrevious(first.history, 'правка /b');

    expect(second?.history.draft).toBe('черновик');
  });
});

describe('historyNext', () => {
  it('на черновике — ничего', () => {
    expect(historyNext(createHistory(['/a']))).toBeNull();
  });

  it('↓ идёт к новым, после самой новой возвращает черновик', () => {
    const history = { entries: ['/a', '/b'], index: 0, draft: 'черновик' };
    const newer = historyNext(history);

    expect(newer?.value).toBe('/b');

    const back = newer && historyNext(newer.history);

    expect(back?.value).toBe('черновик');
    expect(back?.history.index).toBeNull();
  });
});

describe('pushCommand', () => {
  it('добавляет в конец и сбрасывает положение', () => {
    const history = { entries: ['/a'], index: 0, draft: 'x' };

    expect(pushCommand(history, '/b', 10)).toEqual(createHistory(['/a', '/b']));
  });

  it('повтор последней не дублируется', () => {
    expect(pushCommand(createHistory(['/a']), '/a', 10).entries).toEqual(['/a']);
  });

  it('старые уходят за лимит', () => {
    expect(pushCommand(createHistory(['/a', '/b']), '/c', 2).entries).toEqual(['/b', '/c']);
  });

  it('лимит 0 — истории нет', () => {
    expect(pushCommand(createHistory(['/a']), '/b', 0).entries).toEqual([]);
  });
});
