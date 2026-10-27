/*
 * Картинка и звук для историй сообщений и медиа — генерируются в коде, как demo-scenes.ts: ничего не
 * скачивается, истории и тесты работают офлайн.
 */

const images = new Map<string, string>();
const sounds = new Map<string, string>();

/**
 * Вертикальный «постер» с мелкой сеткой и подписями: проверяет вписывание по высоте и то, что при
 * увеличении видны детали, а не мыло.
 */
export function posterScene(width = 720, height = 1080): string {
  const key = `${width}x${height}`;
  const cached = images.get(key);

  if (cached) return cached;

  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  if (ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, height);

    sky.addColorStop(0, '#0b1026');
    sky.addColorStop(1, '#3a1450');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }

    ctx.fillStyle = '#f5f0ff';
    ctx.beginPath();
    ctx.arc(width / 2, height * 0.38, width * 0.22, Math.PI, 0);
    ctx.lineTo(width / 2 + width * 0.22, height * 0.6);

    for (let i = 0; i < 4; i++) {
      const step = (width * 0.44) / 4;

      ctx.quadraticCurveTo(
        width / 2 + width * 0.22 - step * (i + 0.5),
        height * (i % 2 ? 0.6 : 0.66),
        width / 2 + width * 0.22 - step * (i + 1),
        height * 0.6,
      );
    }

    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0b1026';
    ctx.beginPath();
    ctx.arc(width / 2 - width * 0.08, height * 0.4, width * 0.03, 0, Math.PI * 2);
    ctx.arc(width / 2 + width * 0.08, height * 0.4, width * 0.03, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(245, 240, 255, 0.85)';
    ctx.font = `600 ${Math.round(width / 12)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('HAUNT', width / 2, height * 0.8);
    ctx.font = `${Math.round(width / 48)}px monospace`;
    ctx.fillText('мелкий текст виден только при увеличении', width / 2, height * 0.85);
  }

  const url = canvas.toDataURL('image/png');

  images.set(key, url);

  return url;
}

/** Детерминированный псевдослучайный ряд: одна и та же «речь» в каждом прогоне */
function random(seed: number) {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;

    return state / 2 ** 32;
  };
}

/**
 * «Голосовое» в WAV (PCM 16 бит, моно, 16 кГц): слоги — гармонический тон с плавающей высотой под
 * огибающей, паузы между словами. Похоже на речь по волне, а не на ровный синус — пики получаются живыми.
 */
export function voiceWav(seconds = 6, seed = 7): string {
  const key = `${seconds}:${seed}`;
  const cached = sounds.get(key);

  if (cached) return cached;

  const rate = 16_000;
  const length = Math.round(seconds * rate);
  const samples = new Float32Array(length);
  const next = random(seed);
  let t = 0.15;

  while (t < seconds - 0.2) {
    const syllable = 0.12 + next() * 0.18;
    const pitch = 110 + next() * 90;
    const loud = 0.35 + next() * 0.6;
    const start = Math.round(t * rate);
    const count = Math.round(syllable * rate);

    for (let i = 0; i < count && start + i < length; i++) {
      const phase = i / count;
      const envelope = Math.sin(Math.PI * phase) ** 1.5;
      const time = i / rate;
      const f = pitch * (1 + 0.08 * Math.sin(phase * Math.PI));
      const tone =
        Math.sin(2 * Math.PI * f * time) +
        0.5 * Math.sin(4 * Math.PI * f * time) +
        0.25 * Math.sin(6 * Math.PI * f * time);

      samples[start + i] = (tone / 1.75) * envelope * loud;
    }

    // Между слогами — короткий зазор, между словами — пауза подлиннее
    t += syllable + (next() < 0.25 ? 0.25 + next() * 0.3 : 0.03);
  }

  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  write(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, length * 2, true);

  samples.forEach((sample, index) => {
    view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true);
  });

  const url = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));

  sounds.set(key, url);

  return url;
}
