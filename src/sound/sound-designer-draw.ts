/**
 * Пики сигнала по столбцам холста: `top` — вверх от середины, `bottom` — вниз (по умолчанию тот же
 * сигнал — симметричная форма волны). Буфер — под ширину на экране и плотность пикселей, чтобы линия
 * не размывалась на 2x; цвет — `color` холста из CSS.
 */
export function drawPeaks(
  canvas: HTMLCanvasElement,
  top: Float32Array,
  bottom: Float32Array = top,
): void {
  const ctx = canvas.getContext('2d');

  if (!ctx) return;

  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
  const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
  const middle = height / 2;

  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = getComputedStyle(canvas).color;
  ctx.lineWidth = ratio;
  ctx.beginPath();

  for (let x = 0; x < width; x++) {
    const from = Math.floor((x / width) * top.length);
    const to = Math.max(from + 1, Math.floor(((x + 1) / width) * top.length));
    let up = 0;
    let down = 0;

    for (let i = from; i < to; i++) {
      up = Math.max(up, Math.abs(top[i] ?? 0));
      down = Math.max(down, Math.abs(bottom[i] ?? 0));
    }

    ctx.moveTo(x + 0.5, middle - up * middle * 0.96);
    ctx.lineTo(x + 0.5, middle + down * middle * 0.96);
  }

  ctx.stroke();
}
