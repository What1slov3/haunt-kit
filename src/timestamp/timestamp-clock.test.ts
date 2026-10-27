import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Модуль держит очередь в замыкании — свежий экземпляр на каждый тест
async function loadClock() {
  vi.resetModules();

  return import('./timestamp-clock');
}

describe('subscribeClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 26, 15, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('много подписчиков — один таймер', async () => {
    const { subscribeClock } = await loadClock();

    for (let i = 0; i < 50; i++) subscribeClock(() => {}, 30_000 + i * 1000);

    expect(vi.getTimerCount()).toBe(1);
  });

  it('вызывает только тех, чей срок подошёл, и один раз', async () => {
    const { subscribeClock } = await loadClock();
    const soon = vi.fn();
    const later = vi.fn();

    subscribeClock(soon, 30_000);
    subscribeClock(later, 300_000);

    await vi.advanceTimersByTimeAsync(30_000);

    expect(soon).toHaveBeenCalledTimes(1);
    expect(later).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300_000);

    expect(soon).toHaveBeenCalledTimes(1);
    expect(later).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('близкие сроки сливаются в один тик', async () => {
    const { subscribeClock } = await loadClock();
    const first = vi.fn();
    const second = vi.fn();

    // 15:00:01 и 15:00:02 + 30 с — оба срока округляются до 15:00:35
    vi.advanceTimersByTime(1_000);
    subscribeClock(first, 30_000);
    vi.advanceTimersByTime(1_000);
    subscribeClock(second, 30_000);

    await vi.advanceTimersByTimeAsync(32_999);

    expect(first).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('отписка снимает таймер', async () => {
    const { subscribeClock } = await loadClock();
    const listener = vi.fn();
    const unsubscribe = subscribeClock(listener, 30_000);

    unsubscribe();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(listener).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
