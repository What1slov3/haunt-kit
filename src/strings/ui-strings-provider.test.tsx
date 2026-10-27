import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useUiLocale, useUiStrings } from './ui-strings-context';
import { UiStringsProvider } from './ui-strings-provider';
import type { UiStringsOverride } from './ui-strings-types';

// Без флага React ругается, что act вызван вне тестового окружения; @testing-library в проекте нет
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Probe({ locale }: { locale?: string }) {
  const strings = useUiStrings();
  const resolved = useUiLocale(locale);

  return (
    <span>
      {resolved}|{strings.dialog.close}|{strings.sheet.close}
    </span>
  );
}

let container: HTMLDivElement;
let root: Root;

function render(element: React.ReactNode): string {
  act(() => root.render(element));

  return container.textContent ?? '';
}

beforeEach(() => {
  container = document.createElement('div');
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
});

describe('UiStringsProvider', () => {
  it('без провайдера — русский и ru', () => {
    expect(render(<Probe />)).toBe('ru|Закрыть|Закрыть');
  });

  it('локаль выбирает словарь', () => {
    expect(
      render(
        <UiStringsProvider locale="en-GB">
          <Probe />
        </UiStringsProvider>,
      ),
    ).toBe('en-GB|Close|Close');
  });

  it('явная локаль компонента побеждает провайдер', () => {
    expect(
      render(
        <UiStringsProvider locale="en">
          <Probe locale="de" />
        </UiStringsProvider>,
      ),
    ).toBe('de|Close|Close');
  });

  it('частичная перезапись поверх словаря', () => {
    const strings: UiStringsOverride = { dialog: { close: 'Dismiss' } };

    expect(
      render(
        <UiStringsProvider locale="en" strings={strings}>
          <Probe />
        </UiStringsProvider>,
      ),
    ).toBe('en|Dismiss|Close');
  });

  it('вложенный без локали наследует язык и перезапись внешнего', () => {
    const outer: UiStringsOverride = { dialog: { close: 'Dismiss' } };
    const inner: UiStringsOverride = { sheet: { close: 'Hide' } };

    expect(
      render(
        <UiStringsProvider locale="en" strings={outer}>
          <UiStringsProvider strings={inner}>
            <Probe />
          </UiStringsProvider>
        </UiStringsProvider>,
      ),
    ).toBe('en|Dismiss|Hide');
  });

  it('вложенный с локалью начинает со словаря своего языка', () => {
    const outer: UiStringsOverride = { dialog: { close: 'Dismiss' } };

    expect(
      render(
        <UiStringsProvider locale="en" strings={outer}>
          <UiStringsProvider locale="ru">
            <Probe />
          </UiStringsProvider>
        </UiStringsProvider>,
      ),
    ).toBe('ru|Закрыть|Закрыть');
  });
});
