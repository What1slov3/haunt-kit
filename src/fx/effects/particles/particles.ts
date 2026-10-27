import { seededRandom } from '../text-utils';

/*
 * Ядро частиц для Burst и Confetti — чистые функции, грузятся через import() при первом всплеске.
 * Траектория считается формулой, а не шагами интегрирования: положение в момент t не зависит от
 * частоты кадров и пропусков бюджета, и его можно проверить в тесте.
 *
 * Модель: начальная скорость v0, линейное сопротивление k (1/с) и гравитация g (px/с²):
 *   x(t) = v0x/k·(1 − e^(−kt))
 *   y(t) = (v0y − g/k)/k·(1 − e^(−kt)) + g·t/k   (y вниз, как на холсте)
 * Без гравитации частица тормозит и замирает на расстоянии v0/k — так всплеск «раскрывается» и гаснет.
 * С гравитацией скорость подбирается под высоту подъёма: `distance` — насколько взлетит вертикальная.
 */

export type ParticleShape = 'dot' | 'rect' | 'spark';

export interface ParticleOptions {
  count: number;
  /** Дальность разлёта к концу жизни без гравитации, px */
  distance: number;
  /** Направление, градусы: 0 — вправо, −90 — вверх */
  angle?: number;
  /** Сектор разлёта, градусы; 360 — во все стороны */
  spread?: number;
  /** Жизнь частицы, мс */
  life: number;
  /** Гравитация, px/с² (конфетти падает) */
  gravity?: number;
  /** Сопротивление воздуха, 1/с: больше — резче тормозит */
  drag?: number;
  /** Разброс дальности: 0.3 — от 0.7 до 1.3 от distance */
  variance?: number;
  /** Размер частицы, px: [мин, макс] */
  size?: readonly [number, number];
  shapes?: readonly ParticleShape[];
  /** Сколько цветов в палитре: частица получает индекс */
  colors?: number;
  /** Вращение (конфетти): частица кувыркается */
  spin?: boolean;
  seed?: number;
}

export interface Particle {
  vx: number;
  vy: number;
  drag: number;
  gravity: number;
  life: number;
  size: number;
  shape: ParticleShape;
  color: number;
  rotation: number;
  /** Обороты в секунду; 0 — не вращается */
  spin: number;
  /** Фаза кувырка: прямоугольник конфетти то узкий, то широкий */
  flip: number;
}

export interface ParticleState {
  x: number;
  y: number;
  alpha: number;
  scale: number;
  /** Градусы */
  rotation: number;
  /** Сжатие по одной оси −1…1: кувырок плоской бумажки */
  flip: number;
}

const DEG = Math.PI / 180;

/**
 * Начальная скорость, с которой брошенная вверх частица поднимется на `height` px. Высота подъёма
 * h(u) = u/k − (g/k²)·ln(1 + u·k/g) растёт с u монотонно — ищем делением пополам.
 */
export function launchSpeed(height: number, gravity: number, drag: number): number {
  const peak = (speed: number) =>
    speed / drag - (gravity / (drag * drag)) * Math.log(1 + (speed * drag) / gravity);
  let low = 0;
  let high = 1;

  while (peak(high) < height && high < 1e6) high *= 2;

  for (let step = 0; step < 40; step++) {
    const middle = (low + high) / 2;

    if (peak(middle) < height) low = middle;
    else high = middle;
  }

  return (low + high) / 2;
}

/** Частицы одного всплеска. Направления — равномерно по сектору с лёгким дрожанием, не кучками */
export function createParticles(options: ParticleOptions): Particle[] {
  const {
    count,
    distance,
    angle = -90,
    spread = 360,
    life,
    gravity = 0,
    drag = 4,
    variance = 0.25,
    size = [3, 5],
    shapes = ['dot'],
    colors = 1,
    spin = false,
    seed = 1,
  } = options;
  const random = seededRandom(seed);
  // Скорость, при которой без гравитации частица к концу общей жизни прошла ровно свою дальность
  const reach = 1 - Math.exp((-drag * life) / 1000);
  const full = spread >= 360;
  const particles: Particle[] = [];

  for (let index = 0; index < count; index++) {
    // Полный круг делится на count секторов; дуга — на count − 1 промежутков, чтобы края тоже были
    const slot = full ? (index + 0.5) / count : count > 1 ? index / (count - 1) : 0.5;
    const jitter = ((random() - 0.5) * spread) / Math.max(count, 1) / 2;
    const direction = (angle - spread / 2 + slot * spread + jitter) * DEG;
    const range = distance * (1 + (random() * 2 - 1) * variance);
    const speed =
      gravity > 0 ? launchSpeed(range, gravity, drag) : (range * drag) / Math.max(reach, 1e-6);

    particles.push({
      vx: Math.cos(direction) * speed,
      vy: Math.sin(direction) * speed,
      drag,
      gravity,
      life: life * (0.85 + random() * 0.3),
      size: size[0] + random() * (size[1] - size[0]),
      shape: shapes[Math.floor(random() * shapes.length)] ?? 'dot',
      color: Math.floor(random() * colors),
      rotation: random() * 360,
      spin: spin ? (random() * 2 - 1) * 2.5 : 0,
      flip: random() * Math.PI * 2,
    });
  }

  return particles;
}

/** Состояние частицы через `t` мс после всплеска; null — частица отжила */
export function particleAt(particle: Particle, t: number): ParticleState | null {
  if (t < 0 || t > particle.life) return null;

  const s = t / 1000;
  const k = particle.drag;
  const decay = 1 - Math.exp(-k * s);
  const fall = particle.gravity / k;
  const progress = t / particle.life;
  // Первые 40 % жизни частица яркая, дальше гаснет
  const alpha = progress < 0.4 ? 1 : Math.max(0, 1 - (progress - 0.4) / 0.6);

  return {
    x: (particle.vx / k) * decay,
    y: ((particle.vy - fall) / k) * decay + fall * s,
    alpha,
    scale: 1 - progress * 0.5,
    rotation: particle.rotation + particle.spin * 360 * s,
    flip: particle.spin ? Math.cos(particle.flip + s * Math.abs(particle.spin) * Math.PI * 2) : 1,
  };
}

/** Самая долгая жизнь во всплеске: после неё холст можно снимать */
export function burstDuration(particles: readonly Particle[]): number {
  return particles.reduce((longest, particle) => Math.max(longest, particle.life), 0);
}
