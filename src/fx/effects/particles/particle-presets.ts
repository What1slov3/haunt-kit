import type { ParticleOptions } from './particles';

/*
 * Отдельно от ядра: компоненты берут пресеты статически, а само ядро (particles.ts) грузится через
 * import() при первом всплеске.
 */

/** Короткий всплеск точек (как у Chip) и конфетти с гравитацией и кувырком */
export const particlePresets = {
  burst: {
    angle: -90,
    spread: 360,
    gravity: 0,
    drag: 6,
    variance: 0.15,
    shapes: ['dot'],
    spin: false,
  },
  confetti: {
    angle: -90,
    spread: 70,
    gravity: 900,
    drag: 2.2,
    variance: 0.45,
    size: [5, 9],
    shapes: ['rect', 'rect', 'dot'],
    spin: true,
  },
} as const satisfies Record<string, Partial<ParticleOptions>>;
