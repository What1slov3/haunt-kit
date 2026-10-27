import { initialBudget, recordFrameCost, takeFrame, type BudgetState } from './frame-budget';

/*
 * Планировщик кадров эффектов: один requestAnimationFrame на все эффекты страницы. Каждый эффект
 * подписывается `schedule(task, { element })` и получает вызовы `frame(now, dt)`, пока он на экране и
 * вкладка видна. Вне экрана (общий IntersectionObserver) и на скрытой вкладке кадры не идут вовсе, а когда
 * видимых задач нет, цикл rAF останавливается — без пустых кадров на фоне.
 *
 * Бюджет: стоимость каждого кадра задачи меряется, и по скользящему среднему (frame-budget.ts) дорогая
 * задача пропускает кадры. Сверх того весь проход ограничен общим бюджетом: если задачи этого кадра уже
 * съели его, остальные ждут следующего кадра, а очередь в следующий раз начинается с них — никто не
 * голодает.
 */

export interface FxTask {
  /** Кадр эффекта. `dt` — мс с прошлого выполненного кадра этой задачи (после паузы — не больше 100) */
  frame(now: number, dt: number): void;
  /** Задача ушла с экрана или вернулась (вкладка, прокрутка): повод поставить видео на паузу */
  onVisibilityChange?(visible: boolean): void;
}

export interface ScheduleOptions {
  /** Элемент эффекта: вне экрана задача стоит. Без элемента — считается видимой всегда */
  element?: Element | null;
  /** Потолок частоты кадров задачи (видео — 30) */
  fps?: number;
  /** Своя доля бюджета кадра, мс */
  budgetMs?: number;
}

export interface FxHandle {
  cancel(): void;
}

export interface SchedulerEnvironment {
  requestFrame(callback: (now: number) => void): number;
  cancelFrame(handle: number): void;
  now(): number;
  /** Скрыта ли вкладка; подписка на смену — через onVisibilityChange */
  hidden(): boolean;
  onDocumentVisibility(listener: () => void): () => void;
  /** Наблюдатель за видимостью элемента на экране; null — нет IntersectionObserver (jsdom) */
  observeElement?: ((element: Element, onChange: (visible: boolean) => void) => () => void) | null;
}

interface Entry {
  task: FxTask;
  minInterval: number;
  budgetMs: number;
  budget: BudgetState;
  last: number;
  onScreen: boolean;
  unobserve: () => void;
}

/** Доля кадра на одну задачу по умолчанию: при 60 Гц кадр — 16.7 мс, остальное — React и браузер */
const DEFAULT_TASK_BUDGET_MS = 4;
/** Все задачи одного кадра вместе — не дольше: дальше очередь ждёт следующего кадра */
const FRAME_BUDGET_MS = 10;
/** После паузы (вкладка, прокрутка) dt не скачет на секунды — физика эффектов не «телепортируется» */
const MAX_DT_MS = 100;

export interface Scheduler {
  schedule(task: FxTask, options?: ScheduleOptions): FxHandle;
  /** Сколько задач подписано — для тестов и отладки */
  size(): number;
}

