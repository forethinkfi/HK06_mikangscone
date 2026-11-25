import { describe, expect, it } from 'vitest';
import { canHitPet, petContact, petRebound, wallSide } from './petCollision';

describe('collisions caused by the player', () => {
  it('ignores passing walkers and lets a thrown pet hit a companion', () => {
    const from = { x: 20, y: 60 };
    const to = { x: 90, y: 60 };
    const target = { x: 80, y: 60, width: 20, height: 30 };
    expect(canHitPet(undefined, from, to, target)).toBe(false);
    expect(canHitPet('throw', from, to, target)).toBe(true);
    expect(petContact({ ...from, width: 20, height: 30 }, { x: 100, y: 0 }, target)).toEqual({ time: 0.4, normal: { x: -1, y: 0 } });
    expect(petContact({ ...from, width: 20, height: 30 }, { x: 100, y: 0 }, { ...target, y: 95 })).toBeUndefined();
  });

  it.each([-1, 1] as const)('knocks the next pet off the same wall from above (%s)', (side) => {
    const x = side < 0 ? 0 : 480;
    const from = { x, y: 120 };
    const target = { x, y: 170, width: 20, height: 20 };
    const to = { x, y: 200 };
    expect(wallSide(from, 20, 500, 300)).toBe(side);
    expect(wallSide({ x, y: 280 }, 20, 500, 300)).toBeUndefined();
    expect(canHitPet(side, from, to, target, side)).toBe(true);
    expect(canHitPet(side, from, to, target, side < 0 ? 1 : -1)).toBe(false);
    expect(canHitPet(side, to, from, target, side)).toBe(false);
    const contact = petContact({ ...from, width: 20, height: 20 }, { x: 0, y: 80 }, target);
    expect(contact).toEqual({ time: 0.375, normal: { x: 0, y: -1 } });
    const rebound = petRebound({ x: 0, y: 350 }, contact!.normal, side, side);
    expect(Math.sign(rebound.target.x)).toBe(-side);
    expect(rebound.target.y).toBeGreaterThan(0);
  });

  it('does not turn a fast glancing brush into a hard impact', () => {
    const normal = { x: -1, y: 0 };
    const brush = petRebound({ x: 70, y: 900 }, normal, 1);
    const hit = petRebound({ x: 800, y: 20 }, normal, 1);
    expect(brush.speed).toBe(70);
    expect(brush.target.x).toBeLessThan(hit.target.x / 3);
    expect(Math.abs(brush.target.y)).toBeLessThan(Math.abs(hit.target.y) / 2);
  });
});
