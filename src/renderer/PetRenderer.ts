import type { SpeciesAnimationDef } from '../shared/speciesSchema';
import type { FrameRect } from './AnimationController';
import type { Vec2, Rect } from './types';

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
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
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
      width: def.frameWidth * scale,
      height: def.frameHeight * scale,
    };
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render(def: SpeciesAnimationDef, frame: FrameRect, position: Vec2, scale: number): void {
    const image = this.getImage(def.sheet);
    if (!image.complete || image.naturalWidth === 0) return;

    this.ctx.imageSmoothingEnabled = true;
    const time = performance.now() / 1000;
    const width = def.frameWidth * scale;
    const height = def.frameHeight * scale;
    const motion = def.motion;
    const wave = Math.sin(time * (motion === 'waddle' ? 9 : 3));
    const tilt = motion === 'waddle' ? wave * 0.045 : motion === 'sway' ? wave * 0.07 : 0;
    const lift = motion === 'bounce' ? Math.abs(Math.sin(time * 10)) * 12 :
      motion === 'waddle' ? Math.abs(wave) * 4 : 0;
    this.ctx.save();
    this.ctx.translate(position.x + width / 2, position.y + height - 12 - lift);
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
      -height + 12,
      width,
      height,
    );
    this.ctx.restore();
    const label = def.effect === 'sleep' ? 'Z z z' : def.effect === 'rest' ? '쉬는 중' : def.effect === 'happy' ? '♥' : def.effect === 'held' ? '어디 가?' : '';
    if (label) {
      this.ctx.save();
      this.ctx.font = def.effect === 'happy' ? 'bold 30px sans-serif' : 'bold 18px Malgun Gothic, sans-serif';
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
