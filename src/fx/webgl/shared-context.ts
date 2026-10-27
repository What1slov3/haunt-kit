import {
  bindSamplers,
  compileProgram,
  drawFullscreenTriangle,
  setUniforms,
  ShaderError,
  uploadTexture,
  type Program,
  type TextureSource,
  type UniformValue,
} from './gl';
import {
  claimProbeContext,
  detectWebgl2,
  setWebglState,
  SHARED_CONTEXT_ATTRIBUTES,
} from './support';

/*
 * Один WebGL2-контекст на всю страницу, на холсте вне DOM. Эффект рисует в него проход шейдера и сразу
 * копирует результат в свой 2D-холст (`drawImage` — в Chromium копия GPU → GPU).
 *
 * Почему общий контекст, а не контекст на эффект или пул с вытеснением. Браузер даёт странице около 16
 * контекстов и при превышении молча теряет самый старый — галерея фильтров или витрина с десятком картинок
 * упиралась бы в лимит сразу. Пул с вытеснением теряет контекст как раз у видимого эффекта, а
 * пересоздание — это заново собрать программы и загрузить текстуры, на прокрутке пила из пересборок.
 * Общий контекст собирает каждую программу один раз на страницу, не упирается в лимит, а цена — копия
 * кадра в 2D-холст (на 640×360 — доли миллисекунды) и то, что эффекты рисуются по очереди (JS и так
 * однопоточный).
 *
 * Холст вне DOM — обычный `<canvas>`, не OffscreenCanvas: WebGL на OffscreenCanvas в Safari появился
 * только в 17, а семантика `drawImage` из него в ту же задачу у движков расходится.
 */

export interface ShaderPass {
  /** Ключ программы: собирается один раз и живёт до потери контекста */
  program: string;
  fragment: string;
  /** Размер результата в физических пикселях */
  width: number;
  height: number;
  /** Текстуры по имени сэмплера */
  textures: Record<string, { source: TextureSource; mipmaps?: boolean }>;
  uniforms: Record<string, UniformValue>;
}

/** Больше трёх потерь за сессию — драйвер нестабилен, дальше только запасной путь */
const MAX_LOSSES = 3;
/** Холст растёт только вверх (смена размера буфера — перевыделение памяти), но не больше этого */
const MAX_SIZE = 4096;

class SharedGl {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private vao: WebGLVertexArrayObject | null = null;
  private programs = new Map<string, Program>();
  private textures: WebGLTexture[] = [];
  private failed = new Set<string>();
  private lost = false;
  private losses = 0;

  constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.canvas = canvas;
    this.gl = gl;

    canvas.addEventListener('webglcontextlost', (event) => {
      // Без preventDefault браузер не будет восстанавливать контекст
      event.preventDefault();
      this.lost = true;
      this.losses += 1;
      this.programs.clear();
      this.textures = [];
      this.vao = null;
      setWebglState({ lost: true, broken: this.losses > MAX_LOSSES });
    });

    canvas.addEventListener('webglcontextrestored', () => {
      this.lost = false;
      // Все объекты GL прошлого контекста недействительны — программы соберутся заново при первом проходе
      setWebglState({ lost: false });
    });
  }

  get isLost(): boolean {
    return this.lost || this.gl.isContextLost();
  }

  private program(pass: ShaderPass): Program {
    const cached = this.programs.get(pass.program);

    if (cached) return cached;

    const program = compileProgram(this.gl, pass.program, pass.fragment);

    this.programs.set(pass.program, program);

    return program;
  }

  private texture(unit: number): WebGLTexture {
    let texture = this.textures[unit];

    if (!texture) {
      texture = this.gl.createTexture();
      this.textures[unit] = texture;
    }

    return texture;
  }

  private fit(width: number, height: number) {
    if (this.canvas.width < width) this.canvas.width = width;
    if (this.canvas.height < height) this.canvas.height = height;
  }

  /**
   * Нарисовать проход и скопировать его в `target` (2D-холст размером результата). false — рисовать
   * нечем: контекст потерян, программа не собралась, размер больше предела. Тогда эффект идёт по
   * запасному пути, а ошибка сборки печатается в консоль один раз.
   */
  render(target: HTMLCanvasElement, pass: ShaderPass): boolean {
    const { gl } = this;
    const width = Math.round(pass.width);
    const height = Math.round(pass.height);

    if (this.isLost || this.failed.has(pass.program)) return false;

    if (width < 1 || height < 1 || width > MAX_SIZE || height > MAX_SIZE) return false;

    let program: Program;

    try {
      program = this.program(pass);
    } catch (error) {
      if (!(error instanceof ShaderError)) throw error;

      this.failed.add(pass.program);
      console.error(error.message);

      return false;
    }

    this.vao ??= gl.createVertexArray();
    this.fit(width, height);
    gl.viewport(0, 0, width, height);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program.program);

    for (const [name, texture] of Object.entries(pass.textures)) {
      const unit = program.uniforms.get(name)?.unit ?? -1;

      if (unit >= 0) {
        uploadTexture(gl, this.texture(unit), unit, texture.source, { mipmaps: texture.mipmaps });
      }
    }

    bindSamplers(gl, program);
    setUniforms(gl, program, pass.uniforms);
    drawFullscreenTriangle(gl, this.vao);

    if (this.isLost) return false;

    if (target.width !== width || target.height !== height) {
      target.width = width;
      target.height = height;
    }

    const ctx = target.getContext('2d');

    if (!ctx) return false;

    // Проход занимает левый нижний угол буфера (начало координат GL — снизу), в координатах холста это
    // полоса у нижнего края. Копия — в ту же задачу, пока буфер не отдан композитору и не очищен
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(this.canvas, 0, this.canvas.height - height, width, height, 0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';

    return true;
  }

  /** Потерять и вернуть контекст через WEBGL_lose_context — проверка запасного пути в историях */
  simulateLoss(restoreAfterMs: number | null): boolean {
    const extension = this.gl.getExtension('WEBGL_lose_context');

    if (!extension) return false;

    extension.loseContext();

    if (restoreAfterMs !== null)
      window.setTimeout(() => extension.restoreContext(), restoreAfterMs);

    return true;
  }
}

let shared: SharedGl | null = null;

/** Общий контекст страницы; null — WebGL2 нет совсем */
export function getSharedGl(): SharedGl | null {
  if (shared) return shared;

  if (detectWebgl2() === 'none') return null;

  // Контекст проверки поддержки и есть общий: второй контекст ради проверки — лишний из ~16
  const claimed = claimProbeContext();
  let canvas = claimed?.canvas;
  let gl = claimed?.gl ?? null;

  if (!canvas || !gl) {
    canvas = document.createElement('canvas');
    gl = canvas.getContext('webgl2', SHARED_CONTEXT_ATTRIBUTES);
  }

  if (!gl) return null;

  shared = new SharedGl(canvas, gl);

  return shared;
}

/** Проход шейдера в 2D-холст `target`; false — идти по запасному пути */
export function renderShaderPass(target: HTMLCanvasElement, pass: ShaderPass): boolean {
  return getSharedGl()?.render(target, pass) ?? false;
}

/** Для историй и отладки: потерять общий контекст и (если задано) вернуть его через restoreAfterMs */
export function simulateContextLoss(restoreAfterMs: number | null = 600): boolean {
  return getSharedGl()?.simulateLoss(restoreAfterMs) ?? false;
}

/** Для историй, подменяющих getContext: забыть общий контекст, следующий проход создаст новый */
export function forgetSharedGl(): void {
  shared = null;
}
