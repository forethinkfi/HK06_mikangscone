import { paperTexture } from './paperTexture';
import { advanceFlight, launchVelocity, releaseVelocity, RELEASE_SAMPLE_WINDOW_MS, type Flight, type PointerSample } from './throwMotion';
import type { Vec2 } from './types';

const SIZE = 62;
const MARGIN = 12;

export class EmptyRosterPaper {
  private readonly button = document.createElement('button');
  private position: Vec2 = { x: 0, y: 0 };
  private limits: Vec2 = { x: 0, y: 0 };
  private available = false;
  private flight?: Flight;
  private drag?: { id: number; down: Vec2; offset: Vec2; samples: PointerSample[]; moved: boolean };

  constructor(private open: (anchor: Vec2) => void) {
    const button = this.button;
    button.type = 'button';
    button.className = 'pet-empty-paper';
    button.hidden = true;
    button.setAttribute('aria-label', '종이 펼쳐 캐릭터 추가');
    button.title = '클릭해 펼치기 · 잡아서 던지기';
    button.style.setProperty('--paper-grain', paperTexture());
    document.body.append(button);
    button.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || !event.isPrimary || this.drag) return;
      const point = { x: event.clientX, y: event.clientY };
      this.flight = undefined;
      this.drag = { id: event.pointerId, down: point,
        offset: { x: point.x - this.position.x, y: point.y - this.position.y },
        samples: [{ ...point, time: event.timeStamp }], moved: false };
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointermove', (event) => this.move(event));
    button.addEventListener('pointerup', (event) => this.release(event));
    button.addEventListener('pointercancel', (event) => this.release(event));
    button.addEventListener('lostpointercapture', (event) => this.release(event));
    button.addEventListener('click', (event) => { if (event.detail === 0) this.activate(); });
    button.addEventListener('contextmenu', (event) => { event.preventDefault(); this.activate(); });
    window.addEventListener('blur', () => {
      if (!this.drag) return;
      this.drag = undefined;
      this.flight = { position: this.position, velocity: { x: 0, y: 0 } };
    });
  }

  captures(point: Vec2) {
    return !this.button.hidden && (!!this.drag || (point.x >= this.position.x && point.y >= this.position.y &&
      point.x <= this.position.x + SIZE && point.y <= this.position.y + SIZE));
  }

  update(available: boolean, menuOpen: boolean, width: number, height: number, delta: number) {
    this.button.hidden = !available || menuOpen;
    this.limits = { x: Math.max(0, width - SIZE - MARGIN), y: Math.max(0, height - SIZE - MARGIN) };
    if (!available) {
      this.available = false;
      this.flight = undefined;
      this.drag = undefined;
      return;
    }
    if (!this.available) {
      this.position = { ...this.limits };
      this.available = true;
    }
    if (this.flight && !menuOpen) {
      const step = advanceFlight(this.flight, delta / 1000, this.limits.x, this.limits.y);
      this.position = step.position;
      if (!step.landed) this.flight = step;
      else if (step.landingSpeed > 105) {
        this.flight = { position: step.position, velocity: { x: step.velocity.x * 0.68, y: -step.landingSpeed * 0.43 } };
      } else this.flight = undefined;
    }
    this.position = this.clamp(this.position);
    this.button.style.left = `${this.position.x}px`;
    this.button.style.top = `${this.position.y}px`;
    this.button.style.setProperty('--paper-tilt', `${Math.max(-38, Math.min(38, (this.flight?.velocity.x ?? 0) * 0.06))}deg`);
  }

  private clamp(point: Vec2): Vec2 {
    return { x: Math.max(0, Math.min(this.limits.x, point.x)), y: Math.max(0, Math.min(this.limits.y, point.y)) };
  }

  private activate() {
    this.flight = undefined;
    this.open({ x: this.position.x + SIZE / 2, y: this.position.y + SIZE / 2 });
  }

  private move(event: PointerEvent) {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.id) return;
    const point = { x: event.clientX, y: event.clientY };
    drag.samples = drag.samples.filter((sample) => event.timeStamp - sample.time <= RELEASE_SAMPLE_WINDOW_MS);
    drag.samples.push({ ...point, time: event.timeStamp });
    drag.moved ||= Math.hypot(point.x - drag.down.x, point.y - drag.down.y) >= 5;
    if (drag.moved) this.position = this.clamp({ x: point.x - drag.offset.x, y: point.y - drag.offset.y });
  }

  private release(event: PointerEvent) {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.id) return;
    const completed = event.type === 'pointerup';
    if (completed) this.move(event);
    this.drag = undefined;
    if (completed && !drag.moved) {
      this.activate();
      return;
    }
    const velocity = completed ? releaseVelocity(drag.samples) : { x: 0, y: 0 };
    this.flight = { position: this.position, velocity: launchVelocity(velocity, this.limits.y - this.position.y) };
  }
}
