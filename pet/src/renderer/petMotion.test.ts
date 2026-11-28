import { describe, expect, it } from 'vitest';
import { FrameSizing, transitionPoses, type BodyBounds, type SpritePose } from './petMotion';

describe('grounded sprite transitions', () => {
  const walk: BodyBounds = [26, 14, 168, 188];
  const idle: BodyBounds = [10, 36, 182, 185];
  function geometry(b: BodyBounds, p: SpritePose, reflected: boolean) {
    return [
      (b[2] - b[0]) * p.scaleX, (b[3] - b[1]) * p.scaleY,
      (reflected ? -1 : 1) * (((b[0] + b[2]) / 2 - 96) * p.scaleX + (p.shiftX ?? 0)),
      (b[3] - 192) * p.scaleY - p.lift,
    ];
  }
  it('meets at the same silhouette size and foot position when the drawing switches', () => {
    const pair = transitionPoses(walk, undefined, true, idle, undefined, false, 192, 1, .5);
    const a = geometry(walk, pair.from, true), b = geometry(idle, pair.to, false);
    a.forEach((value, index) => expect(value).toBeCloseTo(b[index]));
    expect(a[1]).toBeCloseTo((174 + 149) / 2);
  });
  it('starts and ends at the original drawings, including their breathing pose', () => {
    const breath = { tilt: .02, scaleX: .99, scaleY: 1.03, lift: 1 };
    const start = transitionPoses(walk, breath, false, idle, undefined, true, 72, .375, 0);
    expect(start.from).toEqual({ ...breath, shiftX: 0 });
    const end = transitionPoses(walk, breath, false, idle, undefined, true, 72, .375, 1);
    expect(end.to.scaleX).toBeCloseTo(1);
    expect(end.to.scaleY).toBeCloseTo(1);
    expect(end.to.lift).toBeCloseTo(0);
    expect(end.to.shiftX).toBeCloseTo(0);
  });
});

describe('scale changes inside a playing clip', () => {
  it('unfolds the landing drawing from the displayed height, even across a second cut', () => {
    const sizing = new FrameSizing();
    const low: BodyBounds = [50, 69, 140, 190], standing: BodyBounds = [47, 41, 145, 192];
    sizing.observe(low);
    const start = sizing.apply(standing, undefined, 100, 80, false, 0)!;
    expect(start.scaleY * 151).toBeCloseTo(121);
    const mid = sizing.apply(standing, undefined, 140, 80, false, 0)!;
    expect(mid.scaleY * 151).toBeCloseTo(136);
    const next = sizing.apply(low, undefined, 145, 80, false, 2)!;
    expect(next.scaleY * 121).toBeCloseTo(136);
    expect(next.lift).toBeCloseTo(2 * (1 - next.scaleY));
    expect(sizing.apply(low, undefined, 225, 80, false, 2)).toBeUndefined();
  });

  it('retains the cursor pivot and wall contact through a clip change', () => {
    const b: BodyBounds = [32, 37, 131, 186];
    for (const contact of [{anchor: {x: 29, y: 12}}, {wall: -1 as const}]) {
      const sizing = new FrameSizing();
      sizing.observe([25, 20, 170, 190]);
      const pose = { ...contact, tilt: .08, lift: 0, scaleX: 1, scaleY: 1 };
      const first = sizing.apply(b, pose, 0, 90, true, 6);
      expect(first).toMatchObject({ ...contact, tilt: .08, lift: 0 });
      expect(sizing.apply(b, pose, 95, 90, false, 6)).toBe(pose);
    }
  });
});
