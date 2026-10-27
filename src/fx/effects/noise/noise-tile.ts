import { seededRandom } from '../text-utils';

/*
 * Плитка зерна для Noise — чистые функции, грузятся через import() вместе с первым кадром. Плитка
 * считается один раз; «живое» зерно — та же плитка со случайным сдвигом на каждом кадре: глаз видит
 * кипение, а CPU не пересчитывает шум.
 */

/** RGBA-плитка size × size: серый белый шум, альфа полная (силу задаёт opacity слоя) */
export function noiseTile(size: number, seed = 1): Uint8ClampedArray<ArrayBuffer> {
  const random = seededRandom(seed);
  const data = new Uint8ClampedArray(size * size * 4);

  for (let index = 0; index < data.length; index += 4) {
    const value = Math.floor(random() * 256);

    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }

  return data;
}

/** Сдвиг плитки на кадре `frame`: целые пиксели (без размытия при отрисовке), детерминированно */
export function noiseOffset(frame: number, size: number, seed = 1): { x: number; y: number } {
  const random = seededRandom(seed * 7919 + frame);

  return { x: Math.floor(random() * size), y: Math.floor(random() * size) };
}
