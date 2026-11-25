import type { Vec2 } from './types';

export interface FishingPose { handle: Vec2; tip: Vec2; fish: Vec2; angle: number; scale: number }

export class FishingRig {
  private angle = 0;
  private speed = 0;
  private recoil = 0;
  private recoilSpeed = 0;

  wheel(delta: number) {
    this.speed = Math.max(-5, Math.min(5, this.speed + delta * 0.027));
  }

  tap(side: number) {
    this.speed += side * 2.5;
    this.recoilSpeed += 235;
  }

  update(pointer: Vec2, size: number, width: number, height: number, delta: number): FishingPose {
    const dt = Math.min(32, delta) / 1000;
    this.speed += (-14 * this.angle - 3.5 * this.speed) * dt;
    this.angle = Math.max(-1.15, Math.min(1.15, this.angle + this.speed * dt));
    this.recoilSpeed += (-75 * this.recoil - 11 * this.recoilSpeed) * dt;
    this.recoil = Math.max(0, this.recoil + this.recoilSpeed * dt);
    const side = pointer.x > width * 0.68 ? -1 : 1;
    const tip = { x: pointer.x + side * size * 0.39, y: pointer.y - size * 0.55 };
    const length = Math.max(size * 0.35, Math.min(size * 0.85, height - size * 0.18 - tip.y));
    return { handle: pointer, tip, angle: this.angle, scale: size / 120, fish: {
      x: Math.min(width - 12, Math.max(12, tip.x + Math.sin(this.angle) * length)),
      y: tip.y + Math.cos(this.angle) * length - this.recoil,
    } };
  }
}
