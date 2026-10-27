import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isAudible, readSoundLevel } from './level';

describe('readSoundLevel', () => {
  afterEach(() => {
    delete document.documentElement.dataset.sound;
    document.body.innerHTML = '';
  });

  it('без атрибута — off; ближайший контейнер главнее <html>', () => {
    expect(readSoundLevel()).toBe('off');

    document.documentElement.dataset.sound = 'on';
    document.body.innerHTML = '<div data-sound="subtle"><button>x</button></div>';

    expect(readSoundLevel()).toBe('on');
    expect(readSoundLevel(document.querySelector('button'))).toBe('subtle');
  });

  it('мусор в атрибуте — off', () => {
    document.documentElement.dataset.sound = 'loud';

    expect(readSoundLevel()).toBe('off');
  });
});

describe('isAudible', () => {
  it('subtle пропускает только значимые звуки', () => {
    expect(isAudible('off', 'subtle')).toBe(false);
    expect(isAudible('subtle', 'subtle')).toBe(true);
    expect(isAudible('subtle', 'on')).toBe(false);
    expect(isAudible('on', 'on')).toBe(true);
  });
});

/*
 * Модуль sound держит прореживание и загруженный движок в замыкании — свежий граф модулей на тест.
 * Движок подменён: в jsdom нет AudioContext, а проверяется решение «играть ли», не синтез.
 */
describe('sound.play', () => {
  const playNow = vi.fn(() => true);
  const stopAll = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.doMock('./engine', () => ({ playNow, stopAll }));
    playNow.mockClear();
    stopAll.mockClear();
    document.documentElement.dataset.sound = 'on';
    Object.defineProperty(navigator, 'userActivation', {
      configurable: true,
      value: { hasBeenActive: true, isActive: true },
    });
  });

  afterEach(() => {
    delete document.documentElement.dataset.sound;
    Reflect.deleteProperty(navigator, 'userActivation');
    vi.doUnmock('./engine');
  });

  it('уровень off — тишина, движок не грузится', async () => {
    const { sound } = await import('./sound');

    document.documentElement.dataset.sound = 'off';

    expect(sound.play('send')).toBe('off');
    await sound.preload();
    expect(playNow).not.toHaveBeenCalled();
  });

  it('до жеста пользователя звук не играет и контекст не создаётся', async () => {
    const { sound } = await import('./sound');

    Object.defineProperty(navigator, 'userActivation', {
      configurable: true,
      value: { hasBeenActive: false, isActive: false },
    });

    expect(sound.play('send')).toBe('no-gesture');
    await sound.preload();
    expect(playNow).not.toHaveBeenCalled();
  });

  it('subtle глушит щелчки и наведение, но не отправку; громкость — по уровню', async () => {
    const { sound } = await import('./sound');

    document.documentElement.dataset.sound = 'subtle';

    expect(sound.play('click')).toBe('quiet');
    expect(sound.play('send', { volume: 0.5 })).toBe('played');
    await vi.waitFor(() => expect(playNow).toHaveBeenCalledWith('send', 0.45 * 0.5, undefined));
  });

  it('частые повторы прореживаются, события видны подписчику', async () => {
    const { sound } = await import('./sound');
    const results: string[] = [];
    const stop = sound.onPlay((event) => results.push(event.result));

    sound.play('hover');
    sound.play('hover');
    stop();
    sound.play('mention');

    expect(results).toEqual(['played', 'interval']);
  });

  it('уровень читается с контейнера элемента', async () => {
    const { sound } = await import('./sound');
    const box = document.createElement('div');

    box.dataset.sound = 'off';
    document.body.append(box);

    expect(sound.play('success', { element: box })).toBe('off');
    expect(sound.play('success')).toBe('played');

    box.remove();
  });

  it('свой звук данными: играет с ключом id, прореживается по нему', async () => {
    const { sound } = await import('./sound');
    const motif = {
      minLevel: 'subtle' as const,
      minInterval: 300,
      voices: [
        {
          kind: 'tone' as const,
          wave: 'sine' as const,
          frequency: 440,
          gain: 0.3,
          envelope: { attack: 0.01, decay: 0.1 },
        },
      ],
    };

    expect(sound.play(motif, { id: 'join:maria' })).toBe('played');
    expect(sound.play(motif, { id: 'join:maria' })).toBe('interval');
    expect(sound.play(motif, { id: 'join:ivan' })).toBe('played');

    await vi.waitFor(() =>
      expect(playNow).toHaveBeenCalledWith(motif, expect.any(Number), undefined),
    );
  });

  it('мотивы прореживаются отдельно: щелчки не отнимают у них голоса', async () => {
    const { sound } = await import('./sound');
    const motif = (id: number) => ({
      category: 'motif' as const,
      minLevel: 'subtle' as const,
      minInterval: 0,
      voices: [
        {
          kind: 'tone' as const,
          wave: 'sine' as const,
          frequency: 440 + id,
          gain: 0.3,
          envelope: { attack: 0.01, decay: 2 },
        },
      ],
    });

    for (const name of ['send', 'mention', 'success', 'error'] as const) sound.play(name);

    expect(sound.play(motif(1), { id: 'm1' })).toBe('played');
    expect(sound.play(motif(2), { id: 'm2' })).toBe('played');
    expect(sound.play(motif(3), { id: 'm3' })).toBe('voices');
  });

  it('signal останавливает звук: движок получает его, интервал после остановки снят', async () => {
    const { sound } = await import('./sound');
    const controller = new AbortController();

    expect(sound.play('success', { signal: controller.signal })).toBe('played');
    await vi.waitFor(() =>
      expect(playNow).toHaveBeenCalledWith('success', expect.any(Number), controller.signal),
    );
    expect(sound.play('success')).toBe('interval');

    controller.abort();

    expect(sound.play('success')).toBe('played');
  });

  it('уровень off гасит то, что звучит', async () => {
    const { sound } = await import('./sound');

    sound.play('success');
    await sound.preload();
    sound.setLevel('off');

    await vi.waitFor(() => expect(stopAll).toHaveBeenCalledOnce());
  });
});
