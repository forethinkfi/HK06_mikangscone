import type { Rect, Vec2 } from './types';

export type CollisionPath = 'throw' | -1 | 1;

export function wallSide(position: Vec2, size: number, width: number, height: number): -1 | 1 | undefined {
  const right = width - size;
  if (right <= 0 || position.y >= height - size - 1) return undefined;
  if (position.x <= 8) return -1;
  if (position.x >= right - 8) return 1;
  return undefined;
}

export function canHitPet(path: CollisionPath | undefined, from: Vec2, to: Vec2, target: Vec2, targetWall?: -1 | 1): boolean {
  return path === 'throw' || (path !== undefined && path === targetWall && to.y > from.y && target.y > from.y);
}

function axisTimes(from: number, size: number, target: number, targetSize: number, travel: number): [number, number] {
  if (travel === 0) return from + size > target && from < target + targetSize ? [-Infinity, Infinity] : [Infinity, -Infinity];
  const start = (target - from - size) / travel;
  const end = (target + targetSize - from) / travel;
  return [Math.min(start, end), Math.max(start, end)];
}

export function petContact(from: Rect, travel: Vec2, target: Rect): { time: number; normal: Vec2 } | undefined {
  const [enterX, exitX] = axisTimes(from.x, from.width, target.x, target.width, travel.x);
  const [enterY, exitY] = axisTimes(from.y, from.height, target.y, target.height, travel.y);
  const enter = Math.max(enterX, enterY);
  const exit = Math.min(exitX, exitY);
  if (enter > 1 || enter >= exit || exit <= 0 || (!travel.x && !travel.y)) return undefined;
  const normal = enterX > enterY ? { x: -Math.sign(travel.x), y: 0 } : { x: 0, y: -Math.sign(travel.y) };
  if (enter < 0) {
    // A throw that begins in an overlap only hits while moving farther into it.
    const dx = target.x + target.width / 2 - from.x - from.width / 2;
    const dy = target.y + target.height / 2 - from.y - from.height / 2;
    if (travel.x * dx + travel.y * dy <= 0) return undefined;
  }
  return { time: Math.max(0, enter), normal };
}

export function petRebound(velocity: Vec2, normal: Vec2, side: -1 | 1, wall?: -1 | 1) {
  const along = velocity.x * normal.x + velocity.y * normal.y;
  const speed = Math.max(0, -along);
  return {
    speed,
    source: { x: velocity.x - 1.3 * along * normal.x, y: velocity.y - 1.3 * along * normal.y },
    target: wall ? { x: -wall * Math.min(110, 50 + speed * 0.1), y: Math.min(420, 40 + speed * 0.42) } :
      { x: side * Math.min(390, 28 + speed * 0.38), y: -Math.min(225, 55 + speed * 0.18) },
  };
}
