import { describe, expect, it } from 'vitest';

import {
  applyResize,
  clampWidth,
  defaultShellBreakpoints,
  shellLayout,
  toggleAction,
  type ShellLayoutInput,
  type ShellState,
} from './app-shell-layout';
import { parseShellState } from './app-shell-storage';

const input = (patch: Partial<ShellLayoutInput>): ShellLayoutInput => ({
  width: 1400,
  breakpoints: defaultShellBreakpoints,
  hasSidebar: true,
  hasMembers: true,
  sidebarCollapsed: false,
  membersCollapsed: false,
  ...patch,
});

const state: ShellState = {
  sidebarWidth: 240,
  membersWidth: 240,
  sidebarCollapsed: false,
  membersCollapsed: false,
};

describe('shellLayout', () => {
  it('на широком окне обе панели в раскладке', () => {
    expect(shellLayout(input({}))).toEqual({ sidebar: 'docked', members: 'docked' });
  });

  it('уже порога участников — участники в Sheet, сайдбар на месте', () => {
    expect(shellLayout(input({ width: 900 }))).toEqual({ sidebar: 'docked', members: 'overlay' });
  });

  it('уже порога сайдбара — обе панели в Sheet', () => {
    expect(shellLayout(input({ width: 600 }))).toEqual({ sidebar: 'overlay', members: 'overlay' });
  });

  it('ровно на пороге панель ещё в раскладке', () => {
    expect(shellLayout(input({ width: 1100 })).members).toBe('docked');
  });

  it('свёрнутая человеком панель — collapsed, пока окно широкое', () => {
    expect(shellLayout(input({ sidebarCollapsed: true })).sidebar).toBe('collapsed');
    expect(shellLayout(input({ sidebarCollapsed: true, width: 600 })).sidebar).toBe('overlay');
  });

  it('не измеренная ширина считается широкой', () => {
    expect(shellLayout(input({ width: 0 }))).toEqual({ sidebar: 'docked', members: 'docked' });
  });

  it('нет слота — нет режима', () => {
    expect(shellLayout(input({ hasMembers: false })).members).toBeNull();
  });

  it('свои пороги', () => {
    const layout = shellLayout(
      input({ width: 1300, breakpoints: { members: 1440, sidebar: 900 } }),
    );

    expect(layout).toEqual({ sidebar: 'docked', members: 'overlay' });
  });
});

describe('toggleAction', () => {
  it('по режиму', () => {
    expect(toggleAction('docked')).toBe('collapse');
    expect(toggleAction('collapsed')).toBe('expand');
    expect(toggleAction('overlay')).toBe('sheet');
    expect(toggleAction(null)).toBeNull();
  });
});

describe('applyResize', () => {
  it('запоминает пиксели панелей', () => {
    const next = applyResize(state, ['300px', 60, '220px'], { sidebar: 0, members: 2 });

    expect(next).toMatchObject({ sidebarWidth: 300, membersWidth: 220 });
  });

  it('свёрнутая до нуля панель — collapsed, ширина прежняя', () => {
    const next = applyResize(state, ['0px', 80], { sidebar: 0, members: -1 });

    expect(next).toMatchObject({ sidebarCollapsed: true, sidebarWidth: 240 });
  });

  it('панели нет в раскладке — её поля не меняются', () => {
    expect(applyResize(state, [100], { sidebar: -1, members: -1 })).toEqual(state);
  });
});

describe('clampWidth', () => {
  it('в границах', () => {
    expect(clampWidth(500, 180, 400)).toBe(400);
    expect(clampWidth(100, 180, 400)).toBe(180);
    expect(clampWidth(250, 180, 400)).toBe(250);
  });
});

describe('parseShellState', () => {
  it('сохранённое поверх значений по умолчанию', () => {
    expect(parseShellState('{"sidebarWidth":320,"membersCollapsed":true}', state)).toEqual({
      ...state,
      sidebarWidth: 320,
      membersCollapsed: true,
    });
  });

  it('мусор — значения по умолчанию', () => {
    expect(parseShellState('not json', state)).toBe(state);
    expect(parseShellState('[1,2]', state)).toEqual(state);
    expect(parseShellState('{"sidebarWidth":-5,"sidebarCollapsed":"yes"}', state)).toEqual(state);
    expect(parseShellState(null, state)).toBe(state);
  });
});
