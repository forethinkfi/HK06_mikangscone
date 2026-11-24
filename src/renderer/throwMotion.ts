import type { Vec2 } from './types';

export interface PointerSample extends Vec2 { time: number }
export interface Flight { position: Vec2; velocity: Vec2 }

export function releaseVelocity(samples: PointerSample[]): Vec2 {
  const last = samples[samples.length - 1];
  if (!last) return { x: 0, y: 0 };
  const first = samples.find((sample) => last.time - sample.time <= 110) ?? last;
  const seconds = (last.time - first.time) / 1000;
  if (seconds < 0.008) return { x: 0, y: 0 };
  const x = (last.x - first.x) / seconds;
  const y = (last.y - first.y) / seconds;
  const speed = Math.hypot(x, y);
  const factor = speed < 150 ? 0 : Math.min(1, 1300 / speed);
  return { x: x * factor, y: y * factor };
}

export function advanceFlight(flight: Flight, dt: number, maxX: number, maxY: number) {
  const vy = flight.velocity.y + 1350 * dt;
  const x = flight.position.x + flight.velocity.x * dt;
  const y = flight.position.y + (vy + flight.velocity.y) * dt / 2;
  const wall = x < 0 || x > maxX;
  const ceiling = y < 0;
  const landed = y >= maxY && vy >= 0;
  return {
    position: { x: Math.max(0, Math.min(maxX, x)), y: Math.max(0, Math.min(maxY, y)) },
    velocity: { x: wall ? -flight.velocity.x * 0.38 : flight.velocity.x, y: ceiling ? -vy * 0.32 : vy },
    landed,
    impact: (wall && Math.abs(flight.velocity.x) > 220) || ((ceiling || landed) && Math.abs(vy) > 280),
  };
}
