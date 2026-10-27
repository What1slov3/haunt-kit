/** Заливка width×height одним цветом — вход ядер в тестах */
export function solid(width: number, height: number, rgb: readonly [number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < data.length; i += 4) data.set([rgb[0], rgb[1], rgb[2], 255], i);

  return data;
}

/** Ряд серых по значениям — по пикселю на значение */
export function grays(values: readonly number[]) {
  const data = new Uint8ClampedArray(values.length * 4);

  values.forEach((value, i) => data.set([value, value, value, 255], i * 4));

  return data;
}
