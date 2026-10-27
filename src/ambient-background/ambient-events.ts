/**
 * Шина событий живого фона. Компоненты и экраны сообщают о действии (`ambient.pulse(x, y)` на отправку
 * сообщения), не зная, какой фон сейчас включён и есть ли он вообще. Фон подписывается и реагирует
 * в меру своего `reaction`.
 */

/** Уровень реакции фона на действия пользователя: выкл / тихо / заметно */
export type AmbientReaction = 'off' | 'quiet' | 'vivid';

export interface AmbientPulse {
  /** Координаты во вьюпорте (clientX / clientY) */
  x: number;
  y: number;
  /** 0–1; 1 — отправка сообщения, 0.4 — обычный клик */
  strength: number;
}

type PulseListener = (pulse: AmbientPulse) => void;

const listeners = new Set<PulseListener>();
const jumpListeners = new Set<(strength: number) => void>();
const levelListeners = new Set<(level: number) => void>();
// Последний уровень помнится: фон, смонтированный посреди разговора, сразу видит голос
let currentLevel = 0;

export const ambient = {
  /** Короткая волна от точки действия */
  pulse(x: number, y: number, strength = 1): void {
    for (const listener of listeners) listener({ x, y, strength });
  },

  /** То же, но от центра элемента — удобно из обработчика кнопки */
  pulseFrom(element: Element, strength = 1): void {
    const rect = element.getBoundingClientRect();

    ambient.pulse(rect.left + rect.width / 2, rect.top + rect.height / 2, strength);
  },

  subscribe(listener: PulseListener): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },

  /** «Прыжок» — переход между пространствами: звёздное поле разгоняется, остальные фоны молчат */
  jump(strength = 1): void {
    for (const listener of jumpListeners) listener(strength);
  },

  onJump(listener: (strength: number) => void): () => void {
    jumpListeners.add(listener);

    return () => {
      jumpListeners.delete(listener);
    };
  },

  /**
   * Уровень голоса 0…1 для фона `waveform`. Источник — решение приложения (уровень говорящего из
   * LiveKit); вызывать можно на каждом кадре анализатора, фон сам сглаживает.
   */
  level(value: number): void {
    currentLevel = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

    for (const listener of levelListeners) listener(currentLevel);
  },

  currentLevel(): number {
    return currentLevel;
  },

  onLevel(listener: (level: number) => void): () => void {
    levelListeners.add(listener);

    return () => {
      levelListeners.delete(listener);
    };
  },
};

/** Множитель силы эффектов по уровню реакции */
export const reactionGain: Record<AmbientReaction, number> = { off: 0, quiet: 0.55, vivid: 1 };
