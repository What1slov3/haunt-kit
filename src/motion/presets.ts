import type { Transition, Variants } from 'motion/react';

/*
 * Движение для Motion — JS-двойник tokens.css. CSS-переходы покрывают наведение и нажатие,
 * Motion — раскладку и общие элементы (индикатор вкладок). Все пружины передемпфированы:
 * короткое точное движение без «резины».
 */
export const springs = {
  /** Элементы управления и индикаторы: быстро, без отскока */
  snappy: { type: 'spring', stiffness: 700, damping: 50, mass: 0.6 },
  /** Панели и карточки: мягче, но тоже без перелёта */
  gentle: { type: 'spring', stiffness: 380, damping: 38 },
} satisfies Record<string, Transition>;

export const durations = {
  fast: 0.09,
  base: 0.15,
  slow: 0.22,
} as const;

export const easeOut = [0.2, 0.7, 0.2, 1] as const;

/** Появление из лёгкого сдвига и прозрачности — только transform/opacity */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: durations.base, ease: easeOut } },
  exit: { opacity: 0, y: 2, transition: { duration: durations.fast, ease: easeOut } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: { duration: durations.base, ease: easeOut } },
  exit: { opacity: 0, scale: 0.99, transition: { duration: durations.fast, ease: easeOut } },
};

/** Контейнер списка: дети с `fadeUp` появляются каскадом */
export const staggerList: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.025, delayChildren: 0.01 } },
};
