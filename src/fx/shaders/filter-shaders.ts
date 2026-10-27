/*
 * Фрагментные шейдеры фильтров изображений (GLSL ES 3.0). Модуль грузится через import() только
 * когда эффект выбрал путь WebGL. Формулы повторяют CPU-ядра `fx/kernels/*` — запасной путь даёт тот же
 * вид. Общие uniforms задаёт рендер фильтра:
 *
 * - `u_image` — исходник целиком (картинка, кадр GIF, видео), `u_sourceSize` — его размер в текселях;
 * - `u_crop` — какая часть исходника видна (`object-fit: cover`), доли: x, y, ширина, высота;
 * - `u_resolution` — размер результата в физических пикселях, `u_cell` — ячейка режима в них же;
 * - `u_background` — фон темы 0…1: под прозрачное и за край кинескопа;
 * - `u_ramp[8]` + `u_rampSize` — шкала цветов (краска темы, дуотон, тепловая палитра).
 */

const HEADER = `#version 300 es
precision highp float;

uniform sampler2D u_image;
uniform vec2 u_sourceSize;
uniform vec4 u_crop;
uniform vec2 u_resolution;
uniform float u_cell;
uniform vec3 u_background;
uniform vec3 u_ramp[8];
uniform int u_rampSize;

out vec4 outColor;

// Начало координат GL — снизу; рамка и текстура считаются сверху вниз, как в canvas
vec2 frameUv() {
  vec2 p = gl_FragCoord.xy / u_resolution;
  return vec2(p.x, 1.0 - p.y);
}

vec2 framePx() {
  return vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
}

// Мип-уровень, на котором тексель исходника ≈ пиксель результата × scale: усреднение без муара
float lodFor(float scale) {
  float texelsPerPixel = u_crop.z * u_sourceSize.x / u_resolution.x;
  return max(0.0, log2(max(texelsPerPixel * scale, 1.0)));
}

vec3 sampleFrame(vec2 uv, float lod) {
  vec4 c = textureLod(u_image, u_crop.xy + clamp(uv, 0.0, 1.0) * u_crop.zw, lod);
  return mix(u_background, c.rgb, c.a);
}

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 rampColor(float t) {
  float v = clamp(t, 0.0, 1.0) * float(u_rampSize - 1);
  int i = min(int(floor(v)), u_rampSize - 2);
  return mix(u_ramp[i], u_ramp[i + 1], v - float(i));
}
`;

/** duotone, gradient-map, thermal: яркость → цвет шкалы */
export const GRADIENT_MAP = `${HEADER}
void main() {
  outColor = vec4(rampColor(luma(sampleFrame(frameUv(), lodFor(1.0)))), 1.0);
}`;

/** edge: Собель на шаге u_cell пикселей, сила линии → цвет шкалы краски */
export const EDGE = `${HEADER}
uniform float u_gain;

float at(vec2 uv, vec2 offset) {
  return luma(sampleFrame(uv + offset, lodFor(u_cell)));
}

void main() {
  vec2 uv = frameUv();
  vec2 s = u_cell / u_resolution;
  float tl = at(uv, vec2(-s.x, -s.y));
  float t = at(uv, vec2(0.0, -s.y));
  float tr = at(uv, vec2(s.x, -s.y));
  float l = at(uv, vec2(-s.x, 0.0));
  float r = at(uv, vec2(s.x, 0.0));
  float bl = at(uv, vec2(-s.x, s.y));
  float b = at(uv, vec2(0.0, s.y));
  float br = at(uv, vec2(s.x, s.y));
  float gx = tr + 2.0 * r + br - tl - 2.0 * l - bl;
  float gy = bl + 2.0 * b + br - tl - 2.0 * t - tr;
  outColor = vec4(rampColor(min(1.0, length(vec2(gx, gy)) * u_gain)), 1.0);
}`;

/**
 * halftone: точка или линия повёрнутого растра, размер — краска в центре ячейки. u_channels: 0 —
 * монохром (u_ramp[0] — бумага, последний — краска), 1 — цвет: CMYK на светлой бумаге, RGB на тёмной.
 */
