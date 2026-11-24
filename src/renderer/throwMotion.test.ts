import { describe, expect, it } from 'vitest';
import { advanceFlight, releaseVelocity } from './throwMotion';

describe('throwing a pet', () => {
  it('uses recent pointer motion and drops straight down after a pause', () => {
    const motion = [{ x: 100, y: 300, time: 50 }, { x: 180, y: 260, time: 130 }];
    const velocity = releaseVelocity(motion);
    expect(velocity.x).toBeGreaterThan(0);
    expect(velocity.y).toBeLessThan(0);
    expect(releaseVelocity([...motion, { x: 180, y: 260, time: 300 }])).toEqual({ x: 0, y: 0 });
  });

  it('rebounds from a wall and eventually lands within the screen', () => {
    let flight = advanceFlight({ position: { x: 390, y: 120 }, velocity: { x: 700, y: -100 } }, 0.02, 400, 500);
    expect(flight.position.x).toBe(400);
    expect(flight.velocity.x).toBeLessThan(0);
    expect(flight.impact).toBe(true);
    for (let i = 0; i < 120 && !flight.landed; i++) flight = advanceFlight(flight, 0.016, 400, 500);
    expect(flight.landed).toBe(true);
    expect(flight.position.y).toBe(500);
  });
});
