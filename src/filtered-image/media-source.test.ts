import { describe, expect, it } from 'vitest';

import { detectMediaKind, frameDelay, shouldSkipVideoFrame } from './media-source';

describe('detectMediaKind', () => {
  it('узнаёт анимированные картинки по расширению, не глядя на запрос и якорь', () => {
    expect(detectMediaKind('/media/cats.gif')).toBe('animated');
    expect(detectMediaKind('https://cdn.example/a.WEBP?w=320#top')).toBe('animated');
    expect(detectMediaKind('/media/sticker.apng')).toBe('animated');
  });

  it('узнаёт видео по расширению', () => {
    expect(detectMediaKind('/media/clip.mp4')).toBe('video');
    expect(detectMediaKind('/media/clip.webm?autoplay=1')).toBe('video');
  });

  it('JPEG и SVG — обычные картинки', () => {
    expect(detectMediaKind('/cover.jpg')).toBe('image');
    expect(detectMediaKind('/logo.svg')).toBe('image');
    expect(detectMediaKind('/no-extension')).toBe('image');
  });

  it('у data: смотрит на MIME', () => {
    expect(detectMediaKind('data:image/gif;base64,R0lG')).toBe('animated');
    expect(detectMediaKind('data:video/webm;base64,GkXf')).toBe('video');
    expect(detectMediaKind('data:image/jpeg;base64,/9j/')).toBe('image');
  });

  it('blob: без явного вида — картинка', () => {
    expect(detectMediaKind('blob:http://localhost/1234')).toBe('image');
  });
});

describe('frameDelay', () => {
  it('переводит микросекунды в миллисекунды', () => {
    expect(frameDelay(80_000)).toBe(80);
  });

  it('пустую и слишком короткую задержку играет на 100 мс, как браузеры', () => {
    expect(frameDelay(null)).toBe(100);
    expect(frameDelay(0)).toBe(100);
    expect(frameDelay(10_000)).toBe(100);
  });
});

describe('shouldSkipVideoFrame', () => {
  it('пропускает кадры чаще 30 в секунду', () => {
    expect(shouldSkipVideoFrame(1010, 1000)).toBe(true);
    expect(shouldSkipVideoFrame(1034, 1000)).toBe(false);
  });
});
