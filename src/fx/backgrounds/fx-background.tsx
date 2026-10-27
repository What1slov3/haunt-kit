import { useEffect, useRef, useState, type ComponentPropsWithRef } from 'react';

import {
  ambient,
  reactionGain,
  type AmbientReaction,
} from '../../ambient-background/ambient-events';
import { luminance } from '../../filtered-image/image-filters';
import { readColors } from '../../filtered-image/read-palette';
import { cx } from '../../lib/cx';
import type { FxRenderer } from '../environment';
import { pickRenderer } from '../renderer';
import { schedule, type FxHandle } from '../scheduler';
import { useFxEnvironment } from '../use-fx-environment';
import { detectWebgl2, isWebglUsable, onWebglStateChange } from '../webgl/support';
import { assignRef } from '../../lib/assign-ref';

import styles from './fx-background.module.css';
import type { BackgroundScene, SceneColors, SceneInput } from './scene';
import {
  BACKGROUND_FPS,
  backgroundStrategy,
  canvasScenes,
  loadGlScenes,
  type FxBackgroundVariant,
} from './variants';

export interface FxBackgroundProps extends Omit<ComponentPropsWithRef<'canvas'>, 'children'> {
  variant: FxBackgroundVariant;
  /** Реакция на курсор, клики и шину `ambient`: выкл / тихо / заметно */
  reaction?: AmbientReaction;
  /** Уровень голоса 0…1 для `waveform`; без пропа — последнее значение `ambient.level()` */
  level?: number;
  /** Раскладка (звёзды, частицы, клетки): одинаковый seed — одинаковая картинка */
  seed?: number;
}

const FALLBACK: [number, number, number] = [128, 128, 128];
const TOKENS = [
  '--bg',
  '--ambient-dot-color',
  '--accent',
  '--accent-2',
  '--ambient-2',
  '--ambient-3',
];
const CLICK_STRENGTH = 0.35;

/** Цвета из токенов на родителе холста: так фон видит акцент AccentScope и тему ThemeScope */
function readSceneColors(element: Element): SceneColors {
  const [bg, ink, accent, accent2, tint2, tint3] = readColors(element, TOKENS, FALLBACK);
  const style = getComputedStyle(element);
  const number = (name: string, fallback: number) => {
    const value = Number.parseFloat(style.getPropertyValue(name));

    return Number.isNaN(value) ? fallback : value;
  };

  return {
    bg: bg!,
    ink: ink!,
    accent: accent!,
    accent2: accent2!,
    tint2: tint2!,
    tint3: tint3!,
    inkAlpha: number('--ambient-dot-alpha', 0.08),
    accentAlpha: number('--ambient-particle-alpha', 0.6),
    dark: luminance(...bg!) < 0.5,
    monoFont: style.getPropertyValue('--font-mono').trim() || 'monospace',
  };
}

interface Control {
  scene: BackgroundScene;
  still: boolean;
  repaint(): void;
}

/**
 * Живой фон на холсте: `flow`, `contour`, `rain`, `constellation`, `radar`, `waveform`, `hex`,
 * `life`, `mesh`, `starfield`. Хост выбирает путь рендера (`pickRenderer`: WebGL2 только у фонов, где
 * шейдер честно нужен), грузит сцену через import(), ведёт её в общем цикле кадров (`fx/scheduler`) и
 * передаёт ей курсор и шину `ambient`. `data-effects="off"`, reduced-motion и путь `static` — один
 * неподвижный кадр. Тема и акцент перекрашивают фон без перезапуска сцены.
 *
 * Холст заполняет ближайшего позиционированного родителя; под экран — через `AmbientBackground variant`.
 */
