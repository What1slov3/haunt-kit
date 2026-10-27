import type { ScenePointer, ScenePulse } from '../scene';

/*
 * Реакция сцен — общая для всех фонов: курсор догоняется с запаздыванием и плавно гаснет при уходе,
 * волны от шины живут ограниченное время, одновременно — не больше четырёх.
 */

export interface SmoothPointer {
  x: number;
  y: number;
  /** 0…1: насколько курсор «присутствует» — растёт при наведении, гаснет после ухода */
  weight: number;
}

export function createSmoothPointer(): SmoothPointer {
  return { x: 0, y: 0, weight: 0 };
}

/** Догнать курсор за `dt` мс: постоянная времени ~90 мс, проявление ~200 мс, угасание ~400 мс */
export function followPointer(
  smooth: SmoothPointer,
  target: ScenePointer | null,
  dt: number,
): SmoothPointer {
  const k = 1 - Math.exp(-dt / 90);

  if (target) {
    if (smooth.weight === 0) {
      smooth.x = target.x;
      smooth.y = target.y;
    }

    smooth.x += (target.x - smooth.x) * k;
    smooth.y += (target.y - smooth.y) * k;
    smooth.weight = Math.min(1, smooth.weight + dt / 200);
  } else {
    smooth.weight = Math.max(0, smooth.weight - dt / 400);
  }

  return smooth;
}

export interface TimedPulse extends ScenePulse {
  /** Момент появления, мс */
  at: number;
}

/** Не больше четырёх волн разом: клики подряд не превращают фон в рябь */
export function addPulse(list: TimedPulse[], pulse: ScenePulse, now: number): TimedPulse[] {
  return [...list.slice(-3), { ...pulse, at: now }];
}

export function livePulses(list: TimedPulse[], now: number, duration: number): TimedPulse[] {
  return list.filter((pulse) => now - pulse.at < duration);
}
