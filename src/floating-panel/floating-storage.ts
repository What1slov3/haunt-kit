import type { AnchorEdge, Placement, Size } from './floating-geometry';

const PREFIX = 'haunt.floating-panel.';

export interface FloatingState {
  placement: Placement;
  size: Size;
  collapsed: boolean;
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isAnchor = (value: unknown): value is AnchorEdge =>
  value === null || value === 'start' || value === 'end';

/**
 * Сохранённое место и размер. Хранилище пишет кто угодно (другая версия, DevTools): всё, что не похоже на
 * состояние панели, — как будто ничего нет; в окно его всё равно вернёт resolvePlacement
 */
export function parseFloatingState(raw: string | null): FloatingState | null {
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<Record<string, unknown>> | null;
    const placement = value?.placement as Partial<Record<string, unknown>> | undefined;
    const size = value?.size as Partial<Record<string, unknown>> | undefined;

    if (
      !placement ||
      !size ||
      !isNumber(placement.x) ||
      !isNumber(placement.y) ||
      !isAnchor(placement.anchorX) ||
      !isAnchor(placement.anchorY) ||
      !isNumber(size.width) ||
      !isNumber(size.height) ||
      size.width <= 0 ||
      size.height <= 0
    ) {
      return null;
    }

    return {
      placement: {
        x: placement.x,
        y: placement.y,
        anchorX: placement.anchorX,
        anchorY: placement.anchorY,
      },
      size: { width: size.width, height: size.height },
      collapsed: value?.collapsed === true,
    };
  } catch {
    return null;
  }
}

export function readFloatingState(id: string): FloatingState | null {
  try {
    return parseFloatingState(localStorage.getItem(PREFIX + id));
  } catch {
    // localStorage недоступен (приватный режим) — место по умолчанию
    return null;
  }
}

export function writeFloatingState(id: string, state: FloatingState): void {
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(state));
  } catch {
    // см. readFloatingState
  }
}
