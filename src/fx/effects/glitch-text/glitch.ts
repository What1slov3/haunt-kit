import { isSpace, seededRandom } from '../text-utils';

/*
 * Раскладка дрожи GlitchText — чистая функция: какие символы дрогнут, куда и с какой задержкой.
 * Детерминирована по seed (номер вспышки): кадр повторяем в тестах и на скриншотах.
 */

export interface GlitchChar {
  char: string;
  /** Дрожит ли символ в эту вспышку */
  jitter: boolean;
  /** Сдвиг, px */
  x: number;
  y: number;
  /** Задержка дрожи, мс — символы срываются не все разом */
  delay: number;
}

export interface GlitchOptions {
  seed: number;
  /** Доля дрожащих символов 0…1 */
  density?: number;
  /** Наибольший сдвиг по горизонтали, px; по вертикали — вдвое меньше */
  amplitude?: number;
  /** Окно задержек, мс */
  spread?: number;
}

/** Ступень задержки: дрожь «щёлкает» кадрами, как сбой сигнала, а не плывёт */
const DELAY_STEP_MS = 30;

export function glitchLayout(chars: readonly string[], options: GlitchOptions): GlitchChar[] {
  const { seed, density = 0.35, amplitude = 2, spread = 120 } = options;
  const random = seededRandom(seed);

  return chars.map((char) => {
    // Случайные числа тянутся и для пробелов: раскладка символа не зависит от пробелов перед ним
    const roll = random();
    const x = (random() * 2 - 1) * amplitude;
    const y = (random() * 2 - 1) * (amplitude / 2);
    const delay = Math.floor((random() * spread) / DELAY_STEP_MS) * DELAY_STEP_MS;

    if (isSpace(char) || roll >= density) return { char, jitter: false, x: 0, y: 0, delay: 0 };

    // Сдвиг меньше пикселя не виден — дрожащий символ сдвигается хотя бы на полный пиксель
    return { char, jitter: true, x: Math.abs(x) < 1 ? Math.sign(x || 1) : x, y, delay };
  });
}
