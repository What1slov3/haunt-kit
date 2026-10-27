import { createContext, useContext } from 'react';

import type { ShellPanelMode } from './app-shell-layout';

export interface AppShellApi {
  /** Режим сайдбара; null — слота нет */
  sidebar: ShellPanelMode | null;
  members: ShellPanelMode | null;
  /** Открыт ли Sheet панели в узком окне */
  sidebarSheetOpen: boolean;
  membersSheetOpen: boolean;
  /** Свернуть / развернуть; в узком окне — открыть или закрыть Sheet */
  toggleSidebar: () => void;
  toggleMembers: () => void;
  /** Закрыть открытый Sheet — например, после выбора канала в узком окне */
  closeSheet: () => void;
}

export const AppShellContext = createContext<AppShellApi | null>(null);

/**
 * Управление оболочкой изнутри её слотов: кнопка «участники» в шапке, закрытие Sheet после выбора
 * канала. Вне AppShell — ошибка: кнопка без оболочки ничего бы не делала молча
 */
export function useAppShell(): AppShellApi {
  const api = useContext(AppShellContext);

  if (!api) throw new Error('useAppShell должен вызываться внутри AppShell');

  return api;
}
