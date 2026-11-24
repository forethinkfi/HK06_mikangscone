import { describe, expect, it } from 'vitest';
import { AnimationController } from './AnimationController';

describe('single illustration reactions', () => {
  it('uses different source rows for left, right and back while advancing walking frames', () => {
    const animation = new AnimationController();
    const sourceFrames = Array.from({ length: 8 }, (_, row) => Array.from({ length: 4 }, (_, col) => ({ sx: col * 24, sy: row * 40, sw: 24, sh: 40 })));
    animation.setAnimation({ sheet: 'walk.png', frameWidth: 24, frameHeight: 40, frameCount: 4, fps: 10, loop: true, sourceFrames });
    expect(animation.getCurrentFrameRect(2)?.sy).toBe(80);
    expect(animation.getCurrentFrameRect(6)?.sy).toBe(240);
    expect(animation.getCurrentFrameRect(4)?.sy).toBe(160);
    animation.update(200);
    expect(animation.getCurrentFrameRect(4)?.sx).toBe(48);
  });
  it('holds a one-frame reaction for its duration rather than ending immediately', () => {
    const animation = new AnimationController();
    animation.setAnimation({ sheet: 'pet.png', frameWidth: 475, frameHeight: 475, frameCount: 1, fps: 2, loop: false });
    animation.update(100);
    expect(animation.isFinished()).toBe(false);
    animation.update(400);
    expect(animation.isFinished()).toBe(true);
  });
});
