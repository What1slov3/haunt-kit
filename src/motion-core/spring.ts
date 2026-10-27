/*
 * Пружина для Web Animations API без библиотеки: физика затухающего осциллятора решена формулой и
 * разложена в кадры. Результат — прогресс 0 → 1 по кадрам 60 Гц (`keyframes`), длительность до покоя
 * и та же кривая как CSS `linear()` (`easing`) — для анимации из двух ключевых кадров или CSS-перехода.
 *
 * Отклонение d = x − 1, d(0) = −1, d'(0) = v0; ω0 = √(k/m), ζ = c / (2√(km)):
 *   ζ < 1 — колебание с затуханием (перелёт), ζ = 1 — критическое, ζ > 1 — передемпфированное (без
 *   перелёта). Пресеты кита передемпфированы или почти критичны: короткое точное движение без «резины».
 */

export interface SpringOptions {
  /** Жёсткость k: больше — быстрее */
  stiffness?: number;
  /** Сопротивление c: больше — меньше колебаний */
  damping?: number;
  /** Масса m: больше — инертнее */
  mass?: number;
  /** Начальная скорость в долях пути в секунду (подхват жеста) */
  velocity?: number;
  /** Покой: отклонение меньше этого… */
  restDelta?: number;
  /** …и скорость меньше этой (долей в секунду) */
  restSpeed?: number;
}

export interface SpringCurve {
  /** Прогресс по кадрам 60 Гц от 0 до ровно 1; у недодемпфированной пружины бывает больше 1 */
  keyframes: number[];
  /** До покоя, мс */
  duration: number;
  /** CSS `linear(…)` с той же кривой */
  easing: string;
}

/** Те же числа, что `springs` в motion/presets.ts: один характер движения с Motion и без него */
export const springPresets = {
  /** Элементы управления и индикаторы: быстро, без отскока */
  snappy: { stiffness: 700, damping: 50, mass: 0.6 },
  /** Панели и карточки: мягче, но тоже без перелёта */
  gentle: { stiffness: 380, damping: 38, mass: 1 },
} as const satisfies Record<string, SpringOptions>;

const FRAME_S = 1 / 60;
/** Не дольше: пружина с почти нулевым затуханием не должна давать анимацию на минуты */
const MAX_S = 10;

/** Прогресс пружины в момент `t` секунд */
export function springValue(options: SpringOptions, t: number): number {
  const { stiffness = 100, damping = 10, mass = 1, velocity = 0 } = options;
  const omega = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const d0 = -1;
  let d: number;

  if (zeta < 1) {
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);

    d =
      Math.exp(-zeta * omega * t) *
      (d0 * Math.cos(omegaD * t) +
        ((velocity + zeta * omega * d0) / omegaD) * Math.sin(omegaD * t));
  } else if (zeta === 1) {
    d = Math.exp(-omega * t) * (d0 + (velocity + omega * d0) * t);
  } else {
    const root = Math.sqrt(zeta * zeta - 1);
    const r1 = -omega * (zeta - root);
    const r2 = -omega * (zeta + root);
    const c2 = (velocity - r1 * d0) / (r2 - r1);
    const c1 = d0 - c2;

    d = c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
  }

  return 1 + d;
}

/** Кривая пружины: кадры до покоя, длительность и `linear()` */
export function spring(options: SpringOptions = {}): SpringCurve {
  const { restDelta = 0.001, restSpeed = 0.01 } = options;
  const keyframes: number[] = [];
  let t = 0;

  for (; t <= MAX_S; t += FRAME_S) {
    const value = springValue(options, t);
    const speed = (springValue(options, t + 0.001) - value) / 0.001;

    keyframes.push(value);

    if (t > 0 && Math.abs(value - 1) < restDelta && Math.abs(speed) < restSpeed) break;
  }

  // Последний кадр — точно цель: WAAPI держит его после конца (fill), сдвиг на 0.001 был бы виден
  keyframes[keyframes.length - 1] = 1;

  const duration = Math.round((keyframes.length - 1) * FRAME_S * 1000);

  return { keyframes, duration, easing: toLinearEasing(keyframes) };
}

/** Кадры → CSS `linear()`: точки равномерны по времени, поэтому позиции не нужны */
export function toLinearEasing(values: readonly number[]): string {
  return `linear(${values.map((value) => Number(value.toFixed(4))).join(', ')})`;
}

/**
 * Кадры WAAPI из кривой: `at` переводит прогресс в свойства. Анимировать с `easing: 'linear'` и
 * `duration: curve.duration` — кривая уже в кадрах.
 */
export function springKeyframes(
  curve: SpringCurve,
  at: (progress: number) => Keyframe,
): Keyframe[] {
  return curve.keyframes.map(at);
}

let linearSupported: boolean | undefined;

/**
 * `linear()` поддерживается (Chromium 113+, Safari 17.2+, Firefox 112+). Где нет — WAAPI бросил бы
 * исключение на неизвестной кривой: берите кадры (`springKeyframes`) или `fallback`.
 */
export function supportsLinearEasing(): boolean {
  linearSupported ??=
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('transition-timing-function', 'linear(0, 1)');

  return linearSupported;
}

/** Кривая пружины для CSS или WAAPI с запасной cubic-bezier там, где `linear()` нет */
export function springEasing(
  curve: SpringCurve,
  fallback = 'cubic-bezier(0.2, 0.7, 0.2, 1)',
): string {
  return supportsLinearEasing() ? curve.easing : fallback;
}
