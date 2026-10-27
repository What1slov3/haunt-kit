import { useCallback, useState } from 'react';
import { flushSync } from 'react-dom';

import { isMotionAllowed } from '../fx/environment';

export interface ViewTransitionOptions {
  /** Типы перехода (`:active-view-transition-type(…)` в CSS) — где API их знает */
  types?: string[];
  /** Элемент, по чьему `data-effects` решать; по умолчанию — <html> */
  scope?: Element | null;
}

export interface ViewTransitionResult {
  /** Переход был (иначе обновление просто применено) */
  animated: boolean;
  /** Обновление применено, новый DOM на месте */
  updated: Promise<void>;
  /** Анимация доиграла (или её не было) */
  finished: Promise<void>;
}

type Update = () => void | Promise<void>;

interface TransitionLike {
  updateCallbackDone: Promise<void>;
  finished: Promise<void>;
}

type StartViewTransition = (arg: Update | { update: Update; types?: string[] }) => TransitionLike;

/** Будет ли переход: API есть, эффекты не выключены, нет reduced-motion */
export function canViewTransition(scope?: Element | null): boolean {
  return nativeStart() !== null && isMotionAllowed(scope);
}

function nativeStart(): StartViewTransition | null {
  if (typeof document === 'undefined') return null;

  const start = (document as Document & { startViewTransition?: StartViewTransition })
    .startViewTransition;

  return typeof start === 'function' ? start.bind(document) : null;
}

/**
 * Смена экрана через View Transitions API: браузер снимает старый кадр, `update` меняет DOM, новый
 * кадр проявляется (по умолчанию — crossfade; свои — `view-transition-name` и псевдоэлементы
 * `::view-transition-*`). Где API нет, при `data-effects="off"` и reduced-motion — `update` просто
 * применяется. Ошибка внутри перехода (повторный старт, вкладка скрыта) не теряет обновление.
 */
export function startViewTransition(
  update: Update,
  { types, scope }: ViewTransitionOptions = {},
): ViewTransitionResult {
  const start = nativeStart();

  if (!start || !isMotionAllowed(scope)) {
    // Сразу и синхронно: экран без перехода не должен ждать микрозадачу
    const updated = Promise.resolve(update());

    return { animated: false, updated, finished: updated };
  }

  try {
    const transition = types?.length ? start({ update, types }) : start(update);
    // Пропущенный переход (прервали следующим) отклоняет finished — это не ошибка экрана
    const finished = transition.finished.catch(() => undefined);

    return { animated: true, updated: transition.updateCallbackDone, finished };
  } catch {
    // Типы не поддержаны старой реализацией API — без них
    const transition = start(update);

    return {
      animated: true,
      updated: transition.updateCallbackDone,
      finished: transition.finished.catch(() => undefined),
    };
  }
}

/**
 * React-обёртка: `start(() => setScreen(next))` применяет состояние синхронно внутри перехода
 * (`flushSync`) — иначе браузер снял бы «новый» кадр до того, как React его нарисовал.
 * `transitioning` — идёт ли переход: например, чтобы не запускать второй поверх.
 */
export function useViewTransition(options: ViewTransitionOptions = {}): {
  start: (update: () => void) => ViewTransitionResult;
  transitioning: boolean;
} {
  const [transitioning, setTransitioning] = useState(false);
  const { types, scope } = options;
  const typesKey = types?.join(' ');

  const start = useCallback(
    (update: () => void) => {
      // Без перехода flushSync не нужен (и ругался бы, если start вызван из эффекта)
      if (!canViewTransition(scope)) return startViewTransition(update, { scope });

      const result = startViewTransition(() => flushSync(update), {
        types: typesKey ? typesKey.split(' ') : undefined,
        scope,
      });

      if (result.animated) {
        setTransitioning(true);
        void result.finished.then(() => setTransitioning(false));
      }

      return result;
    },
    [typesKey, scope],
  );

  return { start, transitioning };
}
