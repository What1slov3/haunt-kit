import type { CSSProperties } from 'react';

import { ParticleLayer } from '../particles/particle-layer';
import { particlePresets } from '../particles/particle-presets';

export interface ConfettiProps {
  /** Смена значения на новое непустое (уровень, счётчик) — залп. Значение при монтировании не стреляет */
  fire: unknown;
  /** Сколько бумажек */
  count?: number;
  /** Сила залпа — высота подъёма без гравитации, px */
  power?: number;
  /** Направление (градусы, −90 — вверх) и ширина конуса */
  angle?: number;
  spread?: number;
  /** Длительность, мс */
  duration?: number;
  /** Точка залпа в долях родителя: по умолчанию — середина верхнего края */
  origin?: readonly [number, number];
  /** Насколько залп выходит за элемент, px: дальше бумажки обрезаются — конфетти локальное */
  reach?: number;
  colors?: readonly string[];
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_COLORS = ['--accent', '--accent-2', '--success', '--warning', '--info'] as const;
const TOP_CENTER = [0.5, 0.2] as const;

/**
 * Конфетти из элемента, не на весь экран: залп вверх конусом, бумажки кувыркаются и падают в пределах
 * `reach` вокруг родителя (ему нужен `position: relative`). Повышение уровня, первая награда.
 * `data-effects="off"` и reduced-motion — без залпа.
 */
export function Confetti({
  fire,
  count = 36,
  power = 110,
  angle = -90,
  spread = 70,
  duration = 1500,
  origin = TOP_CENTER,
  reach = 140,
  colors = DEFAULT_COLORS,
  className,
  style,
}: ConfettiProps) {
  return (
    <ParticleLayer
      fire={fire}
      options={{
        ...particlePresets.confetti,
        count,
        distance: power,
        angle,
        spread,
        life: duration,
      }}
      colors={colors}
      origin={origin}
      reach={reach}
      className={className}
      style={style}
    />
  );
}
