import { describe, expect, it, vi } from 'vitest';

import { createScheduler, type SchedulerEnvironment } from './scheduler';

/** Ручной rAF и часы: кадр идёт по `flush()`, время задаёт тест, стоимость кадра — сама задача */
function fakeEnvironment() {
  let callbacks: ((now: number) => void)[] = [];
  let clock = 1000;
  let hidden = false;
  let visibilityListener: (() => void) | null = null;
  const elementListeners = new Map<Element, (visible: boolean) => void>();
  const requestFrame = vi.fn((callback: (now: number) => void) => {
    callbacks.push(callback);

    return callbacks.length;
  });

  const env: SchedulerEnvironment = {
    requestFrame,
    cancelFrame: () => {
      callbacks = [];
    },
    now: () => clock,
    hidden: () => hidden,
    onDocumentVisibility(listener) {
      visibilityListener = listener;

      return () => {
        visibilityListener = null;
      };
    },
    observeElement(element, onChange) {
      elementListeners.set(element, onChange);

      return () => elementListeners.delete(element);
    },
  };

  return {
    env,
    requestFrame,
    pending: () => callbacks.length,
    advance(ms: number) {
      clock += ms;
    },
    flush(frameMs = 16) {
      clock += frameMs;

      const current = callbacks;

      callbacks = [];

      for (const callback of current) callback(clock);
    },
    setHidden(value: boolean) {
      hidden = value;
      visibilityListener?.();
    },
    setOnScreen(element: Element, visible: boolean) {
      elementListeners.get(element)?.(visible);
    },
  };
}

describe('createScheduler', () => {
  it('один rAF на все задачи', () => {
    const fake = fakeEnvironment();
    const scheduler = createScheduler(fake.env);
    const a = vi.fn();
    const b = vi.fn();

    scheduler.schedule({ frame: a });
    scheduler.schedule({ frame: b });

    expect(fake.pending()).toBe(1);

    fake.flush();

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(fake.pending()).toBe(1);
  });

  it('после отписки последней задачи цикл останавливается', () => {
    const fake = fakeEnvironment();
    const scheduler = createScheduler(fake.env);
    const handle = scheduler.schedule({ frame: () => {} });

    handle.cancel();

    expect(fake.pending()).toBe(0);
    expect(scheduler.size()).toBe(0);
  });

  it('скрытая вкладка — кадров нет, возврат — продолжение с dt = 0', () => {
    const fake = fakeEnvironment();
    const scheduler = createScheduler(fake.env);
    const frame = vi.fn();
    const onVisibilityChange = vi.fn();

    scheduler.schedule({ frame, onVisibilityChange });
    fake.flush();
    fake.setHidden(true);

    expect(fake.pending()).toBe(0);
    expect(onVisibilityChange).toHaveBeenLastCalledWith(false);

    fake.advance(5000);
    fake.setHidden(false);
    fake.flush();

    expect(onVisibilityChange).toHaveBeenLastCalledWith(true);
    expect(frame).toHaveBeenLastCalledWith(expect.any(Number), 0);
  });

  it('элемент вне экрана стоит, остальные идут', () => {
    const fake = fakeEnvironment();
    const scheduler = createScheduler(fake.env);
    const element = document.createElement('div');
    const hiddenTask = vi.fn();
    const visibleTask = vi.fn();

    scheduler.schedule({ frame: hiddenTask }, { element });
    scheduler.schedule({ frame: visibleTask });
    fake.setOnScreen(element, false);
    fake.flush();

    expect(hiddenTask).not.toHaveBeenCalled();
    expect(visibleTask).toHaveBeenCalledTimes(1);
  });

  it('потолок fps: при 60 Гц задача с fps 30 идёт через кадр', () => {
    const fake = fakeEnvironment();
    const scheduler = createScheduler(fake.env);
    const frame = vi.fn();

    scheduler.schedule({ frame }, { fps: 30 });

    for (let i = 0; i < 6; i++) fake.flush(1000 / 60);

    expect(frame).toHaveBeenCalledTimes(3);
  });

  it('дорогая задача пропускает кадры, дешёвая — нет', () => {
    const fake = fakeEnvironment();
    const scheduler = createScheduler(fake.env);
    // Каждый кадр «стоит» 6 мс при бюджете 2 — рисуется каждый третий
    const heavy = vi.fn(() => fake.advance(6));
    const light = vi.fn();

    scheduler.schedule({ frame: heavy }, { budgetMs: 2 });
    scheduler.schedule({ frame: light });

    for (let i = 0; i < 9; i++) fake.flush();

    expect(light).toHaveBeenCalledTimes(9);
    expect(heavy).toHaveBeenCalledTimes(3);
  });

  it('общий бюджет кадра: после дорогой задачи остальные ждут следующего кадра', () => {
    const fake = fakeEnvironment();
    const scheduler = createScheduler(fake.env);
    const order: string[] = [];

    scheduler.schedule({ frame: () => (order.push('a'), fake.advance(11)) }, { budgetMs: 100 });
    scheduler.schedule({ frame: () => order.push('b') });
    fake.flush();
    fake.flush();

    // Во втором кадре очередь начинается с «голодной» b
    expect(order).toEqual(['a', 'b', 'a']);
  });
});
