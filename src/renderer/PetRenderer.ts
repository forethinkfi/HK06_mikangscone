import type { SpeciesAnimationDef } from '../shared/speciesSchema';
import type { FrameRect } from './AnimationController';
import type { Vec2, Rect } from './types';
import type { SpritePose } from './petMotion';
import type { FishingPose } from './FishingRig';

export class PetRenderer {
  private ctx: CanvasRenderingContext2D;
  private imageCache = new Map<string, HTMLImageElement>();

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('PetRenderer: 2D context unavailable');
    this.ctx = ctx;
    this.resizeToWindow();
    window.addEventListener('resize', () => this.resizeToWindow());
  }

  private resizeToWindow(): void {
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(window.innerWidth * ratio);
    this.canvas.height = Math.round(window.innerHeight * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  private getImage(sheetUrl: string): HTMLImageElement {
    let img = this.imageCache.get(sheetUrl);
    if (!img) {
      img = new Image();
      img.src = sheetUrl;
      this.imageCache.set(sheetUrl, img);
    }
    return img;
  }

  /**
   * Drops all cached Image elements. Call when a species (re)loads —
   * without this, editing a local species' sprite file while the app is
   * running (see speciesLoader.ts's watchSpecies) would keep showing the
   * stale decoded bitmap for that URL even though a fresh species.json
   * was correctly re-sent, since this cache is keyed by URL string alone.
   */
  clearCache(): void {
    this.imageCache.clear();
  }

  /** Returns the on-screen bounds of the sprite at `position`, for hit-testing. */
  getSpriteBounds(def: SpeciesAnimationDef, position: Vec2, scale: number): Rect {
    return {
      x: position.x,
      y: position.y,
      width: def.displaySize ?? def.frameWidth * scale,
      height: def.displaySize ?? def.frameHeight * scale,
    };
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderFishingRig(assets: { handle: string; fish: string }, { handle, tip, fish, angle, scale }: FishingPose) {
    const pole = this.getImage(assets.handle);
    const lure = this.getImage(assets.fish);
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(handle.x, handle.y);
    const dx = tip.x - handle.x;
    const dy = tip.y - handle.y;
    if (pole.complete && pole.naturalWidth) {
      const factor = Math.hypot(dx, dy) / Math.hypot(pole.width, pole.height);
      ctx.scale(dx < 0 ? -1 : 1, 1);
      ctx.rotate(Math.atan2(dy, Math.abs(dx)) + Math.atan2(pole.height, pole.width));
      ctx.drawImage(pole, 0, -pole.height * factor, pole.width * factor, pole.height * factor);
    }
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = '#433a34';
    ctx.lineWidth = Math.max(1.25, 1.8 * scale);
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.quadraticCurveTo((tip.x + fish.x) / 2 - angle * 12 * scale, (tip.y + fish.y) / 2, fish.x, fish.y - 9 * scale);
    ctx.stroke();
    if (lure.complete && lure.naturalWidth) {
      const height = 30 * scale;
      const width = height * lure.width / lure.height;
      ctx.translate(fish.x, fish.y - 9 * scale);
      ctx.rotate(-angle * 0.65);
      ctx.drawImage(lure, -width / 2, 0, width, height);
    }
    ctx.restore();
  }

  getPaintBounds(def: SpeciesAnimationDef, frame: FrameRect, position: Vec2, scale: number): Rect {
    const size = def.displaySize ?? def.frameWidth * scale;
    return { x: position.x + (size - frame.sw * scale) / 2,
      y: position.y + size - frame.sh * scale, width: frame.sw * scale, height: frame.sh * scale };
  }

  private poseGeometry(def: SpeciesAnimationDef, frame: FrameRect, position: Vec2, scale: number, pose: SpritePose, footprint: number) {
    const box = def.pixelArt ? this.getPaintBounds(def, frame, position, scale) :
      { ...this.getSpriteBounds(def, position, scale), y: position.y + (def.bottomInset ?? 0) * scale };
    const px = box.width / 2;
    const py = pose.pivot === 'center' ? box.height / 2 : box.height;
    const cos = Math.cos(pose.tilt);
    const sin = Math.sin(pose.tilt);
    const corners = [[-px, -py], [box.width - px, -py], [-px, box.height - py], [box.width - px, box.height - py]];
    const xs = corners.map(([x, y]) => x * pose.scaleX * cos - y * pose.scaleY * sin);
    const ys = corners.map(([x, y]) => x * pose.scaleX * sin + y * pose.scaleY * cos);
    const left = Math.min(...xs); const right = Math.max(...xs);
    const top = Math.min(...ys); const bottom = Math.max(...ys);
    const x = pose.wall === -1 ? position.x - left : pose.wall === 1 ? position.x + footprint - right : box.x + px;
    const y = box.y + py - pose.lift;
    return { box, px, py, x, y, bounds: { x: x + left, y: y + top, width: right - left, height: bottom - top } };
  }

  getPoseBounds(def: SpeciesAnimationDef, frame: FrameRect, position: Vec2, scale: number, pose: SpritePose, footprint: number): Rect {
    return this.poseGeometry(def, frame, position, scale, pose, footprint).bounds;
  }

  render(def: SpeciesAnimationDef, frame: FrameRect, position: Vec2, scale: number, grip?: Vec2, pose?: SpritePose, footprint = 0, mirror = false): void {
    if (mirror) {
      this.ctx.save();
      this.ctx.translate(position.x * 2 + footprint, 0);
      this.ctx.scale(-1, 1);
      const reflectedPose = pose?.wall ? { ...pose, wall: pose.wall === -1 ? 1 as const : -1 as const } : pose;
      this.render(def, frame, position, scale, grip, reflectedPose, footprint);
      this.ctx.restore();
      return;
    }
    const image = this.getImage(def.sheet);
    if (!image.complete || image.naturalWidth === 0) return;

    if (grip && !def.authoredGrip) {
      const box = def.pixelArt ? this.getPaintBounds(def, frame, position, scale) : {
        x: position.x, y: position.y, width: frame.sw * scale, height: frame.sh * scale,
      };
      const beat = Math.sin(performance.now() * 0.008);
      this.ctx.save();
      this.ctx.imageSmoothingEnabled = !def.pixelArt;
      this.ctx.translate(position.x + grip.x, position.y + grip.y);
      this.ctx.rotate(beat * 0.09);
      const split = Math.floor(frame.sh * 0.62);
      const upperHeight = box.height * split / frame.sh;
      const x = box.x - position.x - grip.x;
      const y = box.y - position.y - grip.y;
      if (split > 0) {
        this.ctx.drawImage(image, frame.sx, frame.sy, frame.sw, split, x, y, box.width, upperHeight);
      }
      this.ctx.drawImage(image, frame.sx, frame.sy + split, frame.sw, frame.sh - split,
        x + beat * 1.4, y + upperHeight - Math.abs(beat), box.width, box.height - upperHeight);
      this.ctx.restore();
      return;
    }

    if (pose) {
      const { box, px, py, x, y } = this.poseGeometry(def, frame, position, scale, pose, footprint);
      this.ctx.save();
      this.ctx.imageSmoothingEnabled = !def.pixelArt;
      this.ctx.translate(x, y);
      this.ctx.rotate(pose.tilt);
      this.ctx.scale(pose.scaleX, pose.scaleY);
      this.ctx.drawImage(image, frame.sx, frame.sy, frame.sw, frame.sh, -px, -py, box.width, box.height);
      this.ctx.restore();
      return;
    }

    if (def.pixelArt) {
      const box = this.getPaintBounds(def, frame, position, scale);
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(image, frame.sx, frame.sy, frame.sw, frame.sh, Math.round(box.x), Math.round(box.y), box.width, box.height);
      return;
    }

    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    const time = performance.now() / 1000;
    const width = def.frameWidth * scale;
    const height = def.frameHeight * scale;
    const motion = def.motion;
    const wave = Math.sin(time * (motion === 'waddle' ? 9 : 3));
    const tilt = motion === 'waddle' ? wave * 0.045 : motion === 'sway' ? wave * 0.07 : 0;
    const lift = 0;
    this.ctx.save();
    this.ctx.translate(position.x + width / 2, position.y + height + (def.bottomInset ?? 0) * scale - lift);
    this.ctx.rotate(tilt);
    if (def.effect === 'rest') this.ctx.scale(1.06, 0.9);
    if (def.effect === 'sleep') {
      this.ctx.rotate(-0.18);
      this.ctx.scale(1.02, 0.85);
    }
    if (motion === 'breathe' || motion === 'sleep') {
      this.ctx.scale(1 + wave * 0.008, 1 + wave * 0.015);
    }
    this.ctx.drawImage(
      image,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      -width / 2,
      -height,
      width,
      height,
    );
    this.ctx.restore();
    const label = def.effect === 'sleep' ? 'Z z z' : def.effect === 'rest' ? '쉬는 중' : def.effect === 'happy' ? '♥' : def.effect === 'held' ? '어디 가?' : '';
    if (label) {
      this.ctx.save();
      this.ctx.font = def.effect === 'happy' ? '30px sans-serif' : '28px Dongle, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.lineWidth = 5;
      this.ctx.strokeStyle = '#fffdf5';
      this.ctx.fillStyle = def.effect === 'happy' ? '#d45f7f' : '#365c69';
      const x = position.x + width * 0.7;
      const y = Math.max(30, position.y + 10 + wave * 4);
      this.ctx.strokeText(label, x, y);
      this.ctx.fillText(label, x, y);
      this.ctx.restore();
    }
  }
}