export const HALFTONE = `${HEADER}
uniform float u_angle;
uniform int u_shape;
uniform int u_channels;
uniform int u_additive;

float coverage(vec2 q, float ink) {
  if (ink <= 0.0) return 0.0;
  vec2 f = fract(q) - 0.5;
  float d = u_shape == 0 ? length(f) : abs(f.y);
  float radius = u_shape == 0 ? sqrt(ink) * 0.7072 : ink * 0.5;
  float edge = 0.5 / u_cell;
  return clamp((radius - d + edge) / (2.0 * edge), 0.0, 1.0);
}

// Цвет в центре своей ячейки растра под углом angle; q — координаты пикселя в ячейках
vec3 screenSample(vec2 px, float angle, out vec2 q) {
  mat2 toScreen = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  q = toScreen * px / u_cell;
  vec2 center = (floor(q) + 0.5) * u_cell;
  vec2 back = transpose(toScreen) * center;
  return sampleFrame(back / u_resolution, lodFor(u_cell));
}

void main() {
  vec2 px = framePx();
  vec2 q;

  if (u_channels == 0) {
    vec3 c = screenSample(px, u_angle, q);
    outColor = vec4(mix(u_ramp[0], u_ramp[u_rampSize - 1], coverage(q, luma(c))), 1.0);
    return;
  }

  vec3 angles = radians(vec3(15.0, 75.0, 0.0)) + u_angle;
  vec3 paper = u_ramp[0];

  if (u_additive == 1) {
    vec3 light = paper;
    vec3 c = screenSample(px, angles.x, q);
    light.r += coverage(q, c.r);
    c = screenSample(px, angles.y, q);
    light.g += coverage(q, c.g);
    c = screenSample(px, angles.z, q);
    light.b += coverage(q, c.b);
    outColor = vec4(min(light, 1.0), 1.0);
    return;
  }

  vec3 color = paper;
  vec3 c = screenSample(px, angles.x, q);
  float k = 1.0 - max(c.r, max(c.g, c.b));
  color.r *= 1.0 - coverage(q, k >= 1.0 ? 0.0 : (1.0 - c.r - k) / (1.0 - k));
  c = screenSample(px, angles.y, q);
  k = 1.0 - max(c.r, max(c.g, c.b));
  color.g *= 1.0 - coverage(q, k >= 1.0 ? 0.0 : (1.0 - c.g - k) / (1.0 - k));
  c = screenSample(px, angles.z, q);
  k = 1.0 - max(c.r, max(c.g, c.b));
  color.b *= 1.0 - coverage(q, k >= 1.0 ? 0.0 : (1.0 - c.b - k) / (1.0 - k));
  c = screenSample(px, radians(45.0) + u_angle, q);
  color *= 1.0 - coverage(q, 1.0 - max(c.r, max(c.g, c.b)));
  outColor = vec4(color, 1.0);
}`;

/** crt: бочка, развёртка с шагом u_cell, апертурная решётка, свечение из мип-уровня, виньетка */
export const CRT = `${HEADER}
uniform float u_curvature;

void main() {
  vec2 uv = frameUv();
  vec2 c = uv - 0.5;
  vec2 bent = c * (1.0 + u_curvature * dot(c, c)) + 0.5;

  if (any(lessThan(bent, vec2(0.0))) || any(greaterThan(bent, vec2(1.0)))) {
    outColor = vec4(u_background, 1.0);
    return;
  }

  vec2 px = framePx();
  float line = 1.0 - 0.55 * (0.5 - 0.5 * cos(6.2831853 * (px.y + 0.5) / u_cell));
  float stripe = max(1.0, u_cell / 3.0);
  int channel = int(mod(floor(px.x / stripe), 3.0));
  vec3 mask = vec3(0.6);
  mask[channel] = 1.0;

  vec3 base = sampleFrame(bent, lodFor(1.0));
  vec3 halo = sampleFrame(bent, lodFor(8.0));
  vec2 d = bent - 0.5;
  float vignette = 1.0 - 0.9 * dot(d, d);
  vec3 color = base * line * mask * 1.35 + halo * halo * 0.35;
  outColor = vec4(min(color * vignette, 1.0), 1.0);
}`;

/** rgb-split: красный наружу от центра, синий внутрь на u_cell пикселей, к краям сильнее */
export const RGB_SPLIT = `${HEADER}
void main() {
  vec2 px = framePx();
  float half_ = max(u_resolution.x, u_resolution.y) * 0.5;
  vec2 d = (px - u_resolution * 0.5) / half_;
  float sx = (0.4 + 1.2 * abs(d.x)) * u_cell * (d.x < 0.0 ? -1.0 : 1.0);
  vec2 shift = vec2(sx, 1.2 * d.y * u_cell) / u_resolution;
  vec2 uv = frameUv();
  float lod = lodFor(1.0);
  outColor = vec4(
    sampleFrame(uv + shift, lod).r,
    sampleFrame(uv, lod).g,
    sampleFrame(uv - shift, lod).b,
    1.0
  );
}`;
