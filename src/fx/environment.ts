import type { EffectsLevel } from '../theme';

/*
 * Окружение эффектов из DOM — одно место для всех canvas- и JS-эффектов кита: уровень `data-effects`,
 * prefers-reduced-motion и принудительный путь рендера `data-fx-renderer`. Читается с ближайшего предка,
 * а не из useTheme: уровень и тема бывают на контейнере (ThemeScope, колонки «без / тихо / ярко» в
 * документации), а не только на <html>.
 */

/** Путь рендера эффекта: шейдер WebGL2, Canvas 2D на CPU или один статичный кадр */
export type FxRenderer = 'webgl' | 'canvas' | 'static';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function isRenderer(value: string | undefined): value is FxRenderer {
  return value === 'webgl' || value === 'canvas' || value === 'static';
}

/** Уровень эффектов ближайшего `[data-effects]`; без атрибута — subtle, как в effects.css */
export function readEffectsLevel(element: Element | null | undefined): EffectsLevel {
  const value = element?.closest<HTMLElement>('[data-effects]')?.dataset.effects;

  return value === 'off' || value === 'rich' ? value : 'subtle';
}

/** Принудительный путь с ближайшего `[data-fx-renderer]` — для историй, тестов и отладки; иначе null */
export function readRendererOverride(element: Element | null | undefined): FxRenderer | null {
  const value = element?.closest<HTMLElement>('[data-fx-renderer]')?.dataset.fxRenderer;

  return isRenderer(value) ? value : null;
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Можно ли JS-эффекту двигаться у этого элемента: уровень не `off` и нет reduced-motion. Для эффектов,
 * которые сами решают, анимировать ли (расшифровка текста, счётчики), — вместо своего чтения атрибута.
 * Без элемента смотрит на <html>.
 */
export function isMotionAllowed(element?: Element | null): boolean {
  const target = element ?? (typeof document === 'undefined' ? null : document.documentElement);

  return readEffectsLevel(target) !== 'off' && !prefersReducedMotion();
}

export interface FxEnvironmentChange {
  /** Сменился `data-effects` или `data-fx-renderer` у предков, либо reduced-motion */
  environment: boolean;
  /** Сменилась тема или акцент: повод перечитать цвета из токенов */
  theme: boolean;
}

/**
 * Подписка на смену окружения у предков элемента. Атрибуты ставят на <html> или на любой контейнер
 * (ThemeScope, AccentScope) — поэтому смотрим всю цепочку предков, а не только документ.
 */
export function observeFxEnvironment(
  element: Element,
  onChange: (change: FxEnvironmentChange) => void,
): () => void {
  const media = typeof matchMedia === 'function' ? matchMedia(REDUCED_MOTION_QUERY) : null;
  const onMotion = () => onChange({ environment: true, theme: false });

  media?.addEventListener('change', onMotion);

  const observer = new MutationObserver((records) => {
    let environment = false;
    let theme = false;

    for (const record of records) {
      const target = record.target as HTMLElement;

      if (record.attributeName === 'data-effects' || record.attributeName === 'data-fx-renderer') {
        environment = true;
      }

      // Стиль «сигнал» меняет палитру так же, как тема: свой акцент и шрифт без смены data-theme
      if (
        record.attributeName === 'data-theme' ||
        record.attributeName === 'data-style' ||
        record.attributeName === 'data-signal-accent'
      ) {
        theme = true;
      }

      // style меняет и прожектор (--spot-x на каждом движении мыши) — палитру трогает только акцент
      if (record.attributeName === 'style' && target.style.getPropertyValue('--accent')) {
        theme = true;
      }
    }

    if (environment || theme) onChange({ environment, theme });
  });

  for (let node = element.parentElement; node; node = node.parentElement) {
    observer.observe(node, {
      attributes: true,
      attributeFilter: [
        'data-effects',
        'data-fx-renderer',
        'data-theme',
        'data-style',
        'data-signal-accent',
        'style',
      ],
    });
  }

  return () => {
    observer.disconnect();
    media?.removeEventListener('change', onMotion);
  };
}
