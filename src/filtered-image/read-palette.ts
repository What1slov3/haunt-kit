import type { Rgb } from './image-filters';

/*
 * Цвета для canvas берутся из токенов темы на самом элементе: так фильтр видит акцент AccentScope и
 * тему ThemeScope. Значение токена может быть color-mix() или var() — canvas такое не разбирает,
 * поэтому цвет сначала вычисляет CSS (свойство color пробного элемента), а затем canvas переводит
 * результат (rgb, oklab, color(srgb …)) в байты через один пиксель.
 */

let pixel: CanvasRenderingContext2D | null = null;

function pixelContext(): CanvasRenderingContext2D | null {
  if (!pixel) {
    const canvas = document.createElement('canvas');

    canvas.width = 1;
    canvas.height = 1;
    pixel = canvas.getContext('2d', { willReadFrequently: true });
  }

  return pixel;
}

function toRgb(color: string, fallback: Rgb): Rgb {
  const ctx = pixelContext();

  if (!ctx) return fallback;

  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = `rgb(${fallback.join(' ')})`;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);

  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

  return [r!, g!, b!];
}

/**
 * Читает несколько цветов одним пробным элементом: один пересчёт стилей на все. Имя с `--` — токен,
 * иначе любой CSS-цвет (`options.colors` у фильтра: `'--accent'` или `'oklch(…)'`).
 */
export function readColors(element: Element, tokens: readonly string[], fallback: Rgb): Rgb[] {
  const probe = document.createElement('span');

  probe.style.display = 'none';
  element.appendChild(probe);

  try {
    return tokens.map((token) => {
      probe.style.color = token.startsWith('--') ? `var(${token})` : token;

      return toRgb(getComputedStyle(probe).color, fallback);
    });
  } finally {
    probe.remove();
  }
}
