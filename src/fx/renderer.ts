import type { FxRenderer } from './environment';
import type { Webgl2Support } from './webgl/support';

/**
 * Стратегия эффекта: какие пути у него есть. `static` — обязательный последний: один кадр без движения
 * (или содержимое как есть). Значения — что угодно, что эффект знает, как запустить: ленивый загрузчик,
 * флаг, функция рисования.
 */
export interface FxStrategy<T> {
  webgl?: T;
  canvas2d?: T;
  static: T;
}

export interface RendererContext {
  /** Принудительный путь `data-fx-renderer`, иначе null */
  override: FxRenderer | null;
  support: Webgl2Support;
  /** Общий контекст не потерян и не сломан (`isWebglUsable`) */
  webglUsable: boolean;
}

/**
 * Выбор пути. Сам по себе эффект берёт WebGL только на GPU (`hardware`): программный растеризатор
 * медленнее CPU-ядер на маленьких холстах. Принудительный `webgl` принимает и `software` — так история
 * в headless Chromium показывает шейдер. Недоступный путь сползает вниз: webgl → canvas → static.
 */
export function pickRenderer(strategy: FxStrategy<unknown>, context: RendererContext): FxRenderer {
  const canWebgl =
    strategy.webgl !== undefined && context.support !== 'none' && context.webglUsable;
  const canCanvas = strategy.canvas2d !== undefined;

  if (context.override === 'static') return 'static';

  if (context.override === 'webgl' && canWebgl) return 'webgl';

  if (context.override === 'canvas' || context.override === 'webgl') {
    return canCanvas ? 'canvas' : 'static';
  }

  if (canWebgl && context.support === 'hardware') return 'webgl';

  return canCanvas ? 'canvas' : 'static';
}

/** Реализация выбранного пути */
export function resolveStrategy<T>(strategy: FxStrategy<T>, renderer: FxRenderer): T {
  if (renderer === 'webgl' && strategy.webgl !== undefined) return strategy.webgl;
  if (renderer !== 'static' && strategy.canvas2d !== undefined) return strategy.canvas2d;

  return strategy.static;
}
