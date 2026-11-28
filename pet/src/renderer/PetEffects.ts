import type { SpeciesBehaviorDef } from '../shared/speciesSchema';
import type { Vec2 } from './types';

type Burst = Exclude<NonNullable<SpeciesBehaviorDef['doubleClick']>, 'chase' | 'shellGift'>;
type Particle = { kind: Burst; origin: Vec2; velocity: Vec2; start: number; life: number; size: number; color: string };
const FIRE_JET_MS = 300;

export class PetEffects {
  private particles: Particle[] = [];
  private jets: { origin: Vec2; side: -1 | 1; start: number }[] = [];
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(private ctx: CanvasRenderingContext2D) {}

  burst(kind: Burst, origin: Vec2, side: -1 | 1, now: number) {
    if (kind === 'fire') this.jets.push({ origin, side, start: now });
    const count = this.reducedMotion.matches ? 6 : { fire: 29, ink: 22, hearts: 8 }[kind];
    const colors = { fire: ['#fff1a5', '#ffc331', '#ff751d', '#e94820'], ink: ['#201833', '#342648', '#4a3265'], hearts: ['#fa7799', '#e95075', '#ff9aaa'] }[kind];
    for (let i = 0; i < count; i++) {
      const speed = (kind === 'fire' ? 150 : 80) + Math.random() * (kind === 'ink' ? 220 : 130);
      const spread = Math.random() - .5;
      const velocity = kind === 'fire' ? { x: side * speed, y: spread * speed * .64 - 23 } :
        { x: spread * (kind === 'ink' ? 170 : 108), y: -speed };
      this.particles.push({ kind, origin, velocity, start: now + i * (kind === 'fire' ? 11 : 8),
        life: kind === 'fire' ? 350 + Math.random() * 310 : 610 + Math.random() * 460,
        size: (kind === 'ink' ? 3 : 5) + Math.random() * (kind === 'hearts' ? 8 : 10), color: colors[i % colors.length] });
    }
  }

  draw(now: number) {
    this.particles = this.particles.filter(({ start, life }) => now < start + life);
    this.jets = this.jets.filter(({ start }) => now < start + FIRE_JET_MS);
    if (!this.particles.length && !this.jets.length) return;
    const ctx = this.ctx;
    ctx.save();
    for (const { origin, side, start } of this.jets) {
      const age = now - start;
      if (age < 0) continue;
      const extent = Math.min(1, .2 + age / 105);
      ctx.save();
      ctx.translate(origin.x, origin.y);
      ctx.scale(side * extent, extent);
      ctx.globalAlpha = Math.min(1, (FIRE_JET_MS - age) / 100);
      ctx.fillStyle = '#f35e20';
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(22, -10);
      ctx.lineTo(35, -7);
      ctx.lineTo(65, -15);
      ctx.lineTo(54, -4);
      ctx.lineTo(79, -1);
      ctx.lineTo(54, 8);
      ctx.lineTo(39, 6);
      ctx.lineTo(23, 10);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffcd49';
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(29, -4);
      ctx.lineTo(59, -2);
      ctx.lineTo(35, 4);
      ctx.lineTo(18, 3);
      ctx.lineTo(0, 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    for (const { kind, origin, velocity, start, life, size, color } of this.particles) {
      if (now < start) continue;
      const progress = (now - start) / life;
      const t = (now - start) / 1000;
      const x = origin.x + velocity.x * t;
      const y = origin.y + velocity.y * t + (kind === 'ink' ? 270 : kind === 'hearts' ? 60 : -28) * t * t;
      const radius = size * (kind === 'ink' ? 1 - progress * .52 : 1 + progress * .45);
      ctx.globalAlpha = (1 - progress) ** 1.3;
      ctx.fillStyle = color;
      ctx.beginPath();
      if (kind === 'hearts') {
        ctx.moveTo(x, y + radius * .78);
        ctx.bezierCurveTo(x - radius * 2, y - radius * .47, x - radius * .55, y - radius * 1.4, x, y - radius * .42);
        ctx.bezierCurveTo(x + radius * .55, y - radius * 1.4, x + radius * 2, y - radius * .47, x, y + radius * .78);
      } else {
        ctx.ellipse(x, y, radius * (kind === 'fire' ? 1.65 : .75), radius, velocity.x / 700, 0, Math.PI * 2);
        if (kind === 'ink') {
          ctx.strokeStyle = '#987fba';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.fill();
    }
    ctx.restore();
  }
}
