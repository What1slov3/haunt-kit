import { luminance } from '../../filtered-image/image-filters';

/*
 * Изолинии яркости — как горизонтали топокарты. Marching squares: поле значений в узлах сетки, каждая
 * клетка 2×2 узла классифицируется по тому, какие углы выше уровня (4 бита — 16 случаев), и по
 * таблице получает 0, 1 или 2 отрезка. Концы отрезков — на рёбрах клетки, в точке, где линейная
 * интерполяция значений даёт ровно уровень: линия гладкая, а не ступенчатая по сетке.
 */

/** Яркость каждого пикселя 0…1 — поле для изолиний и Собеля */
export function luminanceField(
  source: Uint8ClampedArray,
  width: number,
  height: number,
): Float32Array {
  const field = new Float32Array(width * height);

  for (let p = 0; p < field.length; p++) {
    field[p] = luminance(source[p * 4]!, source[p * 4 + 1]!, source[p * 4 + 2]!);
  }

  return field;
}

/*
 * Рёбра клетки: 0 — верх (a→b), 1 — право (b→c), 2 — низ (d→c), 3 — лево (a→d); углы a b / d c.
 * Таблица: случай → пары рёбер, которые соединяет отрезок.
 */
const SEGMENTS: readonly (readonly number[])[] = [
  [],
  [3, 2],
  [2, 1],
  [3, 1],
  [0, 1],
  [], // седло 5 — решается по центру клетки, ниже
  [0, 2],
  [3, 0],
  [3, 0],
  [0, 2],
  [], // седло 10
  [0, 1],
  [3, 1],
  [2, 1],
  [3, 2],
  [],
];

/**
 * Отрезки изолинии уровня `level` в координатах узлов сетки: плоский массив [x1, y1, x2, y2, …].
 * Седловые клетки (диагональные углы выше уровня) неоднозначны — решаем по среднему значению клетки:
 * выше уровня — диагональ соединена «горбом» в центре, ниже — разрезана.
 */
export function isolines(
  field: Float32Array,
  width: number,
  height: number,
  level: number,
): Float32Array {
  const out: number[] = [];
  const point = [0, 0];

  const edgePoint = (
    edge: number,
    x: number,
    y: number,
    a: number,
    b: number,
    c: number,
    d: number,
  ) => {
    // t — где на ребре значение равно уровню; деление на почти ноль — середина ребра
    const lerp = (from: number, to: number) =>
      Math.abs(to - from) < 1e-6 ? 0.5 : (level - from) / (to - from);

    if (edge === 0) {
      point[0] = x + lerp(a, b);
      point[1] = y;
    } else if (edge === 1) {
      point[0] = x + 1;
      point[1] = y + lerp(b, c);
    } else if (edge === 2) {
      point[0] = x + lerp(d, c);
      point[1] = y + 1;
    } else {
      point[0] = x;
      point[1] = y + lerp(a, d);
    }
  };

  const push = (
    edges: readonly number[],
    x: number,
    y: number,
    a: number,
    b: number,
    c: number,
    d: number,
  ) => {
    for (let k = 0; k < edges.length; k += 2) {
      edgePoint(edges[k]!, x, y, a, b, c, d);
      out.push(point[0]!, point[1]!);
      edgePoint(edges[k + 1]!, x, y, a, b, c, d);
      out.push(point[0]!, point[1]!);
    }
  };

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const a = field[y * width + x]!;
      const b = field[y * width + x + 1]!;
      const c = field[(y + 1) * width + x + 1]!;
      const d = field[(y + 1) * width + x]!;
      const index =
        (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);

      if (index === 5 || index === 10) {
        const centerAbove = (a + b + c + d) / 4 > level;

        // 5: b и d выше; 10: a и c выше. Центр выше — «выше»-углы соединены через центр
        if (index === 5) push(centerAbove ? [3, 0, 2, 1] : [0, 1, 3, 2], x, y, a, b, c, d);
        else push(centerAbove ? [0, 1, 3, 2] : [3, 0, 2, 1], x, y, a, b, c, d);

        continue;
      }

      push(SEGMENTS[index]!, x, y, a, b, c, d);
    }
  }

  return Float32Array.from(out);
}