export function FxBackground({
  variant,
  reaction = 'quiet',
  level,
  seed = 7,
  className,
  ref,
  ...rest
}: FxBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controlRef = useRef<Control | null>(null);
  const gainRef = useRef(reactionGain[reaction]);
  const levelRef = useRef(level);
  const [used, setUsed] = useState<FxRenderer | null>(null);
  const [moving, setMoving] = useState(false);
  const [painted, setPainted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [glVersion, setGlVersion] = useState(0);
  const [signalVersion, setSignalVersion] = useState(0);
  const { motion, renderer: forced, themeVersion } = useFxEnvironment(canvasRef);
  const hasGl = backgroundStrategy(variant).webgl !== undefined;

  const setCanvas = (node: HTMLCanvasElement | null) => {
    canvasRef.current = node;

    assignRef(ref, node);
  };

  useEffect(() => {
    gainRef.current = reactionGain[reaction];
  }, [reaction]);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  // Потеря и восстановление общего WebGL-контекста: фон уходит на Canvas 2D и возвращается
  useEffect(() => {
    if (!hasGl) return;

    return onWebglStateChange(() => {
      setFailed(false);
      setGlVersion((version) => version + 1);
    });
  }, [hasGl]);

  // Акцент стиля «сигнал» ставится атрибутами, которых не видит observeFxEnvironment
  useEffect(() => {
    const observer = new MutationObserver(() => setSignalVersion((version) => version + 1));

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-style', 'data-signal-accent'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const control = controlRef.current;
    const canvas = canvasRef.current;

    if (!control || !canvas) return;

    control.scene.setColors(readSceneColors(canvas.parentElement ?? canvas));

    if (control.still) control.repaint();
  }, [themeVersion, signalVersion]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const strategy = backgroundStrategy(variant);
    // Детект создаёт WebGL-контекст — только у фонов с шейдером
    const picked = pickRenderer(strategy, {
      override: forced,
      support: hasGl ? detectWebgl2() : 'none',
      webglUsable: hasGl && isWebglUsable(),
    });
    const path: FxRenderer = picked === 'webgl' && failed ? 'canvas' : picked;
    const still = !motion || path === 'static';
    const cleanups: (() => void)[] = [];
    let pointer: { x: number; y: number } | null = null;
    let handle: FxHandle | null = null;
    let cancelled = false;
    let didPaint = false;

    const input = (): SceneInput => ({
      pointer,
      gain: gainRef.current,
      level: levelRef.current ?? ambient.currentLevel(),
    });

    const markPainted = () => {
      if (didPaint) return;

      didPaint = true;
      setPainted(true);
    };

    const run = async () => {
      let scene: BackgroundScene;

      if (path === 'webgl') {
        const { createGlScene } = await loadGlScenes();

        scene = createGlScene(variant as Parameters<typeof createGlScene>[0], canvas, { seed });
      } else {
        const { createScene } = await canvasScenes[variant]();

        scene = createScene(canvas, { seed });
      }

      if (cancelled) return;

      const toLocal = (clientX: number, clientY: number) => {
        const rect = canvas.getBoundingClientRect();

        return { x: clientX - rect.left, y: clientY - rect.top };
      };

      const repaint = () => {
        if (scene.still(input())) markPainted();
        else setFailed(true);
      };

      const fit = () => {
        const rect = canvas.getBoundingClientRect();

        if (rect.width < 1 || rect.height < 1) return false;

        scene.resize(rect.width, rect.height, Math.min(window.devicePixelRatio || 1, 2));

        return true;
      };

      scene.setColors(readSceneColors(canvas.parentElement ?? canvas));
      controlRef.current = { scene, still, repaint };
      setUsed(path);
      setMoving(!still);

      const resizeObserver = new ResizeObserver(() => {
        if (fit() && still) repaint();
      });

      resizeObserver.observe(canvas);
      cleanups.push(() => resizeObserver.disconnect());

      if (fit() && still) repaint();

      if (still) return;

      handle = schedule(
        {
          frame: (now, dt) => {
            if (canvas.width < 1) return;

            if (scene.frame(now, dt, input())) markPainted();
            else setFailed(true);
          },
        },
        { element: canvas, fps: BACKGROUND_FPS[variant] },
      );

      const onPointerMove = (event: PointerEvent) => {
        pointer = toLocal(event.clientX, event.clientY);
      };

      const onPointerLeave = () => {
        pointer = null;
      };

      const pulse = (x: number, y: number, strength: number) => {
        const gain = gainRef.current;

        if (gain > 0)
          scene.pulse?.({ ...toLocal(x, y), strength: strength * gain }, performance.now());
      };

      // Обычный клик — тихая волна; сильную шлют сами компоненты через ambient.pulse
      const onPointerDown = (event: PointerEvent) =>
        pulse(event.clientX, event.clientY, CLICK_STRENGTH);

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerdown', onPointerDown, { passive: true });
      document.documentElement.addEventListener('pointerleave', onPointerLeave);
      cleanups.push(
        () => window.removeEventListener('pointermove', onPointerMove),
        () => window.removeEventListener('pointerdown', onPointerDown),
        () => document.documentElement.removeEventListener('pointerleave', onPointerLeave),
        ambient.subscribe((event) => pulse(event.x, event.y, event.strength)),
        // Прыжок — не реакция на действие, а переход: идёт и при reaction="off"
        ambient.onJump((strength) => scene.jump?.(strength, performance.now())),
      );
    };

    void run();

    return () => {
      cancelled = true;
      handle?.cancel();

      for (const cleanup of cleanups) cleanup();

      controlRef.current = null;
    };
  }, [variant, seed, motion, forced, hasGl, failed, glVersion]);

  return (
    <canvas
      ref={setCanvas}
      aria-hidden
      className={cx(styles.canvas, className)}
      data-background={variant}
      data-renderer={used ?? undefined}
      data-painted={painted ? '' : undefined}
      data-moving={moving ? '' : undefined}
      {...rest}
    />
  );
}
