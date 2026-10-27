import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { usePreventWindowDrop } from './use-prevent-window-drop';

// Без флага React ругается, что act вызван вне тестового окружения; @testing-library в проекте нет
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Probe({ enabled }: { enabled?: boolean }) {
  usePreventWindowDrop(enabled);

  return <div data-testid="zone" />;
}

/** В jsdom нет DataTransfer и DragEvent с ним — хватает объекта с types и dropEffect */
function drag(type: 'dragover' | 'drop', types: string[], target: EventTarget = window) {
  const event = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    dataTransfer: { types: string[]; dropEffect: string };
  };

  Object.defineProperty(event, 'dataTransfer', { value: { types, dropEffect: 'copy' } });
  target.dispatchEvent(event);

  return event;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('usePreventWindowDrop', () => {
  it('гасит бросок файла мимо зоны, курсор — «нельзя»', () => {
    act(() => root.render(<Probe />));

    const over = drag('dragover', ['Files']);

    expect(over.defaultPrevented).toBe(true);
    expect(over.dataTransfer.dropEffect).toBe('none');
    expect(drag('drop', ['Files']).defaultPrevented).toBe(true);
  });

  it('текст и ссылки не трогает', () => {
    act(() => root.render(<Probe />));

    expect(drag('dragover', ['text/plain']).defaultPrevented).toBe(false);
    expect(drag('drop', ['text/uri-list']).defaultPrevented).toBe(false);
  });

  it('событие, принятое зоной, остаётся с её dropEffect', () => {
    act(() => root.render(<Probe />));

    const zone = container.querySelector('[data-testid="zone"]')!;

    zone.addEventListener('dragover', (event) => event.preventDefault());

    expect(drag('dragover', ['Files'], zone).dataTransfer.dropEffect).toBe('copy');
  });

  it('выключен — не вмешивается; размонтирован — слушателей нет', () => {
    act(() => root.render(<Probe enabled={false} />));
    expect(drag('drop', ['Files']).defaultPrevented).toBe(false);

    act(() => root.render(<Probe enabled />));
    expect(drag('drop', ['Files']).defaultPrevented).toBe(true);

    act(() => root.render(<div />));
    expect(drag('drop', ['Files']).defaultPrevented).toBe(false);
  });
});
