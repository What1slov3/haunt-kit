import type * as Engine from './engine';
import { createLimiter, type Limiter, type LimitReason } from './limiter';
import { isAudible, LEVEL_GAIN, readSoundLevel, type SoundLevel } from './level';
import {
  soundDuration,
  SOUNDS,
  type SoundCategory,
  type SoundName,
  type SoundSpec,
} from './sounds';

/*
 * Публичный API звуков: `sound.play('send')`. Лёгкая часть — решение «играть ли» (уровень, жест,
 * прореживание) синхронно; Web Audio — в чанке `engine.ts` через import(). Кит сам звуки не
 * включает: какой компонент звучит — решает приложение.
 */

export interface PlayOptions {
  /**
   * Ключ своего звука для прореживания и событий `onPlay`: `'join:maria'`. Встроенным звукам не нужен —
   * ключ у них имя; свой без ключа считается одним звуком `'custom'`
   */
  id?: string;
  /** Чей `data-sound` читать: ближайший предок элемента; без элемента — <html> */
  element?: Element | null;
  /** Громкость вызова 0…1 поверх уровня */
  volume?: number;
  /** Остановить звук раньше конца — с коротким спадом. Нужен мотивам: человек ушёл с экрана */
  signal?: AbortSignal;
}

export type PlayResult = 'played' | 'off' | 'quiet' | 'no-gesture' | 'unsupported' | LimitReason;

export interface PlayEvent {
  /** Имя встроенного звука или `id` своего */
  name: SoundName | (string & {});
  level: SoundLevel;
  result: PlayResult;
}

/*
 * Мотивы прореживаются отдельно: трёхсекундная награда не должна занимать голоса щелчков, а щелчки —
 * мешать мотиву. Мотивов разом не больше двух: третий поверх уже каша
 */
const limiters: Record<SoundCategory, Limiter> = {
  ui: createLimiter(),
  motif: createLimiter({ maxVoices: 2, maxPerSecond: 3 }),
};
const listeners = new Set<(event: PlayEvent) => void>();
let engine: Promise<typeof Engine> | null = null;

const loadEngine = () => (engine ??= import('./engine'));

const clock = () => (typeof performance === 'undefined' ? Date.now() : performance.now());

/*
 * Жест пользователя: AudioContext до первого клика или клавиши браузер не запустит. Где есть
 * UserActivation API — спрашиваем его; где нет — считаем, что звук вызван из обработчика жеста.
 */
function hasGesture(): boolean {
  const activation = typeof navigator === 'undefined' ? undefined : navigator.userActivation;

  return activation ? activation.hasBeenActive : true;
}

function emit(event: PlayEvent): PlayResult {
  for (const listener of listeners) listener(event);

  return event.result;
}

export const sound = {
  /**
   * Сыграть звук интерфейса: встроенный по имени или свой, описанный данными (`SoundSpec` — голоса,
   * огибающие, фильтры, эффекты; так задаётся свой мотив входа в голос или награда — `category: 'motif'`,
   * до 3 с, остановка через `signal`). Возвращает решение сразу (сам звук — после загрузки движка, при
   * первом вызове это несколько миллисекунд). Ошибки не бросает: звук — украшение.
   */
  play(sound: SoundName | SoundSpec, options: PlayOptions = {}): PlayResult {
    const level = readSoundLevel(options.element);
    const spec = typeof sound === 'string' ? SOUNDS[sound] : sound;
    const name = typeof sound === 'string' ? sound : (options.id ?? 'custom');

    if (level === 'off') return emit({ name, level, result: 'off' });

    if (!isAudible(level, spec.minLevel)) return emit({ name, level, result: 'quiet' });

    if (!hasGesture()) return emit({ name, level, result: 'no-gesture' });

    const now = clock();
    const limiter = limiters[spec.category ?? 'ui'];
    const allowed = limiter.take(name, now, soundDuration(spec) * 1000, spec.minInterval);

    if (allowed !== true) return emit({ name, level, result: allowed });

    const gain = LEVEL_GAIN[level] * Math.min(1, Math.max(0, options.volume ?? 1));

    void loadEngine()
      .then((module) => {
        if (!module.playNow(sound, gain, options.signal)) {
          emit({ name, level, result: 'unsupported' });
        }
      })
      .catch(() => undefined);

    options.signal?.addEventListener('abort', () => limiter.release(name, clock()), {
      once: true,
    });

    return emit({ name, level, result: 'played' });
  },

  /** Остановить всё, что звучит, с коротким спадом; движок не загружен — звучать и нечему */
  stopAll(): void {
    void engine?.then((module) => module.stopAll()).catch(() => undefined);
  },

  /** Уровень звука у элемента (ближайший `[data-sound]`) или у <html> */
  level(element?: Element | null): SoundLevel {
    return readSoundLevel(element);
  },

  /** Поставить уровень атрибутом `data-sound`; по умолчанию — на <html> */
  setLevel(level: SoundLevel, target?: HTMLElement): void {
    const element = target ?? document.documentElement;

    element.dataset.sound = level;

    // Выключили звук — мотивы и хвосты эха не доигрывают
    if (level === 'off') sound.stopAll();
  },

  /** Загрузить движок заранее (без AudioContext): первый звук не ждёт чанк */
  preload(): Promise<void> {
    return loadEngine().then(() => undefined);
  },

  /** Решения о каждом звуке — для отладки, аналитики и тестов в headless, где звука не слышно */
  onPlay(listener: (event: PlayEvent) => void): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
};
