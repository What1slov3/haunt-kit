/*
 * Скелет раскладки AppShell — чистыми функциями: какие панели стоят в раскладке, какие свёрнуты, какие
 * уходят в Sheet при данной ширине. Компонент только меряет ширину и рисует по ответу.
 */

import type { PanelSize } from '../resizable/resizable-math';

/**
 * docked — панель в раскладке; collapsed — человек свернул её, место отдано контенту; overlay — окно
 * слишком узкое, панель открывается поверх в Sheet
 */
export type ShellPanelMode = 'docked' | 'collapsed' | 'overlay';

export interface ShellBreakpoints {
  /** Уже этой ширины (px) участники уходят в Sheet */
  members: number;
  /** Уже этой ширины (px) сайдбар сворачивается и открывается в Sheet */
  sidebar: number;
}

/** Как у витрины-мессенджера: участники уходят первыми — без них чат читается, без каналов — нет */
export const defaultShellBreakpoints: ShellBreakpoints = { members: 1100, sidebar: 760 };

export interface ShellLayoutInput {
  /** Ширина оболочки; 0 — ещё не измерена, считается широкой: без мигания Sheet на первом кадре */
  width: number;
  breakpoints: ShellBreakpoints;
  hasSidebar: boolean;
  hasMembers: boolean;
  sidebarCollapsed: boolean;
  membersCollapsed: boolean;
}

/** null — слота нет вовсе */
export interface ShellLayout {
  sidebar: ShellPanelMode | null;
  members: ShellPanelMode | null;
}

function panelMode(present: boolean, narrow: boolean, collapsed: boolean): ShellPanelMode | null {
  if (!present) return null;
  if (narrow) return 'overlay';

  return collapsed ? 'collapsed' : 'docked';
}

export function shellLayout({
  width,
  breakpoints,
  hasSidebar,
  hasMembers,
  sidebarCollapsed,
  membersCollapsed,
}: ShellLayoutInput): ShellLayout {
  const measured = width > 0;

  return {
    sidebar: panelMode(hasSidebar, measured && width < breakpoints.sidebar, sidebarCollapsed),
    members: panelMode(hasMembers, measured && width < breakpoints.members, membersCollapsed),
  };
}

/** Что делает кнопка «показать / скрыть панель» в данном режиме */
export function toggleAction(mode: ShellPanelMode | null): 'collapse' | 'expand' | 'sheet' | null {
  if (mode === 'docked') return 'collapse';
  if (mode === 'collapsed') return 'expand';
  if (mode === 'overlay') return 'sheet';

  return null;
}

/** Ширины и свёрнутость панелей — то, что переживает перезагрузку */
export interface ShellState {
  sidebarWidth: number;
  membersWidth: number;
  sidebarCollapsed: boolean;
  membersCollapsed: boolean;
}

export interface ShellPanelIndexes {
  sidebar: number;
  members: number;
}

const pixels = (size: PanelSize | undefined): number | null =>
  typeof size === 'string' && size.endsWith('px') ? Number.parseFloat(size) : null;

/**
 * Жест на ручке закончен: раскладка Resizable (пиксельные панели — в px) → новое состояние оболочки.
 * Свёрнутая до нуля (перетаскиванием или двойным кликом) панель становится `collapsed`, а ширина остаётся
 * прежней — в неё панель развернётся. Индекс -1 — панели нет в раскладке.
 */
export function applyResize(
  state: ShellState,
  layout: readonly PanelSize[],
  indexes: ShellPanelIndexes,
): ShellState {
  const next = { ...state };
  const sidebar = indexes.sidebar >= 0 ? pixels(layout[indexes.sidebar]) : null;
  const members = indexes.members >= 0 ? pixels(layout[indexes.members]) : null;

  if (sidebar !== null) {
    if (sidebar <= 0) next.sidebarCollapsed = true;
    else next.sidebarWidth = sidebar;
  }

  if (members !== null) {
    if (members <= 0) next.membersCollapsed = true;
    else next.membersWidth = members;
  }

  return next;
}

/** Ширина в границах панели: сохранённая в другой версии приложения могла выйти за новые min / max */
export function clampWidth(width: number, min: number, max: number): number {
  return Math.min(Math.max(width, min), Math.max(min, max));
}
