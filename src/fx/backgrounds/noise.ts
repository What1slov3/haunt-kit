/*
 * Шум для фонов — чистые функции без DOM. Градиентный шум Перлина («улучшенный», 2002) в 3D: x, y —
 * плоскость, z — время, так поле плывёт, а не прокручивается. Таблица перестановок строится от seed:
 * одна и та же картинка при каждом запуске истории и в тестах.
 */

/** Детерминированный генератор 0…1 (mulberry32): быстрый и с хорошим разбросом для раскладок */
export function random(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Noise3 {
  /** Значение примерно в −1…1, гладкое по всем трём осям */
  (x: number, y: number, z: number): number;
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 12 направлений рёбер куба — классический набор градиентов улучшенного шума */
function grad(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;

  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/** Шум с таблицей перестановок от seed */
export function createNoise3(seed = 1): Noise3 {
  const rand = random(seed);
  const p = new Uint8Array(512);
  const base = Array.from({ length: 256 }, (_, i) => i);

  // Тасование Фишера — Йетса: перестановка, а не случайные значения — шум без повторов внутри периода
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));

    [base[i], base[j]] = [base[j]!, base[i]!];
  }

  for (let i = 0; i < 512; i++) p[i] = base[i & 255]!;

  return (x, y, z) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const X = xi & 255;
    const Y = yi & 255;
    const Z = zi & 255;
    const xf = x - xi;
    const yf = y - yi;
    const zf = z - zi;
    const u = fade(xf);
    const v = fade(yf);
    const w = fade(zf);
    const A = p[X]! + Y;
    const AA = p[A]! + Z;
    const AB = p[A + 1]! + Z;
    const B = p[X + 1]! + Y;
    const BA = p[B]! + Z;
    const BB = p[B + 1]! + Z;

    return lerp(
      lerp(
        lerp(grad(p[AA]!, xf, yf, zf), grad(p[BA]!, xf - 1, yf, zf), u),
        lerp(grad(p[AB]!, xf, yf - 1, zf), grad(p[BB]!, xf - 1, yf - 1, zf), u),
        v,
      ),
      lerp(
        lerp(grad(p[AA + 1]!, xf, yf, zf - 1), grad(p[BA + 1]!, xf - 1, yf, zf - 1), u),
        lerp(grad(p[AB + 1]!, xf, yf - 1, zf - 1), grad(p[BB + 1]!, xf - 1, yf - 1, zf - 1), u),
        v,
      ),
      w,
    );
  };
}

/** Фрактальная сумма октав: крупные формы плюс мелкая рябь. Результат нормирован примерно в −1…1 */
export function fbm3(noise: Noise3, x: number, y: number, z: number, octaves = 3): number {
  let sum = 0;
  let amplitude = 1;
  let norm = 0;
  let frequency = 1;

  for (let i = 0; i < octaves; i++) {
    sum += amplitude * noise(x * frequency, y * frequency, z + i * 17.3);
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return sum / norm;
}
