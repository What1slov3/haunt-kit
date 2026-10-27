/*
 * Вход `@haunt/ui/fx` — рантайм эффектов и лёгкие компоненты. Здесь только то, что дёшево держать в
 * стартовом чанке: планировщик, окружение, выбор пути рендера, проверка WebGL2, типы. Ядра на массивах,
 * шейдеры и общий WebGL-контекст статически отсюда не достижимы — только через import() (загрузчики
 * ниже и внутри компонентов).
 */

// Окружение: уровень эффектов, reduced-motion, принудительный путь рендера
export {
  isMotionAllowed,
  observeFxEnvironment,
  prefersReducedMotion,
  readEffectsLevel,
  readRendererOverride,
  type FxEnvironmentChange,
  type FxRenderer,
} from './environment';
export { useFxEnvironment, type FxEnvironment } from './use-fx-environment';

// Один цикл кадров на страницу и бюджет кадра
export {
  createScheduler,
  schedule,
  type FxHandle,
  type FxTask,
  type ScheduleOptions,
  type Scheduler,
  type SchedulerEnvironment,
} from './scheduler';
export {
  initialBudget,
  recordFrameCost,
  takeFrame,
  type BudgetOptions,
  type BudgetState,
} from './frame-budget';

// Стратегия эффекта и WebGL2
export { pickRenderer, resolveStrategy, type FxStrategy, type RendererContext } from './renderer';
export {
  detectWebgl2,
  isWebglUsable,
  onWebglStateChange,
  resetWebgl2Support,
  type Webgl2Support,
} from './webgl/support';

/** Обёртка WebGL2 (компиляция, треугольник, uniforms, текстуры) — отдельным чанком */
export const loadWebgl = () => import('./webgl/gl');

/** Общий WebGL2-контекст страницы (проход шейдера в 2D-холст, потеря контекста) — отдельным чанком */
export const loadSharedWebgl = () => import('./webgl/shared-context');

// Переходы между картинками
export {
  ImageTransition,
  type ImageTransitionEffect,
  type ImageTransitionProps,
} from './image-transition/image-transition';

// Режимы FilteredImage (сам компонент — в основном входе `@haunt/ui`)
export {
  FILTER_MODES,
  type ExtendedMode,
  type FilteredImageMode,
  type FilteredImageOptions,
} from '../filtered-image/modes';

// Фоны: живые холсты (сцены и шейдеры — отдельными чанками) и наложение развёртки
export { FxBackground, type FxBackgroundProps } from './backgrounds/fx-background';
export { Scanlines, type ScanlinesProps } from './backgrounds/scanlines';
export {
  BACKGROUND_FPS,
  backgroundStrategy,
  FX_BACKGROUNDS,
  type FxBackgroundVariant,
} from './backgrounds/variants';

// Эффекты компонентов (волна 3)
export { GlitchText, type GlitchTextProps } from './effects/glitch-text/glitch-text';
export { SplitFlap, type SplitFlapProps } from './effects/split-flap/split-flap';
export { FLAP_ALPHANUMERIC, FLAP_DIGITS, FLAP_TIME } from './effects/split-flap/flap-queue';
export { Typewriter, type TypewriterProps } from './effects/typewriter/typewriter';
export { TextReveal, type TextRevealProps } from './effects/text-reveal/text-reveal';
export { MarchingAnts, type MarchingAntsProps } from './effects/marching-ants/marching-ants';
export { ShineSweep, type ShineSweepProps } from './effects/shine-sweep/shine-sweep';
export { Tilt, type TiltProps } from './effects/tilt/tilt';
export { Magnetic, type MagneticProps } from './effects/magnetic/magnetic';
export { PixelDissolve, type PixelDissolveProps } from './effects/pixel-dissolve/pixel-dissolve';
export type { DissolveOrder } from './effects/pixel-dissolve/dissolve-mask';
export { ScanReveal, type ScanRevealProps } from './effects/scan-reveal/scan-reveal';
export { Burst, type BurstProps } from './effects/burst/burst';
export { Confetti, type ConfettiProps } from './effects/confetti/confetti';
export type { ParticleShape } from './effects/particles/particles';
export { Noise, type NoiseProps } from './effects/noise/noise';
export { Glow, type GlowProps } from './effects/glow/glow';
