import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyText } from './copy-text';

/* jsdom не реализует ни Clipboard API, ни execCommand — оба подставляются на время теста */
function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

function stubExecCommand(result: boolean | Error) {
  const execCommand = vi.fn(() => {
    if (result instanceof Error) throw result;

    return result;
  });

  Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true });

  return execCommand;
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard');
  Reflect.deleteProperty(document, 'execCommand');
  document.body.innerHTML = '';
});

describe('copyText', () => {
  it('пишет через Clipboard API', async () => {
    const writeText = vi.fn(() => Promise.resolve());

    stubClipboard(writeText);

    await expect(copyText('haunt.app/i/abc')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('haunt.app/i/abc');
  });

  it('при отказе Clipboard API копирует через execCommand и убирает textarea', async () => {
    stubClipboard(() => Promise.reject(new DOMException('denied', 'NotAllowedError')));

    const execCommand = stubExecCommand(true);

    await expect(copyText('id-42')).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('без Clipboard API — сразу старый путь', async () => {
    stubExecCommand(true);

    await expect(copyText('id-42')).resolves.toBe(true);
  });

  it('если не вышло никак — false, без исключения', async () => {
    stubExecCommand(new Error('not supported'));

    await expect(copyText('id-42')).resolves.toBe(false);
  });

  it('возвращает фокус туда, где он был', async () => {
    const button = document.createElement('button');

    document.body.append(button);
    button.focus();
    stubExecCommand(true);

    await copyText('id-42');

    expect(document.activeElement).toBe(button);
  });
});
