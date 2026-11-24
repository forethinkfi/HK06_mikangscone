import type { Vec2 } from './types';

/** A U-shaped route: left wall -> floor -> right wall. No route enters the center. */
export function edgeDimensions(width: number, height: number, size: number) {
  const wall = Math.max(0, height - size);
  const floor = Math.max(0, width - size);
  return { wall, floor, length: wall * 2 + floor };
}

export function edgePosition(distance: number, width: number, height: number, size: number): Vec2 {
  const { wall, floor, length } = edgeDimensions(width, height, size);
  const d = Math.max(0, Math.min(length, distance));
  if (d < wall) return { x: 0, y: d };
  if (d <= wall + floor) return { x: d - wall, y: wall };
  return { x: floor, y: length - d };
}

export function nearestEdge(point: Vec2, width: number, height: number, size: number): number {
  const { wall, floor, length } = edgeDimensions(width, height, size);
  const x = Math.max(0, Math.min(floor, point.x));
  const y = Math.max(0, Math.min(wall, point.y));
  const nearest = Math.min(x, floor - x, wall - y);
  if (nearest === wall - y) return wall + x;
  return nearest === x ? y : length - y;
}
