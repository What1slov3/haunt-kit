import type { Rgb, SceneColors } from './scene';

/*
 * Градиентная сетка («аврора») — ядро фона `mesh`. Несколько цветовых узлов плывут по фигурам
 * Лиссажу с несоизмеримыми частотами: картинка не повторяется заметно, а узлы не слипаются. Одни и
 * те же узлы получают и шейдер (uniforms), и запасной путь Canvas 2D — вид совпадает.
 */

export interface MeshNode {
  /** Центр в долях кадра 0…1 */
  x: number;
  y: number;
  /** Радиус в долях большей стороны */
  radius: number;
}

export const MESH_NODES = 4;

/** Узлы в момент `time` (с). `speed` 1 — полный «облёт» примерно за минуту */
export function meshNodes(time: number, speed = 1): MeshNode[] {
  const t = time * speed * 0.1;

  return Array.from({ length: MESH_NODES }, (_, i) => {
    const a = 0.7 + i * 0.37;
    const b = 0.5 + i * 0.29;

    return {
      x: 0.5 + 0.38 * Math.sin(t * a + i * 1.9),
      y: 0.5 + 0.34 * Math.cos(t * b + i * 2.7),
      radius: 0.45 + 0.12 * Math.sin(t * 0.6 + i),
    };
  });
}

/** Смещение узлов к точке пульса: сетка на мгновение «втягивается» к месту действия */
export function pullNodes(nodes: MeshNode[], x: number, y: number, amount: number): MeshNode[] {
  return nodes.map((node) => ({
    ...node,
    x: node.x + (x - node.x) * amount,
    y: node.y + (y - node.y) * amount,
  }));
}

/** Цвета узлов по порядку: акцент, второй и третий цвета пятен темы, второй акцент */
export function meshColors(colors: SceneColors): Rgb[] {
  return [colors.accent, colors.tint2, colors.accent2, colors.tint3];
}
