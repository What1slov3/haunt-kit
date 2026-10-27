import { describe, expect, it } from 'vitest';

import { MESH_NODES, meshNodes, pullNodes } from './mesh';

describe('mesh', () => {
  it('узлы внутри кадра и плывут', () => {
    for (let t = 0; t < 600; t += 7) {
      const nodes = meshNodes(t);

      expect(nodes).toHaveLength(MESH_NODES);

      for (const node of nodes) {
        expect(node.x).toBeGreaterThan(0);
        expect(node.x).toBeLessThan(1);
        expect(node.y).toBeGreaterThan(0);
        expect(node.y).toBeLessThan(1);
        expect(node.radius).toBeGreaterThan(0);
      }
    }

    expect(meshNodes(0)).not.toEqual(meshNodes(5));
  });

  it('втягивание к точке пропорционально силе', () => {
    const [node] = pullNodes([{ x: 0, y: 0, radius: 0.5 }], 1, 1, 0.25);

    expect(node).toEqual({ x: 0.25, y: 0.25, radius: 0.5 });
  });
});
