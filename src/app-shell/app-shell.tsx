import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
  type Ref,
} from 'react';

import { VisuallyHidden } from 'radix-ui';

import { cx } from '../lib/cx';
import { Resizable } from '../resizable/resizable';
import type { PanelSize } from '../resizable/resizable-math';
import { Sheet } from '../sheet/sheet';
import { useUiStrings } from '../strings/ui-strings-context';

import { AppShellContext, type AppShellApi } from './app-shell-context';
import {
  applyResize,
  clampWidth,
  defaultShellBreakpoints,
  shellLayout,
  toggleAction,
  type ShellBreakpoints,
  type ShellState,
} from './app-shell-layout';
import { readShellState, writeShellState } from './app-shell-storage';
import styles from './app-shell.module.css';

export interface AppShellProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Рейл пространств слева: постоянной ширины, не тянется и не сворачивается */
  rail?: ReactNode;
  /** Список каналов: тянется ручкой, сворачивается, в узком окне — Sheet слева */
  sidebar?: ReactNode;
  /** Участники справа: тянутся, сворачиваются, в узком окне — Sheet справа */
  members?: ReactNode;
  /** Над всей оболочкой — `TitleBar` десктопа */
  top?: ReactNode;
  /** Шапка над контентом: название канала, кнопки панелей (`useAppShell`) */
  header?: ReactNode;
  /** Строка состояния внизу, во всю ширину */
  statusBar?: ReactNode;
  /** Контент: лента канала, настройки */
  children: ReactNode;
  /** Начальная ширина сайдбара, px */
  sidebarWidth?: number;
  sidebarMinWidth?: number;
  sidebarMaxWidth?: number;
  membersWidth?: number;
  membersMinWidth?: number;
  membersMaxWidth?: number;
  defaultSidebarCollapsed?: boolean;
  defaultMembersCollapsed?: boolean;
  /** Ширина оболочки (px), ниже которой панель уходит в Sheet; по умолчанию участники 1100, сайдбар 760 */
  breakpoints?: Partial<ShellBreakpoints>;
  /** Ключ localStorage: ширины в px и свёрнутость переживают перезагрузку */
  autoSaveId?: string;
  /** Подпись сайдбара — заголовок его Sheet для скринридера */
  sidebarLabel?: string;
  membersLabel?: string;
  /**
   * islands — панели отдельными островами с зазором, сквозь который виден фон; рейл лежит прямо на фоне.
   * flush — панели встык через линию: встроенная оболочка, где фона за ней нет
   */
  variant?: 'islands' | 'flush';
}

type SheetName = 'sidebar' | 'members';

function assignRef<T>(ref: Ref<T> | undefined, node: T) {
  if (typeof ref === 'function') ref(node);
  else if (ref) ref.current = node;
}

/**
 * Каркас приложения: рейл, сайдбар, контент и участники на `Resizable` (ширины в px, сворачивание
 * ручкой или кнопкой). По умолчанию — острова: каждая панель — отдельный скруглённый блок, между ними
 * зазор, где видно живой фон, а ручка — невидимый желоб в этом зазоре; рейл пространств — на самом фоне.
 * «Где ты» — на островах, «куда пойти» — на фоне. Ширина меряется у самой оболочки, а не у окна: в Storybook, во фрейме и в окне
 * Tauri решение одно и то же. В узком окне участники, а затем и сайдбар уходят в `Sheet`.
 */
