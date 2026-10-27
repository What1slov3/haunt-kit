/*
 * Картинки для историй фильтра изображений рисуются в коде: ничего не скачивается, Storybook и тесты
 * работают офлайн. Сцены подобраны под проверку фильтра: плавный градиент (видна сетка Байера),
 * крупная форма (видно проявление), мелкие детали (видно, что пропадает при пикселизации).
 */

type Painter = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

const cache = new Map<string, string>();

function scene(name: string, width: number, height: number, paint: Painter): string {
  const key = `${name}:${width}x${height}`;
  const cached = cache.get(key);

  if (cached) return cached;

  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  if (ctx) paint(ctx, width, height);

  const url = canvas.toDataURL('image/png');

  cache.set(key, url);

  return url;
}

/** Светящийся шар над горизонтом — как герой fumadocs.dev: крупная форма и долгий градиент */
export function orbScene(width = 960, height = 540): string {
  return scene('orb', width, height, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);

    sky.addColorStop(0, '#07070c');
    sky.addColorStop(1, '#1d1430');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const glow = ctx.createRadialGradient(w * 0.62, h * 0.58, 0, w * 0.62, h * 0.58, w * 0.55);

    glow.addColorStop(0, 'rgba(255, 140, 70, 0.55)');
    glow.addColorStop(1, 'rgba(255, 140, 70, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    const orb = ctx.createRadialGradient(
      w * 0.56,
      h * 0.42,
      h * 0.04,
      w * 0.62,
      h * 0.58,
      h * 0.42,
    );

    orb.addColorStop(0, '#ffe2b8');
    orb.addColorStop(0.45, '#ff8a4c');
    orb.addColorStop(1, '#5b1d3a');
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(w * 0.62, h * 0.58, h * 0.36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, h * 0.82, w, h * 0.18);
  });
}

/** Горная гряда слоями — много средних тонов и чёткие края, удобно сравнивать режимы */
export function ridgeScene(width = 960, height = 540): string {
  return scene('ridge', width, height, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);

    sky.addColorStop(0, '#c9d6ff');
    sky.addColorStop(0.6, '#f5d0e6');
    sky.addColorStop(1, '#ffe9c7');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(w * 0.28, h * 0.34, h * 0.12, 0, Math.PI * 2);
    ctx.fill();

    const layers = ['#8d8fc4', '#5d5f9a', '#383a6e', '#1c1d3d'];

    layers.forEach((color, index) => {
      const base = h * (0.5 + index * 0.12);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, h);

      for (let x = 0; x <= w; x += w / 24) {
        const wave = Math.sin(x / (90 + index * 30) + index * 1.7) * h * 0.06;
        const peak = Math.sin(x / (37 + index * 11) + index) * h * 0.025;

        ctx.lineTo(x, base + wave + peak);
      }

      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    });
  });
}
