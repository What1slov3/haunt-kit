import { STREAM_WAVES } from './flow-field';

/*
 * Фрагментные шейдеры фонов (GLSL ES 3.0). Модуль грузится через import() только на пути webgl.
 * Общие uniforms задаёт `gl-scenes.ts`:
 *
 * - `u_resolution` — размер прохода в физических пикселях, `u_scale` — пикселей прохода на CSS px
 *   (фон рисуется в долях разрешения и растягивается браузером), `u_size` — размер в CSS px;
 * - цвета токенов 0…1 и их прозрачности (`u_inkAlpha`, `u_accentAlpha`), `u_dark` — тёмная тема;
 * - `u_pointer` — курсор в CSS px и его вес (уже умноженный на реакцию), `u_pulses[4]` — волны шины:
 *   x, y, прогресс 0…1 (< 0 — слота нет), сила.
 *
 * Результат — премультиплицированный цвет на прозрачном: под ним виден `--bg` корня фона.
 */

const HEADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_scale;
uniform vec2 u_size;
uniform float u_time;
uniform vec3 u_ink;
uniform vec3 u_accent;
uniform vec3 u_accent2;
uniform vec3 u_tint2;
uniform vec3 u_tint3;
uniform float u_inkAlpha;
uniform float u_accentAlpha;
uniform float u_dark;
uniform vec3 u_pointer;
uniform vec4 u_pulses[4];

out vec4 outColor;

// CSS px от левого верхнего угла: начало координат GL — снизу
vec2 cssPx() {
  return vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y) / u_scale;
}

// Хэши без sin (Dave Hoskins, «Hash without Sine»): одинаковы на всех GPU, без полос на мобильных
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

vec3 hash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return -1.0 + 2.0 * fract((p.xxy + p.yxx) * p.zyx);
}

// Градиентный шум 3D с той же квинтикой сглаживания, что CPU-ядро (noise.ts)
float gnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  float n000 = dot(hash33(i), f);
  float n100 = dot(hash33(i + vec3(1, 0, 0)), f - vec3(1, 0, 0));
  float n010 = dot(hash33(i + vec3(0, 1, 0)), f - vec3(0, 1, 0));
  float n110 = dot(hash33(i + vec3(1, 1, 0)), f - vec3(1, 1, 0));
  float n001 = dot(hash33(i + vec3(0, 0, 1)), f - vec3(0, 0, 1));
  float n101 = dot(hash33(i + vec3(1, 0, 1)), f - vec3(1, 0, 1));
  float n011 = dot(hash33(i + vec3(0, 1, 1)), f - vec3(0, 1, 1));
  float n111 = dot(hash33(i + vec3(1, 1, 1)), f - vec3(1, 1, 1));

  return mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z
  );
}

float fbm(vec3 p) {
  return (gnoise(p) + 0.5 * gnoise(p * 2.0 + vec3(0, 0, 17.3)) + 0.25 * gnoise(p * 4.0 + vec3(0, 0, 34.6))) / 1.75;
}

// Сила волны шины в точке: кольцо радиусом progress · reach и шириной width
float pulseRing(vec2 p, float reach, float width) {
  float sum = 0.0;

  for (int i = 0; i < 4; i++) {
    vec4 pulse = u_pulses[i];

    if (pulse.z < 0.0) continue;

    float off = (distance(p, pulse.xy) - pulse.z * reach) / width;

    sum += pulse.w * (1.0 - pulse.z) * exp(-off * off);
  }

  return sum;
}
`;

/** Горизонтали: тот же шум в узлах «сетки» 24 px и та же добавка курсора, что у CPU-сцены */
export const CONTOUR = `${HEADER}
const float CELL = 24.0;
const float SCALE = 0.1;
const float LEVELS = 14.0;

