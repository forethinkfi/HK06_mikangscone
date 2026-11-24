import { describe, expect, it } from 'vitest';
import { AnimationController } from './AnimationController';

describe('single illustration reactions', () => {
  it('holds a one-frame reaction for its duration rather than ending immediately', () => {
    const animation = new AnimationController();
    animation.setAnimation({ sheet: 'pet.png', frameWidth: 475, frameHeight: 475, frameCount: 1, fps: 2, loop: false });
    animation.update(100);
    expect(animation.isFinished()).toBe(false);
    animation.update(400);
    expect(animation.isFinished()).toBe(true);
  });
});
