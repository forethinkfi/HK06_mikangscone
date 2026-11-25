import { describe, expect, it } from 'vitest';
import { advanceFlight, landingReaction, launchVelocity, releaseVelocity } from './throwMotion';

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

  it('moves farther from a faster release and reports which wall absorbed the impact', () => {
    const position = { x: 200, y: 150 };
    const light = advanceFlight({ position, velocity: { x: -220, y: 0 } }, 0.1, 700, 500);
    const strong = advanceFlight({ position, velocity: { x: -900, y: 0 } }, 0.1, 700, 500);
    expect(strong.position.x).toBeLessThan(light.position.x);
    const collision = advanceFlight(strong, 0.15, 700, 500);
    expect(collision).toMatchObject({ wall: 'left', wallSpeed: 900, landed: false });
    expect(collision.position.x).toBe(0);
    expect(collision.velocity.x).toBeGreaterThan(0);
  });

  it('distinguishes gentle throws, hard hits, and a stationary release', () => {
    expect(landingReaction(200, 240)).toBe('playful');
    expect(landingReaction(200, 650)).toBe('playful');
    expect(landingReaction(850, 720)).toBe('playful');
    expect(landingReaction(200, 950)).toBe('hurt');
    expect(landingReaction(560, 240, 490)).toBe('hurt');
    expect(landingReaction(0, 230)).toBeUndefined();
    expect(landingReaction(0, 360)).toBeUndefined();
    expect(landingReaction(0, 730)).toBe('hurt');
  });

  it('keeps a small flick when pointer-up repeats the final pose and ignores a stationary release', () => {
    const motion = [{ x: 180, y: 230, time: 20 }, { x: 185, y: 230, time: 68 }];
    expect(releaseVelocity([...motion, { x: 185, y: 230, time: 100 }]).x).toBeCloseTo(104.17);
    expect(releaseVelocity([...motion, { x: 185, y: 230, time: 180 }])).toEqual({ x: 0, y: 0 });
    expect(releaseVelocity([{ x: 180, y: 230, time: 20 }, { x: 182, y: 230, time: 50 }])).toEqual({ x: 0, y: 0 });
  });

  it('gives a gentle throw from the floor a short visible arc and keeps stationary drops vertical', () => {
    const velocity = { x: 100, y: 0 };
    let flight = advanceFlight({ position: { x: 200, y: 500 }, velocity: launchVelocity(velocity, 0) }, 0.016, 700, 500);
    expect(flight.landed).toBe(false);
    expect(flight.position.y).toBeLessThan(500);
    for (let i = 0; i < 25 && !flight.landed; i++) flight = advanceFlight(flight, 0.016, 700, 500);
    expect(flight.landed).toBe(true);
    expect(flight.position.x).toBeGreaterThan(225);
    expect(landingReaction(100, flight.landingSpeed)).toBe('playful');
    expect(launchVelocity({ x: 0, y: 0 }, 0)).toEqual({ x: 0, y: 0 });
  });

  it('recognizes a three-pixel flick after a brief delay before release', () => {
    const speed = releaseVelocity([{ x: 100, y: 200, time: 10 }, { x: 103, y: 200, time: 70 }, { x: 103, y: 200, time: 159 }]);
    expect(speed).toEqual({ x: 50, y: 0 });
    expect(launchVelocity(speed, 0)).toEqual({ x: 95, y: -205 });
  });

  it('extends the playful range to 1.7 times the original input threshold without boosting launch speed', () => {
    expect(landingReaction(1054, 250)).toBe('playful');
    expect(landingReaction(1055, 250)).toBeUndefined();
    expect(landingReaction(1054, 250, 490)).toBe('hurt');
    expect(launchVelocity({ x: 100, y: 0 }, 0)).toEqual({ x: 100, y: -205 });
    expect(launchVelocity({ x: -100, y: 0 }, 70)).toEqual({ x: -100, y: 0 });
    expect(launchVelocity({ x: 850, y: 0 }, 0)).toEqual({ x: 850, y: 0 });
  });
});
