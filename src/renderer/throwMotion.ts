import type { Vec2 } from './types';

export interface PointerSample extends Vec2 { time: number }
export interface Flight { position: Vec2; velocity: Vec2 }
export const RELEASE_SAMPLE_WINDOW_MS = 160;

const FLOOR_HOP_SPEED_LIMIT = 620;
const GENTLE_THROW_SPEED_LIMIT = 1054;

export function landingReaction(throwSpeed: number, landingSpeed: number, wallSpeed = 0): 'hurt' | 'playful' | undefined {
  if (throwSpeed > 0 && throwSpeed <= GENTLE_THROW_SPEED_LIMIT) {
    return wallSpeed > 460 || landingSpeed > 820 ? 'hurt' : 'playful';
  }
  if (landingSpeed > 660 || wallSpeed > 460) return 'hurt';
  return undefined;
}

export function launchVelocity(velocity: Vec2, heightAboveFloor: number): Vec2 {
  const speed = Math.hypot(velocity.x, velocity.y);
  if (heightAboveFloor <= 20 && speed > 0 && speed < FLOOR_HOP_SPEED_LIMIT) {
    const x = Math.abs(velocity.x) >= Math.abs(velocity.y)
      ? Math.sign(velocity.x) * Math.max(95, Math.abs(velocity.x)) : velocity.x;
    return { x, y: Math.min(velocity.y, -205) };
  }
  return velocity;
}

export function releaseVelocity(samples: PointerSample[]): Vec2 {
  const stationary = { x: 0, y: 0 };
  const release = samples.at(-1);
  if (!release) return stationary;

  // Pointer-up can repeat the last pointer-move coordinates after a pause.
  let end = samples.length - 1;
  while (end > 0 && samples[end - 1].x === release.x && samples[end - 1].y === release.y) end--;
  const lastMove = samples[end];
  if (end === 0 || release.time - lastMove.time > 100) return stationary;

  const recent = samples.slice(0, end);
  const first = recent.find((sample) => lastMove.time - sample.time <= 60) ?? samples[end - 1];
  const seconds = (lastMove.time - first.time) / 1000;
  const dx = lastMove.x - first.x;
  const dy = lastMove.y - first.y;
  if (seconds < 0.008 || Math.hypot(dx, dy) < 3) return stationary;
  const x = dx / seconds;
  const y = dy / seconds;
  const speed = Math.hypot(x, y);
  const factor = speed < 48 ? 0 : Math.min(1, 1300 / speed);
  return { x: x * factor, y: y * factor };
}

export function advanceFlight(flight: Flight, dt: number, maxX: number, maxY: number) {
  const vy = flight.velocity.y + 1350 * dt;
  const x = flight.position.x + flight.velocity.x * dt;
  const y = flight.position.y + (vy + flight.velocity.y) * dt / 2;
  const crossesLeft = maxX > 0 && x <= 0 && flight.velocity.x < 0;
  const crossesRight = maxX > 0 && x >= maxX && flight.velocity.x > 0;
  const wall = crossesLeft ? 'left' : crossesRight ? 'right' : undefined;
  const ceiling = y < 0;
  const landed = y >= maxY && vy >= 0;
  const hardLanding = landed && vy > 660;
  const hardBump = (wall && Math.abs(flight.velocity.x) > 460) || (ceiling && vy < -460);
  return {
    position: { x: Math.max(0, Math.min(maxX, x)), y: Math.max(0, Math.min(maxY, y)) },
    velocity: { x: wall ? -flight.velocity.x * 0.38 : flight.velocity.x, y: ceiling ? -vy * 0.32 : vy },
    landed,
    wall,
    wallSpeed: wall ? Math.abs(flight.velocity.x) : 0,
    landingSpeed: landed ? vy : 0,
    impact: hardLanding || hardBump,
    hardLanding,
  };
}