export function AppShell({
  rail,
  sidebar,
  members,
  top,
  header,
  statusBar,
  children,
  sidebarWidth = 240,
  sidebarMinWidth = 180,
  sidebarMaxWidth = 400,
  membersWidth = 240,
  membersMinWidth = 200,
  membersMaxWidth = 360,
  defaultSidebarCollapsed = false,
  defaultMembersCollapsed = false,
  breakpoints,
  autoSaveId,
  sidebarLabel,
  membersLabel,
  variant = 'islands',
  className,
  ref,
  ...rest
}: AppShellProps) {
  const strings = useUiStrings().appShell;
  const rootRef = useRef<HTMLDivElement | null>(null);
  // Первое приближение — окно: до измерения в layout-эффекте оболочка обычно и есть окно
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 0 : window.innerWidth));
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [state, setState] = useState<ShellState>(() => {
    const fallback = {
      sidebarWidth,
      membersWidth,
      sidebarCollapsed: defaultSidebarCollapsed,
      membersCollapsed: defaultMembersCollapsed,
    };

    return autoSaveId ? readShellState(autoSaveId, fallback) : fallback;
  });

  const layout = shellLayout({
    width,
    breakpoints: { ...defaultShellBreakpoints, ...breakpoints },
    hasSidebar: sidebar !== undefined && sidebar !== null,
    hasMembers: members !== undefined && members !== null,
    sidebarCollapsed: state.sidebarCollapsed,
    membersCollapsed: state.membersCollapsed,
  });
  const sidebarDocked = layout.sidebar === 'docked';
  const membersDocked = layout.members === 'docked';
  // Окно расширилось — Sheet панели, вернувшейся в раскладку, закрыт сам
  const openSheet =
    (sheet === 'sidebar' && layout.sidebar === 'overlay') ||
    (sheet === 'members' && layout.members === 'overlay')
      ? sheet
      : null;

  // До отрисовки: первый кадр в узком фрейме не должен показать панели, которые тут же уедут в Sheet
  useLayoutEffect(() => {
    const root = rootRef.current;

    if (!root) return;

    const measure = () => {
      const next = root.getBoundingClientRect().width;

      // Скрытая оболочка (display: none) меряется нулём — раскладку это не меняет
      if (next > 0) setWidth((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
    };

    measure();

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(measure);

    observer.observe(root);

    return () => observer.disconnect();
  }, []);

  const update = (next: ShellState) => {
    setState(next);

    if (autoSaveId) writeShellState(autoSaveId, next);
  };

  const toggle = (name: SheetName) => {
    const action = toggleAction(layout[name]);
    const key = name === 'sidebar' ? 'sidebarCollapsed' : 'membersCollapsed';

    if (action === 'collapse') update({ ...state, [key]: true });
    else if (action === 'expand') update({ ...state, [key]: false });
    else if (action === 'sheet') setSheet(openSheet === name ? null : name);
  };

  const api: AppShellApi = {
    sidebar: layout.sidebar,
    members: layout.members,
    sidebarSheetOpen: openSheet === 'sidebar',
    membersSheetOpen: openSheet === 'members',
    toggleSidebar: () => toggle('sidebar'),
    toggleMembers: () => toggle('members'),
    closeSheet: () => setSheet(null),
  };

  const mainIndex = sidebarDocked ? 1 : 0;

  const onResizeEnd = (_sizes: number[], resized: PanelSize[]) => {
    update(
      applyResize(state, resized, {
        sidebar: sidebarDocked ? 0 : -1,
        members: membersDocked ? mainIndex + 1 : -1,
      }),
    );
  };

  const sheetFor = (name: SheetName, content: ReactNode, title: string) => (
    <Sheet.Root open={openSheet === name} onOpenChange={(open) => setSheet(open ? name : null)}>
      <Sheet.Content
        side={name === 'sidebar' ? 'left' : 'right'}
        size="sm"
        aria-describedby={undefined}
        className={styles.sheet}
      >
        <VisuallyHidden.Root asChild>
          <Sheet.Title>{title}</Sheet.Title>
        </VisuallyHidden.Root>

        {content}
      </Sheet.Content>
    </Sheet.Root>
  );

  return (
    <AppShellContext.Provider value={api}>
      <div
        ref={(node) => {
          rootRef.current = node;
          assignRef(ref, node);
        }}
        className={cx(styles.root, styles[variant], className)}
        data-variant={variant}
        data-sidebar={layout.sidebar ?? undefined}
        data-members={layout.members ?? undefined}
        {...rest}
      >
        {top && <div className={styles.top}>{top}</div>}

        <div className={styles.body}>
          {rail && <div className={styles.rail}>{rail}</div>}

          {/* Ключи панелей постоянны: свернули сайдбар — контент и участники не перемонтируются */}
          <Resizable.Root className={styles.panels} onResizeEnd={onResizeEnd}>
            {sidebarDocked && (
              <Resizable.Panel
                key="sidebar"
                className={styles.panel}
                defaultSize={`${clampWidth(state.sidebarWidth, sidebarMinWidth, sidebarMaxWidth)}px`}
                minSize={`${sidebarMinWidth}px`}
                maxSize={`${sidebarMaxWidth}px`}
                collapsible
              >
                {sidebar}
              </Resizable.Panel>
            )}

            {sidebarDocked && (
              <Resizable.Handle
                key="sidebar-handle"
                aria-label={strings.sidebarHandle}
                className={styles.gutter}
              />
            )}

            <Resizable.Panel key="main" className={cx(styles.panel, styles.main)}>
              {header && <div className={styles.header}>{header}</div>}

              <div className={styles.content}>{children}</div>
            </Resizable.Panel>

            {membersDocked && (
              <Resizable.Handle
                key="members-handle"
                aria-label={strings.membersHandle}
                className={styles.gutter}
              />
            )}

            {membersDocked && (
              <Resizable.Panel
                key="members"
                className={styles.panel}
                defaultSize={`${clampWidth(state.membersWidth, membersMinWidth, membersMaxWidth)}px`}
                minSize={`${membersMinWidth}px`}
                maxSize={`${membersMaxWidth}px`}
                collapsible
              >
                {members}
              </Resizable.Panel>
            )}
          </Resizable.Root>
        </div>

        {statusBar && <div className={styles.status}>{statusBar}</div>}

        {layout.sidebar === 'overlay' &&
          sheetFor('sidebar', sidebar, sidebarLabel ?? strings.sidebar)}

        {layout.members === 'overlay' &&
          sheetFor('members', members, membersLabel ?? strings.members)}
      </div>
    </AppShellContext.Provider>
  );
}
