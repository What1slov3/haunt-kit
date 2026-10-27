/*
 * Детерминированная случайность для процедурной графики стиля «сигнал» (эмблема, поворот штампа,
 * серийники): одна и та же строка всегда даёт одну и ту же картинку — у пространства своя эмблема на
 * всех экранах и устройствах, без хранения.
 */

/** FNV-1a, 32 бита: быстрый и хорошо перемешивает короткие строки */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

/** Mulberry32: генератор с 32-битным состоянием, значения в [0, 1) */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Элемент массива по случайному числу */
export function pick<T>(random: () => number, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];

  if (item === undefined) throw new RangeError('pick: пустой массив');

  return item;
}

/** Целое в [min, max] включительно */
export function randomInt(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}
