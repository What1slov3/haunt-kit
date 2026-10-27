import { describe, expect, it } from 'vitest';

import { altKeyDown, altKeyUp, initialAltKeyState, isMenuKey } from './menubar-keys';

const key = (name: string, modifiers: Partial<KeyboardEvent> = {}) => ({
  key: name,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  repeat: false,
  ...modifiers,
});

describe('Alt как вход в меню', () => {
  it('нажали и отпустили один Alt — переключить фокус', () => {
    const armed = altKeyDown(initialAltKeyState, key('Alt'));

    expect(altKeyUp(armed, key('Alt'))).toEqual({ state: { armed: false }, toggle: true });
  });

  it('Alt+буква — сочетание, не меню', () => {
    let state = altKeyDown(initialAltKeyState, key('Alt'));

    state = altKeyDown(state, key('f', { altKey: true }));

    expect(altKeyUp(state, key('Alt')).toggle).toBe(false);
  });

  it('Ctrl+Alt и Shift+Alt — не меню', () => {
    expect(altKeyDown(initialAltKeyState, key('Alt', { ctrlKey: true })).armed).toBe(false);
    expect(altKeyDown(initialAltKeyState, key('Alt', { shiftKey: true })).armed).toBe(false);
  });

  it('автоповтор зажатого Alt не сбивает и не взводит', () => {
    const armed = altKeyDown(initialAltKeyState, key('Alt'));

    expect(altKeyDown(armed, key('Alt', { repeat: true }))).toBe(armed);
    expect(altKeyDown(initialAltKeyState, key('Alt', { repeat: true })).armed).toBe(false);
  });

  it('отпущена другая клавиша — не меню', () => {
    const armed = altKeyDown(initialAltKeyState, key('Alt'));

    expect(altKeyUp(armed, key('Shift')).toggle).toBe(false);
  });

  it('F10 без модификаторов', () => {
    expect(isMenuKey(key('F10'))).toBe(true);
    expect(isMenuKey(key('F10', { shiftKey: true }))).toBe(false);
    expect(isMenuKey(key('F9'))).toBe(false);
  });
});
