import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type CSSProperties,
} from 'react';

import { cx } from '../../../lib/cx';
import { radiusVar, type Radius } from '../../../lib/space';
import { useFxEnvironment } from '../../use-fx-environment';

import { antsDash, roundedRectPerimeter } from './ants';
import styles from './marching-ants.module.css';

export interface MarchingAntsProps extends ComponentPropsWithRef<'div'> {
  /** Рамка видна и бежит; false — обычный блок */
  active?: boolean;
  /** Скругление содержимого: рамка скругляется концентрично, на вынос `offset` */
  radius?: Radius;
  /** Вынос рамки наружу, px */
  offset?: number;
  /** Штрих и промежуток, px (подгоняются под периметр) */
  dash?: number;
  gap?: number;
  /** Толщина линии, px */
  strokeWidth?: number;
  /** Один шаг пунктира, мс: меньше — быстрее */
  speed?: number;
  /** Цвет: токен (`--accent-text`) или CSS-цвет */
  color?: string;
}

interface Box {
  width: number;
  height: number;
  radius: number;
}

/**
 * Бегущий пунктир вокруг содержимого — выделение, зона броска. Рамка — SVG поверх, вынесена на `offset`
 * и скруглена концентрично: радиус = радиус содержимого + вынос (формула в CSS, SVG читает его
 * пикселями). Пунктир подогнан под периметр — без шва. `data-effects="off"` и reduced-motion — рамка
 * стоит.
 */
export function MarchingAnts({
  active = true,
  radius = 'lg',
  offset = 3,
  dash = 5,
  gap = 4,
  strokeWidth = 1.5,
  speed = 450,
  color = '--accent-text',
  className,
  style,
  children,
  ...rest
}: MarchingAntsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { motion } = useFxEnvironment(rootRef);
  const [box, setBox] = useState<Box | null>(null);

  useLayoutEffect(() => {
    const svg = svgRef.current;

    if (!active || !svg) return;

    const measure = () => {
      const rect = svg.getBoundingClientRect();
      const next = {
        width: rect.width,
        height: rect.height,
        radius: Number.parseFloat(getComputedStyle(svg).borderTopLeftRadius) || 0,
      };

      setBox((current) =>
        current &&
        current.width === next.width &&
        current.height === next.height &&
        current.radius === next.radius
          ? current
          : next,
      );
    };

    measure();

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(measure);

    observer.observe(svg);

    return () => observer.disconnect();
  }, [active, radius, offset]);

  // Линия по центру штриха: прямоугольник внутри на половину толщины, радиус — тоже
  const innerWidth = box ? Math.max(0, box.width - strokeWidth) : 0;
  const innerHeight = box ? Math.max(0, box.height - strokeWidth) : 0;
  /*
   * Радиус не больше половины меньшей стороны и одинаковый по осям (rx = ry): `radius="full"` приходит
   * из CSS как 999px, а SVG урезает rx и ry порознь — до половины ширины и высоты, — и вокруг вытянутого
   * блока выходил эллипс вместо капсулы
   */
  const inner = box && {
    width: innerWidth,
    height: innerHeight,
    radius: Math.max(0, Math.min(box.radius - strokeWidth / 2, innerWidth / 2, innerHeight / 2)),
  };
  const pattern = inner
    ? antsDash(roundedRectPerimeter(inner.width, inner.height, inner.radius), dash, gap)
    : null;

  return (
    <div
      ref={rootRef}
      className={cx(styles.root, className)}
      data-static={motion ? undefined : ''}
      style={
        {
          '--ants-radius': radiusVar(radius),
          '--ants-offset': `${offset}px`,
          '--ants-speed': `${speed}ms`,
          '--ants-color': color.startsWith('--') ? `var(${color})` : color,
          ...style,
        } as CSSProperties
      }
      {...rest}
    >
      {children}

      {active && (
        <svg ref={svgRef} className={styles.ants} aria-hidden>
          {inner && pattern && (
            <rect
              className={styles.line}
              x={strokeWidth / 2}
              y={strokeWidth / 2}
              width={inner.width}
              height={inner.height}
              rx={inner.radius}
              ry={inner.radius}
              strokeWidth={strokeWidth}
              strokeDasharray={`${pattern.dash} ${pattern.gap}`}
              style={{ '--ants-period': `${pattern.period}px` } as CSSProperties}
            />
          )}
        </svg>
      )}
    </div>
  );
}
