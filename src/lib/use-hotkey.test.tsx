import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useHotkey, type UseHotkeyOptions } from './use-hotkey';

// Без флага React ругается, что act вызван вне тестового окружения; @testing-library в проекте нет
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface ProbeProps {
  combo: string | string[];
  handler: (event: KeyboardEvent) => void;
  options?: UseHotkeyOptions;
}

function Probe({ combo, handler, options }: ProbeProps) {
  useHotkey(combo, handler, options);

  return <input aria-label="поле" />;
}

let container: HTMLDivElement;
let root: Root;

function render(props: ProbeProps) {
  act(() => root.render(<Probe {...props} />));
}

function press(init: KeyboardEventInit, target: EventTarget = window): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });

  act(() => {
    target.dispatchEvent(event);
  });

  return event;
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('useHotkey', () => {
  it('срабатывает на сочетание и гасит действие браузера', () => {
    const handler = vi.fn();

    render({ combo: 'ctrl+k', handler });

    const event = press({ key: 'k', code: 'KeyK', ctrlKey: true });

    expect(handler).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it('не срабатывает на другое сочетание', () => {
    const handler = vi.fn();

    render({ combo: 'ctrl+k', handler });
    press({ key: 'k', code: 'KeyK' });
    press({ key: 'j', code: 'KeyJ', ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();
  });

  it('по умолчанию молчит, когда фокус в поле ввода', () => {
    const handler = vi.fn();

    render({ combo: '/', handler });
    press({ key: '/', code: 'Slash' }, container.querySelector('input')!);

    expect(handler).not.toHaveBeenCalled();
  });

  it('с allowInInput срабатывает и в поле ввода', () => {
    const handler = vi.fn();

    render({ combo: 'ctrl+k', handler, options: { allowInInput: true } });
    press({ key: 'k', code: 'KeyK', ctrlKey: true }, container.querySelector('input')!);

    expect(handler).toHaveBeenCalledOnce();
  });

  it('принимает несколько сочетаний', () => {
    const handler = vi.fn();

    render({ combo: ['ctrl+k', '/'], handler });
    press({ key: '/', code: 'Slash' });
    press({ key: 'k', code: 'KeyK', ctrlKey: true });

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('enabled: false отписывает, preventDefault: false оставляет действие браузера', () => {
    const handler = vi.fn();

    render({ combo: 'ctrl+k', handler, options: { enabled: false } });
    press({ key: 'k', code: 'KeyK', ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();

    render({ combo: 'ctrl+k', handler, options: { preventDefault: false } });

    const event = press({ key: 'k', code: 'KeyK', ctrlKey: true });

    expect(handler).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(false);
  });

  it('вызывает последний обработчик без переподписки', () => {
    const first = vi.fn();
    const second = vi.fn();
    const addListener = vi.spyOn(window, 'addEventListener');

    render({ combo: 'ctrl+k', handler: first });
    render({ combo: 'ctrl+k', handler: second });
    press({ key: 'k', code: 'KeyK', ctrlKey: true });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(addListener.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(1);

    addListener.mockRestore();
  });

  it('снимает слушатель при размонтировании', () => {
    const handler = vi.fn();

    render({ combo: 'ctrl+k', handler });
    act(() => root.render(<></>));
    press({ key: 'k', code: 'KeyK', ctrlKey: true });

    expect(handler).not.toHaveBeenCalled();
  });
});
