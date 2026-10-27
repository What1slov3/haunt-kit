import { hashSeed } from '../emblem/seed';

/**
 * Наклон штампа по тексту: от −12° до −3°, как поставленный от руки. Один текст — один наклон, поэтому
 * штамп не «пляшет» между рендерами и экранами.
 */
export function stampRotation(text: string): number {
  return -3 - (hashSeed(text) % 91) / 10;
}