export function createScheduler(env: SchedulerEnvironment): Scheduler {
  const entries: Entry[] = [];
  let handle = 0;
  let running = false;
  let cursor = 0;
  let stopVisibility: (() => void) | null = null;

  const visibleEntries = () => entries.filter((entry) => entry.onScreen);

  const stop = () => {
    if (running) env.cancelFrame(handle);

    running = false;
  };

  const ensureRunning = () => {
    if (running || env.hidden() || visibleEntries().length === 0) return;

    running = true;
    handle = env.requestFrame(tick);
  };

  function tick(now: number) {
    running = false;

    if (env.hidden()) return;

    const started = env.now();
    const count = entries.length;
    let processed = 0;

    for (; processed < count; processed++) {
      // Общий бюджет кадра исчерпан — остальные задачи первыми пойдут в следующем кадре
      if (processed > 0 && env.now() - started > FRAME_BUDGET_MS) break;

      const entry = entries[(cursor + processed) % count];

      if (!entry || !entry.onScreen) continue;

      if (now - entry.last < entry.minInterval) continue;

      const decision = takeFrame(entry.budget);

      entry.budget = decision.state;

      if (!decision.run) continue;

      const dt = entry.last ? Math.min(now - entry.last, MAX_DT_MS) : 0;
      const before = env.now();

      entry.last = now;

      try {
        entry.task.frame(now, dt);
      } finally {
        entry.budget = recordFrameCost(entry.budget, env.now() - before, {
          budgetMs: entry.budgetMs,
        });
      }
    }

    cursor = count ? (cursor + processed) % count : 0;
    ensureRunning();
  }

  const onDocumentVisibility = () => {
    const hidden = env.hidden();

    for (const entry of entries) {
      if (!entry.onScreen) continue;

      // После возврата на вкладку первый кадр — с dt = 0, а не с разницей во время отсутствия
      if (!hidden) entry.last = 0;

      entry.task.onVisibilityChange?.(!hidden);
    }

    if (hidden) stop();
    else ensureRunning();
  };

  return {
    schedule(task, options = {}) {
      const entry: Entry = {
        task,
        minInterval: options.fps ? 1000 / options.fps - 1 : 0,
        budgetMs: options.budgetMs ?? DEFAULT_TASK_BUDGET_MS,
        budget: initialBudget,
        last: 0,
        onScreen: true,
        unobserve: () => {},
      };

      entries.push(entry);
      stopVisibility ??= env.onDocumentVisibility(onDocumentVisibility);

      if (options.element && env.observeElement) {
        entry.unobserve = env.observeElement(options.element, (visible) => {
          if (entry.onScreen === visible) return;

          entry.onScreen = visible;
          entry.last = 0;
          task.onVisibilityChange?.(visible && !env.hidden());
          ensureRunning();
        });
      }

      ensureRunning();

      return {
        cancel() {
          const index = entries.indexOf(entry);

          if (index === -1) return;

          entries.splice(index, 1);
          entry.unobserve();

          if (entries.length === 0) {
            stop();
            stopVisibility?.();
            stopVisibility = null;
          }
        },
      };
    },
    size: () => entries.length,
  };
}

/** Один IntersectionObserver на все элементы эффектов — с запасом 64 px, чтобы кадр был готов к показу */
function sharedElementObserver(): SchedulerEnvironment['observeElement'] {
  if (typeof IntersectionObserver === 'undefined') return null;

  const listeners = new Map<Element, Set<(visible: boolean) => void>>();
  let observer: IntersectionObserver | null = null;

  return (element, onChange) => {
    observer ??= new IntersectionObserver(
      (records) => {
        for (const record of records) {
          for (const listener of listeners.get(record.target) ?? [])
            listener(record.isIntersecting);
        }
      },
      { rootMargin: '64px' },
    );

    let set = listeners.get(element);

    if (!set) {
      set = new Set();
      listeners.set(element, set);
      observer.observe(element);
    }

    set.add(onChange);

    return () => {
      set.delete(onChange);

      if (set.size === 0) {
        listeners.delete(element);
        observer?.unobserve(element);
      }
    };
  };
}

function browserEnvironment(): SchedulerEnvironment {
  return {
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (handle) => cancelAnimationFrame(handle),
    now: () => performance.now(),
    hidden: () => document.hidden,
    onDocumentVisibility(listener) {
      document.addEventListener('visibilitychange', listener);

      return () => document.removeEventListener('visibilitychange', listener);
    },
    observeElement: sharedElementObserver(),
  };
}

// Создаётся при первой подписке: импорт модуля не трогает DOM (пакет без побочных эффектов)
let shared: Scheduler | null = null;

/** Подписать эффект на общий цикл кадров страницы; `cancel()` — при размонтировании */
export function schedule(task: FxTask, options?: ScheduleOptions): FxHandle {
  shared ??= createScheduler(browserEnvironment());

  return shared.schedule(task, options);
}