void main() {
  vec2 p = cssPx();
  float h = 0.5 + 0.5 * fbm(vec3(p / CELL * SCALE, u_time));
  vec2 d = p - u_pointer.xy;

  h += 0.16 * u_pointer.z * exp(-dot(d, d) / (2.0 * 90.0 * 90.0));
  h += 0.1 * pulseRing(p, 520.0, 60.0);

  float v = h * (LEVELS + 1.0);
  float k = floor(v + 0.5);
  float dist = abs(v - k);
  float w = fwidth(v);
  // Линия ~1 CSS px: ширина в единицах уровня — производная на пиксель × пикселей в CSS px
  float line = 1.0 - smoothstep(0.25 * u_scale * w, (0.25 * u_scale + 1.0) * w, dist);

  if (k < 1.0 || k > LEVELS) line = 0.0;

  bool index = mod(k - 1.0, 5.0) == 2.0;
  vec3 color = index ? u_accent : u_ink;
  float alpha = line * (index ? u_accentAlpha * 0.6 : u_inkAlpha * 1.5);

  outColor = vec4(color * alpha, alpha);
}
`;

const waves = STREAM_WAVES.map(
  ([kx, ky, phase, omega, amp]) =>
    `  c = ${amp.toFixed(3)} * cos(dot(vec2(${kx.toFixed(3)}, ${ky.toFixed(3)}), q) + ${phase.toFixed(3)} + ${omega.toFixed(3)} * t);
  v += c * vec2(${ky.toFixed(3)}, ${(-kx).toFixed(3)});`,
).join('\n');

/**
 * Поток: animated LIC. Из каждой точки — трассировка назад по полю (та же функция тока, что у
 * частиц на CPU), вдоль пути собираются редкие «искры» белого шума с периодическим ядром, сдвинутым
 * во времени: штрихи текут вдоль линий тока без состояния между кадрами — переживают потерю
 * контекста и смену размера.
 */
export const FLOW = `${HEADER}
const float SCALE = 0.004;
const int STEPS = 24;
const float STEP_PX = 1.5;
const float SPARK_CELL = 6.0;

vec2 velocity(vec2 p, float t) {
  vec2 q = p * SCALE;
  vec2 v = vec2(0.0);
  float c;
${waves}

  // Курсор закручивает поток, волна шины расталкивает — как у частиц на CPU
  vec2 d = p - u_pointer.xy;
  float r = length(d);
  v += u_pointer.z * max(0.0, 1.0 - r / 140.0) * 2.0 * vec2(-d.y, d.x) / max(r, 1.0);

  for (int i = 0; i < 4; i++) {
    vec4 pulse = u_pulses[i];

    if (pulse.z < 0.0) continue;

    vec2 e = p - pulse.xy;
    float off = abs(length(e) - pulse.z * 320.0);

    v += pulse.w * (1.0 - pulse.z) * max(0.0, 1.0 - off / 40.0) * 5.0 * e / max(length(e), 1.0);
  }

  return v;
}

void main() {
  vec2 p = cssPx();
  float sum = 0.0;

  for (int i = 0; i < STEPS; i++) {
    vec2 v = velocity(p, u_time);

    p -= v / max(length(v), 1e-4) * STEP_PX;

    // Искра — мягкая точка в каждой девятой ячейке 6 px: непрерывная по p, поэтому штрих сглажен,
    // а не собран из ступенек ячеек
    vec2 g = p / SPARK_CELL;
    vec2 id = floor(g);
    float h = hash12(id);

    if (h < 0.89) continue;

    vec2 center = 0.2 + 0.6 * hash22(id);
    float spark = smoothstep(1.4, 0.3, length(fract(g) - center) * SPARK_CELL);
    // Фаза растёт с номером шага против времени: светлая часть уходит вниз по течению. Ядро —
    // пологий подъём и резкий срез: яркая голова штриха и хвост за ней
    float x = fract(float(i) / float(STEPS) - u_time * 0.45 + h * 7.0);
    float kernel = smoothstep(0.0, 0.3, x) * (1.0 - smoothstep(0.46, 0.5, x));

    sum += spark * kernel;
  }

  float alpha = clamp(sum * 0.9, 0.0, 1.0) * u_accentAlpha * 0.65;

  outColor = vec4(u_accent * alpha, alpha);
}
`;

/** Сетка: те же узлы и та же кусочно-линейная функция градиента, что `createRadialGradient` на CPU */
export const MESH = `${HEADER}
uniform vec3 u_nodes[4];
uniform vec3 u_nodeColors[4];

