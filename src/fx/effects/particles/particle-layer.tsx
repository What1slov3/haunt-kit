import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { readColors } from '../../../filtered-image/read-palette';
import { cx } from '../../../lib/cx';
import { schedule, type FxHandle } from '../../scheduler';
import { useFxEnvironment } from '../../use-fx-environment';

import styles from './particle-layer.module.css';
import type { Particle, ParticleOptions, ParticleState } from './particles';

export type ParticleLayerOptions = Omit<ParticleOptions, 'seed' | 'colors'>;

export interface ParticleLayerProps {
  /** Смена значения на новое непустое — всплеск. Значение при монтировании не стреляет */
  fire: unknown;
  options: ParticleLayerOptions;
  /** Цвета: токен (`--accent`) или любой CSS-цвет */
  colors: readonly string[];
  /** Точка всплеска в долях родителя: [0.5, 0.5] — центр */
  origin: readonly [number, number];
  /** Насколько холст выходит за родителя, px: частицам есть куда лететь */
  reach: number;
  className?: string;
  style?: CSSProperties;
}

type ParticleAt = (particle: Particle, t: number) => ParticleState | null;

interface Shot {
  particles: Particle[];
  colors: string[];
  /** Точка всплеска на холсте, CSS px */
  x: number;
  y: number;
  /** Время первого кадра; 0 — ещё не начат */
  start: number;
  life: number;
}

const isFire = (value: unknown) =>
  value !== undefined && value !== null && value !== false && value !== 0 && value !== '';

/**
 * Холст частиц поверх родителя (ему нужен position: relative). Холст живёт, только пока летят частицы:
 * в покое в DOM пустой span. Кадры — общий цикл `fx/scheduler`, ядро — import() при первом всплеске.
 * При `data-effects="off"` и reduced-motion всплеска нет: итоговое состояние у частиц — «ничего».
 */
export function ParticleLayer({
  fire,
  options,
  colors,
  origin,
  reach,
  className,
  style,
}: ParticleLayerProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shotsRef = useRef<Shot[]>([]);
  const taskRef = useRef<FxHandle | null>(null);
  const { motion } = useFxEnvironment(rootRef);
  const [previousFire, setPreviousFire] = useState(fire);
  const [shot, setShot] = useState(0);
  const [live, setLive] = useState(false);
  // Параметры читаются в момент выстрела: смена пропов посреди всплеска его не перезапускает
  const latest = useRef({ options, colors, origin, reach });

  // Всплеск — реакция на смену пропа, а не на клик: его может вызвать и клавиатура, и сервер
  if (fire !== previousFire) {
    setPreviousFire(fire);

    if (isFire(fire)) setShot((count) => count + 1);
  }

  useEffect(() => {
    latest.current = { options, colors, origin, reach };
  });

  useEffect(() => {
    const root = rootRef.current;

    if (!shot || !motion || !root) return;

    let cancelled = false;

    void import('./particles').then(({ createParticles, particleAt, burstDuration }) => {
      if (cancelled) return;

      const { options: current, colors: palette, origin: point, reach: margin } = latest.current;
      // seed — номер выстрела: соседние всплески разные, а один и тот же повторяем на скриншотах
      const particles = createParticles({ ...current, colors: palette.length, seed: shot });

      shotsRef.current.push({
        particles,
        colors: readColors(root, palette, [255, 255, 255]).map((rgb) => `rgb(${rgb.join(' ')})`),
        x: margin + point[0] * (root.clientWidth - margin * 2),
        y: margin + point[1] * (root.clientHeight - margin * 2),
        start: 0,
        life: burstDuration(particles),
      });
      setLive(true);

      taskRef.current ??= schedule(
        {
          frame: (now) => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');

            // Кадр пришёл раньше коммита React с холстом — ждём следующего
            if (!canvas || !ctx) return;

            if (drawShots(ctx, canvas, root, shotsRef.current, now, particleAt)) return;

            shotsRef.current = [];
            taskRef.current?.cancel();
            taskRef.current = null;
            setLive(false);
          },
        },
        { element: root },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [shot, motion]);

  useEffect(
    () => () => {
      taskRef.current?.cancel();
      taskRef.current = null;
    },
    [],
  );

  return (
    <span
      ref={rootRef}
      aria-hidden
      className={cx(styles.layer, className)}
      data-live={live ? '' : undefined}
      style={{ '--particle-reach': `${reach}px`, ...style } as CSSProperties}
    >
      {live && <canvas ref={canvasRef} className={styles.canvas} />}
    </span>
  );
}

/** Кадр всех всплесков холста; false — все частицы отжили, холст можно снимать */
function drawShots(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  root: HTMLElement,
  shots: Shot[],
  now: number,
  particleAt: ParticleAt,
): boolean {
  const scale = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(root.clientWidth * scale));
  const height = Math.max(1, Math.round(root.clientHeight * scale));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);

  for (const shot of shots) {
    shot.start ||= now;

    const t = now - shot.start;

    for (const particle of shot.particles) {
      const state = particleAt(particle, t);

      if (!state) continue;

      const size = particle.size * state.scale;

      ctx.globalAlpha = state.alpha;
      ctx.fillStyle = shot.colors[particle.color] ?? shot.colors[0] ?? 'white';
      ctx.setTransform(scale, 0, 0, scale, (shot.x + state.x) * scale, (shot.y + state.y) * scale);

      if (particle.shape === 'dot') {
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (particle.shape === 'spark') {
        // Искра вытянута по направлению полёта
        ctx.rotate(Math.atan2(particle.vy, particle.vx));
        ctx.fillRect(-size, -0.75, size * 2, 1.5);
      } else {
        ctx.rotate((state.rotation * Math.PI) / 180);
        ctx.scale(1, state.flip);
        ctx.fillRect(-size / 2, -size * 0.3, size, size * 0.6);
      }
    }
  }

  ctx.globalAlpha = 1;

  const alive = shots.filter((shot) => !shot.start || now - shot.start <= shot.life);

  shots.splice(0, shots.length, ...alive);

  return alive.length > 0;
}
