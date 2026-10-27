import type { CSSProperties } from 'react';

import { ParticleLayer } from '../particles/particle-layer';
import { particlePresets } from '../particles/particle-presets';
import type { ParticleShape } from '../particles/particles';

export interface BurstProps {
  /** Смена значения на новое непустое (счётчик, ключ) — всплеск. Значение при монтировании не стреляет */
  fire: unknown;
  /** Сколько частиц */
  count?: number;
  /** Дальность разлёта, px */
  distance?: number;
  /** Направление (градусы, −90 — вверх) и сектор разлёта; 360 — во все стороны */
  angle?: number;
  spread?: number;
  /** Размер частиц, px */
  size?: number;
  shape?: ParticleShape;
  /** Длительность, мс */
  duration?: number;
  /** Точка всплеска в долях родителя */
  origin?: readonly [number, number];
  /** Цвета: токены (`--accent`) или CSS-цвета; частицы чередуют их */
  colors?: readonly string[];
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_COLORS = ['--accent-text', '--accent-2'] as const;
const CENTER = [0.5, 0.5] as const;

/**
 * Всплеск частиц из точки родителя (так всплёскивает `Chip`). Кладётся внутрь элемента с
 * `position: relative`; стреляет при смене `fire`. Холст на время всплеска, общий цикл кадров.
 * `data-effects="off"` и reduced-motion — без всплеска.
 */
export function Burst({
  fire,
  count = 8,
  distance = 30,
  angle = -90,
  spread = 360,
  size = 4,
  shape = 'dot',
  duration = 640,
  origin = CENTER,
  colors = DEFAULT_COLORS,
  className,
  style,
}: BurstProps) {
  return (
    <ParticleLayer
      fire={fire}
      options={{
        ...particlePresets.burst,
        count,
        distance,
        angle,
        spread,
        life: duration,
        size: [size * 0.8, size * 1.2],
        shapes: [shape],
      }}
      colors={colors}
      origin={origin}
      reach={Math.ceil(distance * 1.3 + size * 2)}
      className={className}
      style={style}
    />
  );
}
