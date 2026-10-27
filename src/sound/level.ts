/*
 * Уровень звука — свой, как `data-effects`: `data-sound="off | subtle | on"` на <html> или на
 * контейнере, без атрибута — off. Reduced-motion звук не трогает: это не движение.
 */

export type SoundLevel = 'off' | 'subtle' | 'on';

export const SOUND_LEVELS: readonly SoundLevel[] = ['off', 'subtle', 'on'];

/** Множитель громкости уровня: subtle — тише и только значимые звуки (см. `minLevel` у звука) */
export const LEVEL_GAIN: Record<SoundLevel, number> = { off: 0, subtle: 0.45, on: 0.8 };

/** Уровень ближайшего `[data-sound]`; без элемента — с <html>, без атрибута — off */
export function readSoundLevel(element?: Element | null): SoundLevel {
  const target = element ?? (typeof document === 'undefined' ? null : document.documentElement);
  const value = target?.closest<HTMLElement>('[data-sound]')?.dataset.sound;

  return value === 'subtle' || value === 'on' ? value : 'off';
}

/** Звук с порогом `minLevel` слышен на уровне `level` */
export function isAudible(level: SoundLevel, minLevel: Exclude<SoundLevel, 'off'>): boolean {
  if (level === 'off') return false;

  return minLevel === 'subtle' || level === 'on';
}
