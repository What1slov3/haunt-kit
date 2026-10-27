import type { Rgb } from '../../filtered-image/image-filters';

/*
 * Общий договор сцен фонов: хост (`fx-background.tsx`) владеет холстом, окружением, шиной и циклом
 * кадров, сцена — только рисует. Сцены грузятся через import(), этот модуль — одни типы.
 */

export type { Rgb };

/** Цвета из токенов темы и акцента — хост перечитывает их при смене темы, сцена не трогает DOM */
export interface SceneColors {
  bg: Rgb;
  /** Нейтральный цвет точек и линий (`--ambient-dot-color`) */
  ink: Rgb;
  accent: Rgb;
  accent2: Rgb;
  /** Второй и третий цвета пятен (`--ambient-2`, `--ambient-3`) */
  tint2: Rgb;
  tint3: Rgb;
  /** Прозрачность нейтральной сетки и акцентных частиц из токенов (`low` у AmbientBackground их снижает) */
  inkAlpha: number;
  accentAlpha: number;
  /** Тёмная тема: светлое на тёмном складывается светом, на «бумаге» — обычным наложением */
  dark: boolean;
  /** `--font-mono`: дождь рисует символы шрифтом кита */
  monoFont: string;
}

export interface ScenePointer {
  /** Координаты в CSS px внутри холста */
  x: number;
  y: number;
}

export interface SceneInput {
  pointer: ScenePointer | null;
  /** Множитель реакции: 0 — выкл, 0.55 — тихо, 1 — заметно (`reactionGain`) */
  gain: number;
  /** Уровень голоса 0…1 (для `waveform`); остальные сцены его не читают */
  level: number;
}

export interface ScenePulse extends ScenePointer {
  strength: number;
}

export interface BackgroundScene {
  /** Размер в CSS px и множитель плотности пикселей (уже ограниченный хостом) */
  resize(width: number, height: number, dpr: number): void;
  setColors(colors: SceneColors): void;
  /**
   * Кадр в момент `now` (мс), `dt` — мс с прошлого. false — нарисовать не удалось (проход шейдера
   * отказал): хост переключит фон на Canvas 2D.
   */
  frame(now: number, dt: number, input: SceneInput): boolean;
  /** Один кадр без движения — для `data-effects="off"`, reduced-motion и пути static */
  still(input: SceneInput): boolean;
  pulse?(pulse: ScenePulse, now: number): void;
  jump?(strength: number, now: number): void;
}

export interface SceneOptions {
  seed: number;
}
