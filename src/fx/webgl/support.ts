/*
 * Поддержка WebGL2 — лёгкая часть рантайма, без шейдеров: её читают компоненты при выборе пути рендера.
 * Проверка — создать контекст по-настоящему (наличие `WebGL2RenderingContext` ещё ничего не значит:
 * драйвер в чёрном списке, GPU выключен политикой). Результат кэшируется, а созданный контекст не
 * выбрасывается — его забирает общий контекст (`shared-context.ts`), чтобы проверка не стоила лишнего
 * контекста из ~16, что браузер даёт странице.
 */

/** hardware — GPU; software — программный растеризатор (SwiftShader): работает, но медленнее CPU-ядер */
export type Webgl2Support = 'hardware' | 'software' | 'none';

/** Атрибуты общего контекста: без глубины, трафарета и сглаживания — эффекты рисуют один треугольник */
export const SHARED_CONTEXT_ATTRIBUTES: WebGLContextAttributes = {
  alpha: true,
  premultipliedAlpha: true,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: false,
  powerPreference: 'low-power',
};

interface Probe {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
}

let support: Webgl2Support | null = null;
let probe: Probe | null = null;

function tryContext(failIfMajorPerformanceCaveat: boolean): Probe | null {
  const canvas = document.createElement('canvas');

  canvas.width = 1;
  canvas.height = 1;

  try {
    const gl = canvas.getContext('webgl2', {
      ...SHARED_CONTEXT_ATTRIBUTES,
      failIfMajorPerformanceCaveat,
    });

    return gl && !gl.isContextLost() ? { canvas, gl } : null;
  } catch {
    return null;
  }
}

/** Программные растеризаторы по имени: Chromium через ANGLE не всегда считает SwiftShader «провалом производительности» */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/** Отладочное расширение есть не везде (Firefox прячет имя) — тогда верим флагу контекста */
function isSoftwareRenderer(gl: WebGL2RenderingContext): boolean {
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const name: unknown = gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER);

  return typeof name === 'string' && SOFTWARE_RENDERER.test(name);
}

/**
 * Есть ли WebGL2 и какой. Сначала — с `failIfMajorPerformanceCaveat`: так браузер отказывает, если
 * рисовать будет программный растеризатор. Тогда WebGL всё же доступен (`software`), но сам по себе
 * эффект его не выберет — только принудительно (`data-fx-renderer="webgl"`, истории в headless Chromium).
 */
export function detectWebgl2(): Webgl2Support {
  if (support) return support;

  if (typeof document === 'undefined' || typeof WebGL2RenderingContext === 'undefined') {
    support = 'none';

    return support;
  }

  probe = tryContext(true);
  support = probe ? (isSoftwareRenderer(probe.gl) ? 'software' : 'hardware') : 'none';

  if (!probe) {
    probe = tryContext(false);
    support = probe ? 'software' : 'none';
  }

  return support;
}

/** Отдать контекст проверки общему контексту — один раз; дальше он его владелец */
export function claimProbeContext(): Probe | null {
  const claimed = probe;

  probe = null;

  return claimed;
}

/*
 * Состояние общего контекста в рантайме. Живёт здесь, а не в shared-context.ts, чтобы выбор пути
 * (синхронный, в лёгком коде) видел потерю контекста, не загружая тяжёлую часть.
 */
let lost = false;
let broken = false;
const listeners = new Set<() => void>();

/** Можно ли сейчас рисовать шейдером: контекст не потерян и не сломан окончательно */
export function isWebglUsable(): boolean {
  return detectWebgl2() !== 'none' && !lost && !broken;
}

/** Для shared-context.ts: контекст потерян / восстановлен / сломан окончательно */
export function setWebglState(next: { lost?: boolean; broken?: boolean }): void {
  lost = next.lost ?? lost;
  broken = next.broken ?? broken;

  for (const listener of listeners) listener();
}

/** Подписка на потерю и восстановление контекста: эффект перерисуется по запасному пути и обратно */
export function onWebglStateChange(listener: () => void): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

/** Сбросить кэш проверки — для историй и тестов, подменяющих `getContext('webgl2')` */
export function resetWebgl2Support(): void {
  support = null;
  probe = null;
  lost = false;
  broken = false;

  for (const listener of listeners) listener();
}
