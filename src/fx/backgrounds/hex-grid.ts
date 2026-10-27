/*
 * Гекс-сетка — ядро фона `hex`. Шестиугольники с плоским верхом в осевых координатах (q, r): центр
 * по формуле, обратный переход пиксель → клетка — через кубическое округление. Пульс от шины —
 * кольцо, расходящееся по клеткам: клетка светится, когда фронт проходит её расстояние.
 * Формулы — по Red Blob Games, «Hexagonal Grids».
 */

const SQRT3 = Math.sqrt(3);

export interface Hex {
  q: number;
  r: number;
  x: number;
  y: number;
}

/** Центр клетки (q, r) при радиусе описанной окружности `size` */
export function hexCenter(q: number, r: number, size: number): { x: number; y: number } {
  return { x: size * 1.5 * q, y: size * SQRT3 * (r + q / 2) };
}

/** Кубическое округление: дробные осевые координаты → ближайшая целая клетка */
export function roundHex(q: number, r: number): { q: number; r: number } {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);

  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;

  // -0 от округления делает равенство в тестах капризным
  return { q: rq + 0, r: rr + 0 };
}

/** Клетка под точкой (x, y) */
export function pixelToHex(x: number, y: number, size: number): { q: number; r: number } {
  const q = ((2 / 3) * x) / size;
  const r = ((-1 / 3) * x + (SQRT3 / 3) * y) / size;

  return roundHex(q, r);
}

/** Расстояние в клетках */
export function hexDistance(a: { q: number; r: number }, b: { q: number; r: number }): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;

  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

/** Все клетки, центры которых покрывают прямоугольник width × height (с запасом в клетку по краям) */
export function hexCells(width: number, height: number, size: number): Hex[] {
  const cells: Hex[] = [];
  const qMax = Math.ceil(width / (size * 1.5)) + 1;

  for (let q = -1; q <= qMax; q++) {
    const rMin = Math.floor(-q / 2) - 1;
    const rMax = Math.ceil(height / (size * SQRT3) - q / 2) + 1;

    for (let r = rMin; r <= rMax; r++) {
      const { x, y } = hexCenter(q, r, size);

      if (x < -size || y < -size || x > width + size || y > height + size) continue;

      cells.push({ q, r, x, y });
    }
  }

  return cells;
}

/**
 * Яркость клетки на расстоянии `distance` клеток от источника пульса через `elapsed` секунд:
 * фронт идёт со скоростью `speed` клеток/с, ширина фронта — `width` клеток, общее затухание к `life`.
 */
export function waveIntensity(
  distance: number,
  elapsed: number,
  speed = 14,
  width = 1.6,
  life = 1.2,
): number {
  if (elapsed < 0 || elapsed > life) return 0;

  const off = Math.abs(distance - elapsed * speed);

  if (off > width) return 0;

  return (1 - off / width) * (1 - elapsed / life);
}
