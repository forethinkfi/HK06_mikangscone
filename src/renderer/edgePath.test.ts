import { describe, it, expect } from 'vitest';
import { edgeDimensions, edgePosition, nearestEdge } from './edgePath';

describe('screen edge route', () => {
  it('keeps every route position on the floor or a wall across monitor sizes', () => {
    for (const [w, h] of [[1440, 852], [1920, 1080], [800, 600]]) {
      const { length } = edgeDimensions(w, h, 110);
      for (let d = 0; d <= length; d += 13) {
        const p = edgePosition(d, w, h, 110);
        expect(p.x === 0 || p.x === w - 110 || p.y === h - 110).toBe(true);
      }
    }
  });
  it('snaps a center drop to the closest permitted edge', () => {
    const d = nearestEdge({ x: 700, y: 650 }, 1440, 852, 110);
    expect(edgePosition(d, 1440, 852, 110)).toEqual({ x: 700, y: 742 });
  });
});
