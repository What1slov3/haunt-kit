/*
 * Какой источник у фильтра: картинка, анимированная картинка (GIF, WebP, APNG) или видео. От этого
 * зависит, рисуется ли кадр один раз или фильтр идёт покадрово. Чистые функции — проверяются в jsdom.
 */

export type MediaKind = 'image' | 'animated' | 'video';

/*
 * PNG и AVIF сюда не входят, хотя бывают анимированными: почти всегда они статичны, а проверка — это
 * повторная загрузка и декодирование. Анимированный PNG передают явно: `media="animated"`.
 */
const animatedExtensions = new Set(['gif', 'webp', 'apng']);
const videoExtensions = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogv']);

const animatedMime = /^image\/(gif|webp|apng)$/;
const videoMime = /^video\//;

/**
 * Вид по `src`: MIME у `data:`, расширение у обычного адреса. WebP бывает и статичным — его отличит
 * декодер по числу кадров (один кадр — рисуем как обычную картинку). `blob:` адреса не говорят
 * ничего — тогда вид передают явно (`media` у FilteredImage).
 */
export function detectMediaKind(src: string): MediaKind {
  if (src.startsWith('data:')) {
    const mime = src.slice(5, src.search(/[;,]/)).toLowerCase();

    if (videoMime.test(mime)) return 'video';

    return animatedMime.test(mime) ? 'animated' : 'image';
  }

  if (src.startsWith('blob:')) return 'image';

  const path = src.split(/[?#]/, 1)[0] ?? '';
  const dot = path.lastIndexOf('.');
  const extension = dot === -1 ? '' : path.slice(dot + 1).toLowerCase();

  if (videoExtensions.has(extension)) return 'video';

  return animatedExtensions.has(extension) ? 'animated' : 'image';
}

/** Задержки короче — как у браузеров: GIF с «0» или «1 сотой» играют на 100 мс, иначе мельтешат */
const MIN_GIF_DELAY_MS = 20;
const FALLBACK_DELAY_MS = 100;

/**
 * Длительность кадра в мс из `VideoFrame.duration` (микросекунды). Пусто или меньше 20 мс — 100 мс:
 * так Chrome и Firefox обходятся с GIF, где задержку не выставили, и анимация идёт с той же скоростью,
 * что у обычного `<img>`.
 */
export function frameDelay(durationMicros: number | null | undefined): number {
  if (!durationMicros || durationMicros <= 0) return FALLBACK_DELAY_MS;

  const ms = durationMicros / 1000;

  return ms < MIN_GIF_DELAY_MS ? FALLBACK_DELAY_MS : ms;
}

/** Видео фильтруется не чаще 30 кадров в секунду: чаще глаз на пикселях и символах не различает */
export const VIDEO_FRAME_INTERVAL_MS = 1000 / 30;

/** Пропустить кадр видео, если с прошлого отрисованного прошло меньше интервала */
export function shouldSkipVideoFrame(now: number, lastPainted: number): boolean {
  return now - lastPainted < VIDEO_FRAME_INTERVAL_MS - 1;
}
