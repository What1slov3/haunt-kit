/*
 * Демо-сцена для историй эффектов — рисуется в коде, как `lib/stories/demo-scenes.ts`: закат над
 * городом с отражением в воде. Подобрана под новые режимы фильтра: долгий градиент неба (дуотон,
 * тепловая карта, растр), резкие края домов и окна-точки (Собель, изолинии, табло), яркое солнце на
 * тёмном (свечение CRT, сдвиг каналов), полосы отражения (сортировка пикселей).
 */

const cache = new Map<string, string>();

/** Детерминированный «случай»: одна и та же сцена при каждом рендере истории */
function random(seed: number): () => number {
  let state = seed;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

    return state / 4294967296;
  };
}

export function cityScene(width = 960, height = 540): string {
  const key = `${width}x${height}`;
  const cached = cache.get(key);

  if (cached) return cached;

  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  const w = width;
  const h = height;
  const horizon = h * 0.72;
  const next = random(7);
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);

  sky.addColorStop(0, '#0b0820');
  sky.addColorStop(0.45, '#4a2560');
  sky.addColorStop(1, '#ffa56b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon);

  const glow = ctx.createRadialGradient(w * 0.66, h * 0.42, 0, w * 0.66, h * 0.42, h * 0.4);

  glow.addColorStop(0, 'rgba(255, 200, 140, 0.7)');
  glow.addColorStop(1, 'rgba(255, 140, 80, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, horizon);
  ctx.fillStyle = '#fff1cc';
  ctx.beginPath();
  ctx.arc(w * 0.66, h * 0.42, h * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Дальние холмы — силуэт полутоном между небом и домами
  ctx.fillStyle = '#4a2a52';
  ctx.beginPath();
  ctx.moveTo(0, horizon);

  for (let x = 0; x <= w; x += w / 24) {
    ctx.lineTo(x, horizon - h * (0.07 + 0.03 * Math.sin(x / 70) + 0.02 * Math.sin(x / 23)));
  }

  ctx.lineTo(w, horizon);
  ctx.fill();

  // Дома с окнами, с просветами неба между кварталами
  for (let x = 0; x < w;) {
    const bw = w * (0.025 + next() * 0.04);
    const bh = h * (0.05 + next() * 0.2);
    const top = horizon - bh;

    ctx.fillStyle = '#140d1f';
    ctx.fillRect(x, top, bw - 2, bh);
    ctx.fillStyle = '#ffd27a';

    for (let wy = top + 6; wy < horizon - 6; wy += 9) {
      for (let wx = x + 4; wx < x + bw - 6; wx += 7) {
        if (next() < 0.28) ctx.fillRect(wx, wy, 3, 4);
      }
    }

    x += bw + (next() < 0.35 ? w * next() * 0.05 : 0);
  }

  // Вода: отражение неба и солнца полосами
  const water = ctx.createLinearGradient(0, horizon, 0, h);

  water.addColorStop(0, '#5a2c4a');
  water.addColorStop(1, '#0a0716');
  ctx.fillStyle = water;
  ctx.fillRect(0, horizon, w, h - horizon);

  for (let y = horizon + 3; y < h; y += 5) {
    const spread = (1 - (y - horizon) / (h - horizon)) * w * 0.12;
    const center = w * 0.66 + (next() - 0.5) * 20;

    ctx.fillStyle = `rgba(255, 190, 120, ${0.15 + 0.5 * (1 - (y - horizon) / (h - horizon))})`;
    ctx.fillRect(center - spread * (0.4 + next()), y, spread * 2 * (0.4 + next()), 2);
  }

  const url = canvas.toDataURL('image/png');

  cache.set(key, url);

  return url;
}
