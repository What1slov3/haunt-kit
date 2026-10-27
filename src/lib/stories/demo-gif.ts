/*
 * Анимированный GIF для историй фильтра — собирается в коде, как картинки demo-scenes.ts: ничего не
 * скачивается, а истории проверяют настоящий путь «GIF → ImageDecoder → кадры». Кодировщик минимальный:
 * общая палитра 6×6×6 (216 цветов веб-куба) без дизеринга и LZW по спецификации GIF89a.
 */

type FramePainter = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
) => void;

const cache = new Map<string, string>();

/** Индекс цвета в кубе 6×6×6: каждая компонента округляется до шага 51 */
function cubeIndex(r: number, g: number, b: number): number {
  return Math.round(r / 51) * 36 + Math.round(g / 51) * 6 + Math.round(b / 51);
}

function cubePalette(): Uint8Array {
  const palette = new Uint8Array(256 * 3);

  for (let index = 0; index < 216; index++) {
    palette[index * 3] = Math.floor(index / 36) * 51;
    palette[index * 3 + 1] = (Math.floor(index / 6) % 6) * 51;
    palette[index * 3 + 2] = (index % 6) * 51;
  }

  return palette;
}

/** LZW GIF: коды переменной длины 9…12 бит, младшие биты первыми; при заполнении словаря — код сброса */
function lzw(indices: Uint8Array, minCodeSize: number): number[] {
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  const out: number[] = [];
  let codeSize = minCodeSize + 1;
  let next = end + 1;
  let dictionary = new Map<number, number>();
  let buffer = 0;
  let bits = 0;

  const emit = (code: number) => {
    buffer |= code << bits;
    bits += codeSize;

    while (bits >= 8) {
      out.push(buffer & 0xff);
      buffer >>>= 8;
      bits -= 8;
    }
  };

  emit(clear);

  let prefix = indices[0]!;

  for (let i = 1; i < indices.length; i++) {
    const k = indices[i]!;
    const key = (prefix << 8) | k;
    const known = dictionary.get(key);

    if (known !== undefined) {
      prefix = known;
      continue;
    }

    emit(prefix);

    if (next < 4096) {
      dictionary.set(key, next++);

      // Размер кода растёт, когда следующий код уже не помещается в текущую ширину
      if (next > 1 << codeSize && codeSize < 12) codeSize++;
    } else {
      emit(clear);
      dictionary = new Map();
      codeSize = minCodeSize + 1;
      next = end + 1;
    }

    prefix = k;
  }

  emit(prefix);
  emit(end);

  if (bits > 0) out.push(buffer & 0xff);

  return out;
}

function encodeGif(
  frames: ImageData[],
  width: number,
  height: number,
  delayCs: number,
): Uint8Array {
  const bytes: number[] = [];
  const word = (value: number) => bytes.push(value & 0xff, (value >> 8) & 0xff);
  const ascii = (text: string) => {
    for (const char of text) bytes.push(char.charCodeAt(0));
  };

  ascii('GIF89a');
  word(width);
  word(height);
  // Глобальная палитра есть, 8 бит на канал, 256 записей
  bytes.push(0xf7, 0, 0);
  bytes.push(...cubePalette());

  // NETSCAPE2.0: бесконечный повтор
  bytes.push(0x21, 0xff, 0x0b);
  ascii('NETSCAPE2.0');
  bytes.push(0x03, 0x01, 0x00, 0x00, 0x00);

  for (const frame of frames) {
    const indices = new Uint8Array(width * height);

    for (let i = 0; i < indices.length; i++) {
      indices[i] = cubeIndex(frame.data[i * 4]!, frame.data[i * 4 + 1]!, frame.data[i * 4 + 2]!);
    }

    // Управление графикой: кадр не стирается, задержка в сотых секунды
    bytes.push(0x21, 0xf9, 0x04, 0x04);
    word(delayCs);
    bytes.push(0x00, 0x00);

    bytes.push(0x2c);
    word(0);
    word(0);
    word(width);
    word(height);
    bytes.push(0x00, 0x08);

    const data = lzw(indices, 8);

    for (let offset = 0; offset < data.length; offset += 255) {
      const chunk = data.slice(offset, offset + 255);

      bytes.push(chunk.length, ...chunk);
    }

    bytes.push(0x00);
  }

  bytes.push(0x3b);

  return Uint8Array.from(bytes);
}

function toDataUrl(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) binary += String.fromCharCode(byte);

  return `data:image/gif;base64,${btoa(binary)}`;
}

function animatedScene(
  name: string,
  width: number,
  height: number,
  count: number,
  delayCs: number,
  paint: FramePainter,
): string {
  const key = `${name}:${width}x${height}:${count}`;
  const cached = cache.get(key);

  if (cached) return cached;

  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) return '';

  const frames: ImageData[] = [];

  for (let index = 0; index < count; index++) {
    paint(ctx, width, height, index / count);
    frames.push(ctx.getImageData(0, 0, width, height));
  }

  const url = toDataUrl(encodeGif(frames, width, height, delayCs));

  cache.set(key, url);

  return url;
}

/** Шар на орбите вокруг планеты: крупная форма движется — видно, что фильтр идёт покадрово */
export function orbitGif(width = 320, height = 180): string {
  return animatedScene('orbit', width, height, 24, 6, paintOrbit);
}

function paintOrbit(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, h);

  sky.addColorStop(0, '#05050a');
  sky.addColorStop(1, '#241640');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.55;
  const planet = ctx.createRadialGradient(cx - h * 0.08, cy - h * 0.1, h * 0.02, cx, cy, h * 0.3);

  planet.addColorStop(0, '#ffd9a8');
  planet.addColorStop(0.5, '#ff7a45');
  planet.addColorStop(1, '#4a1532');
  ctx.fillStyle = planet;
  ctx.beginPath();
  ctx.arc(cx, cy, h * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // Спутник по эллипсу: за планетой (верх орбиты) рисуется тусклее
  const angle = t * Math.PI * 2;
  const mx = cx + Math.cos(angle) * w * 0.38;
  const my = cy + Math.sin(angle) * h * 0.14;
  const moon = ctx.createRadialGradient(mx - 4, my - 4, 1, mx, my, h * 0.09);

  moon.addColorStop(0, '#f4f1ff');
  moon.addColorStop(1, Math.sin(angle) < 0 ? '#3d3566' : '#8f86d9');
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(mx, my, h * 0.08, 0, Math.PI * 2);
  ctx.fill();
}
