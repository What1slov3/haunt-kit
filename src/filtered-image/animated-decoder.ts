import { frameDelay } from './media-source';

/*
 * Кадры анимированной картинки через ImageDecoder (WebCodecs). Нужен потому, что drawImage(<img>) у
 * анимированного GIF по спецификации рисует первый кадр — Chromium и WebView2 так и делают, и фильтр
 * без декодера показал бы стоп-кадр. Где ImageDecoder нет (Safari / WKWebView в Tauri на macOS) —
 * возвращаем null, и фильтр остаётся на первом кадре: картинка не ломается, просто не движется.
 */

export interface DecodedFrame {
  bitmap: ImageBitmap;
  /** Сколько кадр показывается, мс */
  delay: number;
}

export interface DecodedAnimation {
  frames: DecodedFrame[];
  width: number;
  height: number;
}

/** Больше — уже видео, а не стикер: 240 кадров по 100 мс — 24 секунды */
const MAX_FRAMES = 240;
/** Длинная сторона кадра: фильтр всё равно уменьшает до сетки ячеек, крупнее хранить незачем */
const MAX_SIDE = 960;
/** Несколько последних анимаций — повторный монтаж и одна гифка в двух местах без нового декодирования */
const MAX_CACHED = 6;

const cache = new Map<string, Promise<DecodedAnimation | null>>();

export function canDecodeAnimated(): boolean {
  return typeof ImageDecoder !== 'undefined';
}

async function decode(src: string): Promise<DecodedAnimation | null> {
  const response = await fetch(src);

  if (!response.ok) return null;

  const blob = await response.blob();
  const type = blob.type || 'image/gif';

  if (!(await ImageDecoder.isTypeSupported(type))) return null;

  const decoder = new ImageDecoder({ data: await blob.arrayBuffer(), type });

  try {
    // tracks.ready — без него selectedTrack пуст даже после completed; completed — файл разобран
    // целиком: до этого frameCount у GIF может быть неполным
    await decoder.tracks.ready;
    await decoder.completed;

    const track = decoder.tracks.selectedTrack;

    if (!track || track.frameCount <= 1) return null;

    const frames: DecodedFrame[] = [];
    const count = Math.min(track.frameCount, MAX_FRAMES);
    let width = 0;
    let height = 0;

    for (let index = 0; index < count; index++) {
      const { image } = await decoder.decode({ frameIndex: index });
      const scale = Math.min(1, MAX_SIDE / Math.max(image.displayWidth, image.displayHeight));

      width = Math.round(image.displayWidth * scale);
      height = Math.round(image.displayHeight * scale);

      // ImageBitmap вместо VideoFrame: кадры WebCodecs держат память декодера и требуют close
      const bitmap = await createImageBitmap(image, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: 'medium',
      });

      frames.push({ bitmap, delay: frameDelay(image.duration) });
      image.close();
    }

    return { frames, width, height };
  } finally {
    decoder.close();
  }
}

/**
 * Кадры по адресу или null (один кадр, формат не поддержан, нет ImageDecoder, чужой источник без
 * CORS). Ошибки не бросает: анимация — украшение, при любой неудаче остаётся первый кадр.
 */
export function decodeAnimated(src: string): Promise<DecodedAnimation | null> {
  if (!canDecodeAnimated()) return Promise.resolve(null);

  const cached = cache.get(src);

  if (cached) {
    cache.delete(src);
    cache.set(src, cached);

    return cached;
  }

  const pending = decode(src).catch(() => null);

  cache.set(src, pending);

  // Вытесненные кадры не закрываем: их может ещё показывать смонтированный экземпляр, соберёт GC
  if (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value!);

  return pending;
}
