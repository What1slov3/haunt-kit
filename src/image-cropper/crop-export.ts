import { cropRegion, exportSize, type Crop, type Size } from './crop-math';

export type CropMask = 'circle' | 'rounded' | 'square';

/** Скругление маски `rounded` — доля короткой стороны, как у `Avatar shape="rounded"` */
export const ROUNDED_RATIO = 0.25;

export interface CropExportOptions {
  /** Ширина результата, px; высота — по соотношению маски. По умолчанию 512 */
  size?: number;
  /** MIME результата; по умолчанию `image/png` */
  type?: string;
  /** Качество 0…1 для `image/jpeg` и `image/webp` */
  quality?: number;
  /**
   * Вырезать форму маски прозрачностью. По умолчанию нет: сервер хранит прямоугольник, круг или скругление
   * рисует `Avatar` при показе — так одну картинку можно показать в любой форме
   */
  clip?: CropMask;
}

/**
 * Кадр в Blob через canvas: область исходника (`cropRegion`) масштабируется в `size`. Источник с другого
 * домена без CORS «пачкает» canvas, и `toBlob` бросит SecurityError — это отказ промиса.
 */
export function exportCrop(
  source: CanvasImageSource,
  natural: Size,
  crop: Crop,
  aspect: number,
  { size = 512, type = 'image/png', quality, clip }: CropExportOptions = {},
): Promise<Blob> {
  const output = exportSize(size, aspect);
  const region = cropRegion(crop, natural, aspect);
  const canvas = document.createElement('canvas');

  canvas.width = output.width;
  canvas.height = output.height;

  const ctx = canvas.getContext('2d');

  if (!ctx) return Promise.reject(new Error('2D canvas is unavailable'));

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (clip === 'circle' || clip === 'rounded') {
    ctx.beginPath();

    if (clip === 'circle') {
      ctx.ellipse(
        output.width / 2,
        output.height / 2,
        output.width / 2,
        output.height / 2,
        0,
        0,
        Math.PI * 2,
      );
    } else {
      ctx.roundRect(
        0,
        0,
        output.width,
        output.height,
        Math.min(output.width, output.height) * ROUNDED_RATIO,
      );
    }

    ctx.clip();
  }

  ctx.drawImage(
    source,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    output.width,
    output.height,
  );

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas produced no image'))),
        type,
        quality,
      );
    } catch (error) {
      reject(error);
    }
  });
}
