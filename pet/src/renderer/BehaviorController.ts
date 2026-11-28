import type { PetState } from '../shared/petState';
import type { SpeciesBehaviorDef } from '../shared/speciesSchema';
import type { PetStateMachine } from './PetStateMachine';
import type { Rect, Vec2 } from './types';

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// States BehaviorController treats as "waiting" (phase timer counts down,
// eventually starts a walk phase) rather than "moving" (walk) or
// externally driven (dragged/react).
const IDLE_LIKE: readonly PetState[] = ['idle', 'sit', 'sleep'];

/**
 * Timer-driven autonomous "AI": alternates idle-like/walk phases, moves the
 * pet within the work-area bounds, turning around at edges. Disabled while
 * the pet is being dragged or reacting to a poke; resumes (via a fresh
 * idle-like phase) once released/finished.
 */
export class BehaviorController {
  private position: Vec2;
  private direction: 1 | -1 = 1;
  private phaseRemainingMs = 0;
  private walkDurationMs = 0;

  constructor(
    private stateMachine: PetStateMachine,
    private behavior: SpeciesBehaviorDef,
    startPosition: Vec2,
    private getUnlockedIdleVariants: (position: Vec2) => PetState[] = () => ['idle'],
    private readonly initialPatrolDirection?: -1 | 1,
    private readonly walkEaseMs = 0,
  ) {
    this.position = { ...startPosition };
    this.direction = initialPatrolDirection ?? 1;
    this.beginIdlePhase();
  }

  getPosition(): Vec2 {
    return this.position;
  }

  setPosition(position: Vec2): void {
    this.position = position;
  }

  turnAround(): void {
    this.direction = this.direction === 1 ? -1 : 1;
  }

  /**
   * Hubs through 'idle' (always a legal transition per PetStateMachine's
   * table), then, if a variant other than plain idle gets picked, hops
   * there. 'idle' is weighted into the pick pool twice so unlocking sit/
   * sleep doesn't make the pet constantly switch poses.
   */
  private beginIdlePhase(variants = this.getUnlockedIdleVariants(this.position)): void {
    this.stateMachine.transition('idle');

    const pool: PetState[] = ['idle', ...variants];
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    if (chosen === 'sleep') {
      this.phaseRemainingMs = randomBetween(12000, 20000);
    } else if (chosen === 'sit') {
      this.phaseRemainingMs = randomBetween(5000, 8000);
    } else {
      this.phaseRemainingMs = randomBetween(this.behavior.idleMinMs, this.behavior.idleMaxMs);
    }
    if (chosen !== 'idle') this.stateMachine.transition(chosen);
  }

  private beginWalkPhase(): void {
    this.walkDurationMs = randomBetween(this.behavior.walkMinMs, this.behavior.walkMaxMs);
    this.phaseRemainingMs = this.walkDurationMs;
    if (this.initialPatrolDirection === undefined) this.direction = Math.random() < 0.5 ? -1 : 1;
    this.stateMachine.transition('idle');
    this.stateMachine.transition('walk');
  }

  /** Advances the idle/walk cycle along the floor. */
  update(deltaMs: number, bounds: Rect, spriteWidth: number): void {
    const state = this.stateMachine.getState();
    const isIdleLike = IDLE_LIKE.includes(state);
    if (!isIdleLike && state !== 'walk') return;

    this.phaseRemainingMs -= deltaMs;

    if (state === 'walk') {
      const middleOfStep = this.phaseRemainingMs + deltaMs / 2;
      const t = this.walkEaseMs > 0
        ? Math.max(0, Math.min(1, (this.walkDurationMs - middleOfStep) / this.walkEaseMs, middleOfStep / this.walkEaseMs))
        : 1;
      const pace = t * t * (3 - 2 * t);
      const deltaPx = this.behavior.walkSpeedPxPerSec * (deltaMs / 1000) * this.direction * pace;
      let nextX = this.position.x + deltaPx;

      const minX = bounds.x;
      const maxX = bounds.x + bounds.width - spriteWidth;
      if (nextX <= minX) {
        nextX = minX;
        this.direction = 1;
      } else if (nextX >= maxX) {
        nextX = maxX;
        this.direction = -1;
      }
      this.position = { ...this.position, x: nextX };
    }

    if (this.phaseRemainingMs <= 0) {
      if (isIdleLike) this.beginWalkPhase();
      else this.beginIdlePhase();
    }
  }

  /** Called when a drag interaction begins; halts autonomous movement. */
  interruptForDrag(): void {
    this.stateMachine.transition('dragged');
  }

  /** Called when a drag interaction ends; resumes autonomous behavior. */
  resumeAfterDrag(): void {
    this.beginIdlePhase(['idle']);
  }

  /** Triggered by a poke; only fires from an idle-like state. */
  react(): void {
    const state = this.stateMachine.getState();
    if (!IDLE_LIKE.includes(state)) return;
    if (state !== 'idle') this.stateMachine.transition('idle');
    this.stateMachine.transition('react');
  }

  /** Called once the react animation finishes playing (see main.ts's tick loop). */
  endReaction(): void {
    this.stateMachine.transition('idle');
    this.beginIdlePhase();
  }
}
