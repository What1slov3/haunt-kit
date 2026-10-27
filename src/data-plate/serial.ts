import { createRandom, hashSeed } from '../emblem/seed';

/* Без похожих символов (0/O, 1/I): серийник читают глазами и переписывают руками */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export interface SerialOptions {
  /** Серия впереди: `HNT` */
  prefix?: string;
  /** Группы символов через дефис */
  groups?: number;
  /** Символов в группе */
  length?: number;
}

/**
 * Серийник по seed: `HNT-7K2Q-X9MD`. Один seed — один номер; печатный ASCII, поэтому годится и для
 * штрихкода Code 128 B. Это маркировка для вида, а не идентификатор: уникальность не гарантируется.
 */
export function serialFromSeed(
  seed: string,
  { prefix, groups = 2, length = 4 }: SerialOptions = {},
): string {
  const random = createRandom(hashSeed(seed));
  const parts = Array.from({ length: groups }, () =>
    Array.from({ length }, () => ALPHABET[Math.floor(random() * ALPHABET.length)]).join(''),
  );

  return [prefix, ...parts].filter(Boolean).join('-');
}
