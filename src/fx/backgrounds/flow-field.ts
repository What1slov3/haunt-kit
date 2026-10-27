/*
 * Частицы по полю течения — ядро фона `flow` на CPU. Частицы лежат плоским Float32Array (по STRIDE
 * чисел на частицу): тысяча объектов {x, y} давала бы сборку мусора каждые несколько секунд, а
 * массив — нет.
 *
 * Поле — ротор функции тока ψ = Σ Aᵢ·sin(kᵢ·p + ωᵢt): скорость (∂ψ/∂y, −∂ψ/∂x) без дивергенции, поток
 * вихрится и не собирается в точки-стоки. Производные — аналитически (косинусы), без конечных
 * разностей по шуму: ту же формулу шейдер считает на каждом шаге трассировки, и пути совпадают.
 */

/** x, y, прошлые x, y, возраст, срок жизни (с) */
export const STRIDE = 6;

/**
 * Волны функции тока: kx, ky (на единицу поля), фаза, частота во времени, амплитуда. Направления
 * и длины разные и несоизмеримые — рисунок вихрей не складывается в решётку. Копия — в шейдере `flow`.
 */
export const STREAM_WAVES: readonly (readonly [number, number, number, number, number])[] = [
  [1.0, 0.35, 0.0, 0.11, 1.0],
  [-0.42, 1.13, 1.7, -0.07, 0.8],
  [1.61, -0.93, 4.1, 0.05, 0.45],
  [0.57, 2.21, 2.3, 0.13, 0.3],
  [-2.47, -1.29, 5.2, -0.09, 0.2],
];

/** Скорость поля в точке (x, y) — координаты поля, не пиксели — в момент `time` (с) */
export function streamVelocity(x: number, y: number, time: number, out: [number, number]) {
  let vx = 0;
  let vy = 0;

  for (const [kx, ky, phase, omega, amp] of STREAM_WAVES) {
    const c = amp * Math.cos(kx * x + ky * y + phase + omega * time);

    // ψ = A·sin(kx·x + ky·y + …): ∂ψ/∂y = A·ky·cos, −∂ψ/∂x = −A·kx·cos
    vx += c * ky;
    vy -= c * kx;
  }

  out[0] = vx;
  out[1] = vy;

  return out;
}

export interface FlowOptions {
  /** Единиц поля на пиксель: 0.004 — вихрь размером ~500 px */
  scale: number;
  /** Скорость, px/с на единицу скорости поля */
  speed: number;
}

export const DEFAULT_FLOW: FlowOptions = { scale: 0.004, speed: 22 };

function spawn(
  buffer: Float32Array,
  offset: number,
  width: number,
  height: number,
  rand: () => number,
) {
  const x = rand() * width;
  const y = rand() * height;

  buffer[offset] = x;
  buffer[offset + 1] = y;
  buffer[offset + 2] = x;
  buffer[offset + 3] = y;
  buffer[offset + 4] = 0;
  buffer[offset + 5] = 3 + rand() * 6;
}

/** Частицы, равномерно рассыпанные по полю; возраст разный — чтобы не умирали все разом */
export function seedParticles(
  count: number,
  width: number,
  height: number,
  rand: () => number,
): Float32Array {
  const buffer = new Float32Array(count * STRIDE);

  for (let i = 0; i < count; i++) {
    spawn(buffer, i * STRIDE, width, height, rand);
    buffer[i * STRIDE + 4] = rand() * buffer[i * STRIDE + 5]!;
  }

  return buffer;
}

/**
 * Шаг частиц на `dt` секунд в момент `time`. Частица, ушедшая за край или прожившая свой срок,
 * рождается заново в случайном месте (возраст 0): поток не редеет и не скапливается у краёв.
 */
export function stepParticles(
  buffer: Float32Array,
  width: number,
  height: number,
  time: number,
  dt: number,
  rand: () => number,
  options: FlowOptions = DEFAULT_FLOW,
): void {
  const v: [number, number] = [0, 0];

  for (let offset = 0; offset < buffer.length; offset += STRIDE) {
    const x = buffer[offset]!;
    const y = buffer[offset + 1]!;

    streamVelocity(x * options.scale, y * options.scale, time, v);

    const nx = x + v[0] * options.speed * dt;
    const ny = y + v[1] * options.speed * dt;
    const age = buffer[offset + 4]! + dt;

    if (age > buffer[offset + 5]! || nx < 0 || ny < 0 || nx > width || ny > height) {
      spawn(buffer, offset, width, height, rand);
      continue;
    }

    buffer[offset] = nx;
    buffer[offset + 1] = ny;
    buffer[offset + 2] = x;
    buffer[offset + 3] = y;
    buffer[offset + 4] = age;
  }
}

/** Яркость частицы по возрасту: проявляется и гаснет плавно, без вспышки на рождении */
export function particleAlpha(age: number, life: number): number {
  if (life <= 0) return 0;

  const t = Math.min(1, Math.max(0, age / life));

  return Math.min(1, t * 6) * Math.min(1, (1 - t) * 3);
}
