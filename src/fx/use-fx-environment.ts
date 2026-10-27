import { useLayoutEffect, useState, type RefObject } from 'react';

import type { EffectsLevel } from '../theme';

import {
  observeFxEnvironment,
  prefersReducedMotion,
  readEffectsLevel,
  readRendererOverride,
  type FxRenderer,
} from './environment';

export interface FxEnvironment {
  /** Уровень эффектов ближайшего `[data-effects]`; без атрибута — subtle */
  effects: EffectsLevel;
  reducedMotion: boolean;
  /** Можно двигаться: уровень не `off` и нет reduced-motion */
  motion: boolean;
  /** Принудительный путь рендера с ближайшего `[data-fx-renderer]`, иначе null — выбирает эффект */
  renderer: FxRenderer | null;
  /** Растёт при смене темы или акцента у предков: повод перечитать цвета из токенов */
  themeVersion: number;
}

interface Snapshot {
  effects: EffectsLevel;
  reducedMotion: boolean;
  renderer: FxRenderer | null;
}

function read(element: Element | null): Snapshot {
  return {
    effects: readEffectsLevel(element),
    reducedMotion: prefersReducedMotion(),
    renderer: readRendererOverride(element),
  };
}

/*
 * Окружение эффекта для React. Layout-эффект — чтобы при data-effects="off" первым кадром сразу было
 * обычное содержимое, без мелькания эффекта. До монтирования — значения по умолчанию (subtle, движение есть).
 */
export function useFxEnvironment(ref: RefObject<Element | null>): FxEnvironment {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    effects: 'subtle',
    reducedMotion: false,
    renderer: null,
  });
  const [themeVersion, setThemeVersion] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!element) return;

    const update = () =>
      setSnapshot((current) => {
        const next = read(element);

        // Тот же объект — без лишнего рендера, если атрибут поставили тем же значением
        return next.effects === current.effects &&
          next.reducedMotion === current.reducedMotion &&
          next.renderer === current.renderer
          ? current
          : next;
      });

    update();

    return observeFxEnvironment(element, ({ environment, theme }) => {
      if (environment) update();
      if (theme) setThemeVersion((version) => version + 1);
    });
  }, [ref]);

  return {
    ...snapshot,
    motion: snapshot.effects !== 'off' && !snapshot.reducedMotion,
    themeVersion,
  };
}