float falloff(float d) {
  if (d >= 1.0) return 0.0;
  return d < 0.55 ? mix(1.0, 0.45, d / 0.55) : mix(0.45, 0.0, (d - 0.55) / 0.45);
}

void main() {
  vec2 p = cssPx();
  float span = max(u_size.x, u_size.y);
  // Изгиб пространства шумом — края пятен «текут», как у полярного сияния; на CPU их нет
  vec2 warp = vec2(fbm(vec3(p / span * 2.5, u_time * 0.05)), fbm(vec3(p / span * 2.5 + 9.1, u_time * 0.05)));
  vec2 q = p + warp * span * 0.08;
  float a = u_dark > 0.5 ? 0.34 : 0.42;
  vec3 color = vec3(0.0);
  float alpha = 0.0;

  for (int i = 0; i < 5; i++) {
    vec3 node = i < 4 ? u_nodes[i] : vec3(u_pointer.xy / u_size, 0.22);
    vec3 tint = i < 4 ? u_nodeColors[i] : u_accent;
    float weight = i < 4 ? a : a * 0.5 * u_pointer.z;
    float g = falloff(distance(q, node.xy * u_size) / (node.z * span)) * weight;

    if (u_dark > 0.5) {
      color += tint * g;
      alpha += g;
    } else {
      color = tint * g + color * (1.0 - g);
      alpha = g + alpha * (1.0 - g);
    }
  }

  alpha = min(alpha, 1.0);
  // Дизеринг ±0.5/255 — без ступенек на долгом градиенте
  float dither = (hash12(gl_FragCoord.xy) - 0.5) / 255.0;

  outColor = vec4(min(color, vec3(alpha)) + dither, alpha);
}
`;

/**
 * Звёзды: слои-сетки, каждый сам по себе «летит» из глубины (fract от пройденного пути) — поле
 * бесконечно без массива звёзд. Параллакс — сдвиг слоя по глубине, прыжок — несколько отсчётов
 * вдоль пути к камере: звезда тянется штрихом от центра.
 */
export const STARFIELD = `${HEADER}
uniform float u_travel;
uniform float u_warp;
uniform vec2 u_look;

const float LAYERS = 4.0;

float starLayer(vec2 uv, float depth, float seed, float pxSize) {
  float scale = mix(28.0, 1.2, depth);
  vec2 g = (uv + u_look * 0.03 * depth) * scale;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash12(id + seed);

  if (h < 0.62) return 0.0;

  vec2 offset = (hash22(id + seed) - 0.5) * 0.7;
  // Радиус точки — в пикселях, а не в долях ячейки: ближние слои крупнее, но не превращаются в пятна
  float radius = (0.8 + 1.4 * depth * depth) * pxSize * scale;
  float d = length(f - offset);
  float brightness = (h - 0.62) / 0.38;

  return brightness * brightness * smoothstep(radius, radius * 0.25, d);
}

void main() {
  vec2 p = cssPx();
  float span = max(u_size.x, u_size.y);
  vec2 uv = (p - u_size * 0.5) / span;
  float pxSize = 1.0 / span;
  float sum = 0.0;
  float streak = 0.0;
  int taps = u_warp > 0.02 ? 6 : 1;

  for (float i = 0.0; i < LAYERS; i++) {
    for (int k = 0; k < taps; k++) {
      float depth = fract(i / LAYERS + u_travel - float(k) * u_warp * 0.012);
      float fade = smoothstep(0.0, 0.25, depth) * smoothstep(1.0, 0.85, depth);
      float s = starLayer(uv, depth, i * 37.0, pxSize) * fade * (0.35 + 0.65 * depth);

      if (k == 0) sum += s;
      else streak += s * (1.0 - float(k) / 6.0);
    }
  }

  float dotAlpha = clamp(sum, 0.0, 1.0) * min(1.0, u_inkAlpha * 11.0);
  float streakAlpha = clamp(streak, 0.0, 1.0) * u_accentAlpha;
  vec3 color = u_ink * dotAlpha + u_accent * streakAlpha * (1.0 - dotAlpha);
  float alpha = dotAlpha + streakAlpha * (1.0 - dotAlpha);

  outColor = vec4(color, alpha);
}
`;
