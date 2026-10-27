/*
 * Маленькая обёртка над WebGL2 без three.js: компиляция программы с понятной ошибкой, полноэкранный
 * треугольник, uniforms по типам из самой программы и текстуры из ImageBitmap / canvas / video / img.
 * Всё, что нужно эффекту-фильтру: один проход фрагментного шейдера по всему холсту.
 */

export type TextureSource = TexImageSource;

export type UniformValue = number | boolean | readonly number[] | Float32Array;

/** Вершинный шейдер полноэкранного треугольника: вершины из gl_VertexID, без буферов и атрибутов */
export const FULLSCREEN_VERTEX = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export class ShaderError extends Error {
  override name = 'ShaderError';
}

/**
 * Лог компилятора с кодом вокруг ошибки. Драйверы пишут `ERROR: 0:12: '…' : …` — номер строки
 * берётся оттуда, рядом печатаются три строки исходника с номерами, ошибочная помечена `>`.
 */
export function formatShaderLog(source: string, log: string): string {
  const lines = source.split('\n');
  const parts: string[] = [log.trim()];
  const seen = new Set<number>();

  for (const match of log.matchAll(/ERROR:\s*\d+:(\d+)/g)) {
    const line = Number(match[1]);

    if (!line || seen.has(line)) continue;

    seen.add(line);

    const from = Math.max(1, line - 1);
    const to = Math.min(lines.length, line + 1);

    for (let n = from; n <= to; n++) {
      parts.push(`${n === line ? '>' : ' '} ${String(n).padStart(3)} | ${lines[n - 1] ?? ''}`);
    }
  }

  return parts.join('\n');
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
  name: string,
): WebGLShader {
  const shader = gl.createShader(type);

  if (!shader) throw new ShaderError(`${name}: не удалось создать шейдер (контекст потерян?)`);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    const log = gl.getShaderInfoLog(shader) ?? '';

    gl.deleteShader(shader);
    throw new ShaderError(
      `${name}: ${type === gl.VERTEX_SHADER ? 'вершинный' : 'фрагментный'} шейдер не скомпилирован\n${formatShaderLog(source, log)}`,
    );
  }

  return shader;
}

interface UniformInfo {
  location: WebGLUniformLocation;
  type: number;
  size: number;
  /** Текстурный блок для сэмплера */
  unit: number;
}

export interface Program {
  name: string;
  program: WebGLProgram;
  uniforms: Map<string, UniformInfo>;
}

/** Программа из вершинного (по умолчанию — полноэкранный треугольник) и фрагментного шейдеров */
export function compileProgram(
  gl: WebGL2RenderingContext,
  name: string,
  fragment: string,
  vertex: string = FULLSCREEN_VERTEX,
): Program {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertex, name);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragment, name);
  const program = gl.createProgram();

  if (!program) throw new ShaderError(`${name}: не удалось создать программу`);

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  // Шейдеры после сборки не нужны: программа держит свой код сама
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
    const log = gl.getProgramInfoLog(program) ?? '';

    gl.deleteProgram(program);
    throw new ShaderError(`${name}: программа не собрана\n${log}`);
  }

  // Типы uniforms — из самой программы: вызывающему не нужно писать uniform3fv / uniform1i руками
  const uniforms = new Map<string, UniformInfo>();
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  let unit = 0;

  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);

    if (!info) continue;

    const location = gl.getUniformLocation(program, info.name);

    if (!location) continue;

    const isSampler = info.type === gl.SAMPLER_2D;

    // Массив `u_ramp[0]` приходит под именем с [0] — храним по базовому имени
    uniforms.set(info.name.replace(/\[0\]$/, ''), {
      location,
      type: info.type,
      size: info.size,
      unit: isSampler ? unit++ : -1,
    });
  }

  return { name, program, uniforms };
}

function toArray(value: UniformValue): Float32Array | number[] {
  if (typeof value === 'number') return [value];
  if (typeof value === 'boolean') return [value ? 1 : 0];

  return value instanceof Float32Array ? value : [...value];
}

/** Записать uniforms по их типам; неизвестные имена молча пропускаются — компилятор выкидывает неиспользуемые */
export function setUniforms(
  gl: WebGL2RenderingContext,
  program: Program,
  values: Record<string, UniformValue>,
): void {
  for (const [name, value] of Object.entries(values)) {
    const info = program.uniforms.get(name);

    if (!info) continue;

    const data = toArray(value);
    const { location } = info;

    switch (info.type) {
      case gl.FLOAT:
        gl.uniform1fv(location, data);
        break;
      case gl.FLOAT_VEC2:
        gl.uniform2fv(location, data);
        break;
      case gl.FLOAT_VEC3:
        gl.uniform3fv(location, data);
        break;
      case gl.FLOAT_VEC4:
        gl.uniform4fv(location, data);
        break;
      case gl.INT:
      case gl.BOOL:
        gl.uniform1iv(location, Array.from(data, Math.round));
        break;
      default:
        throw new ShaderError(`${program.name}: тип uniform ${name} не поддержан`);
    }
  }
}

export interface TextureOptions {
  /** Мип-уровни: шейдер берёт усреднённый цвет области (растр, свечение) через textureLod */
  mipmaps?: boolean;
}

/**
 * Загрузить источник в текстуру. Текстура переиспользуется между кадрами (`texImage2D` на тот же
 * объект) — новый объект на кадр видео копил бы память драйвера до сборки мусора.
 */
export function uploadTexture(
  gl: WebGL2RenderingContext,
  texture: WebGLTexture,
  unit: number,
  source: TextureSource,
  options: TextureOptions = {},
): void {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // Без переворота: строка 0 текстуры — верх картинки, шейдер сам считает uv сверху вниз. FLIP_Y не
  // действует на ImageBitmap в части браузеров, так что полагаться на него нельзя
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  if (options.mipmaps) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
}

/** Сэмплеры программы — на свои блоки; текстуры уже загружены `uploadTexture` в те же блоки */
export function bindSamplers(gl: WebGL2RenderingContext, program: Program): void {
  for (const info of program.uniforms.values()) {
    if (info.unit >= 0) gl.uniform1i(info.location, info.unit);
  }
}

/** Пустой VAO: WebGL2 требует привязанный массив вершин, даже если атрибутов нет */
export function drawFullscreenTriangle(gl: WebGL2RenderingContext, vao: WebGLVertexArrayObject) {
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindVertexArray(null);
}
