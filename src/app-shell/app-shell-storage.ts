import type { ShellState } from './app-shell-layout';

const PREFIX = 'haunt.app-shell.';

const isWidth = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * Сохранённое состояние поверх значений по умолчанию. Хранилище пишет кто угодно (другая версия,
 * руками в DevTools): негодное поле берётся из `fallback`, а не роняет оболочку.
 */
export function parseShellState(raw: string | null, fallback: ShellState): ShellState {
  if (!raw) return fallback;

  try {
    const value: unknown = JSON.parse(raw);

    if (typeof value !== 'object' || value === null) return fallback;

    const saved = value as Record<string, unknown>;

    return {
      sidebarWidth: isWidth(saved.sidebarWidth) ? saved.sidebarWidth : fallback.sidebarWidth,
      membersWidth: isWidth(saved.membersWidth) ? saved.membersWidth : fallback.membersWidth,
      sidebarCollapsed:
        typeof saved.sidebarCollapsed === 'boolean'
          ? saved.sidebarCollapsed
          : fallback.sidebarCollapsed,
      membersCollapsed:
        typeof saved.membersCollapsed === 'boolean'
          ? saved.membersCollapsed
          : fallback.membersCollapsed,
    };
  } catch {
    return fallback;
  }
}

export function readShellState(id: string, fallback: ShellState): ShellState {
  try {
    return parseShellState(localStorage.getItem(PREFIX + id), fallback);
  } catch {
    // localStorage недоступен (приватный режим, запрет куки) — состояние по умолчанию
    return fallback;
  }
}

export function writeShellState(id: string, state: ShellState): void {
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(state));
  } catch {
    // см. readShellState; переполненное хранилище — не повод ронять раскладку
  }
}
