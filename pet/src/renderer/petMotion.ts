import type { PetMotion, SpeciesConfig } from '../shared/speciesSchema';
import type { PetState } from '../shared/petState';

export interface MotionCue {
  key: PetMotion;
  start: number;
  end: number;
  side: -1 | 1;
  strength: number;
  afterLanding?: PetMotion;
}

export interface SpritePose {
  tilt: number;
  scaleX: number;
  scaleY: number;
  lift: number;
  shiftX?: number;
  wall?: -1 | 1;
  pivot?: 'center' | 'bottom';
  anchor?: { x: number; y: number };
}

export type BodyBounds = [number, number, number, number];
const upright: SpritePose = { tilt: 0, scaleX: 1, scaleY: 1, lift: 0 };

/** Carry the size actually drawn across a cut while retaining the incoming drawing's pivot. */
export class FrameSizing {
  private previous?: BodyBounds;
  private width = 0;
  private height = 0;
  private start = 0;
  private duration = 0;
  private ratioX = 1;
  private ratioY = 1;

  observe(bounds: BodyBounds | undefined, pose?: SpritePose) {
    this.previous = bounds;
    this.duration = 0;
    if (bounds) {
      this.width = (bounds[2] - bounds[0]) * (pose?.scaleX ?? 1);
      this.height = (bounds[3] - bounds[1]) * (pose?.scaleY ?? 1);
    }
  }

  apply(bounds: BodyBounds, pose: SpritePose | undefined, now: number, duration: number,
    changedClip: boolean, floorMargin: number): SpritePose | undefined {
    const native = pose ?? upright;
    const width = (bounds[2] - bounds[0]) * native.scaleX;
    const height = (bounds[3] - bounds[1]) * native.scaleY;
    if (this.previous && (this.previous !== bounds || changedClip)) {
      this.ratioX = this.width / width;
      this.ratioY = this.height / height;
      this.start = now;
      this.duration = Math.max(Math.abs(this.ratioX - 1), Math.abs(this.ratioY - 1)) > .06 ? duration : 0;
    }
    this.previous = bounds;
    this.width = width;
    this.height = height;
    if (this.duration <= 0 || now - this.start >= this.duration) return pose;
    const t = (now - this.start) / this.duration;
    const remaining = 1 - t * t * (3 - 2 * t);
    const x = 1 + (this.ratioX - 1) * remaining;
    const y = 1 + (this.ratioY - 1) * remaining;
    this.width *= x;
    this.height *= y;
    const scaleY = native.scaleY * y;
    const lift = native.anchor || native.wall || native.pivot === 'center' ? native.lift :
      native.lift + floorMargin * (native.scaleY - scaleY);
    return { ...native, scaleX: native.scaleX * x, scaleY, lift };
  }
}

// Follow the midpoint between the feet in screen space, including reflection and body tilt.
function footprint(bounds: BodyBounds, pose: SpritePose, mirror: boolean, size: number, scale: number) {
  const [left, top, right, bottom] = bounds;
  const x = ((left + right) * scale / 2 - size / 2) * pose.scaleX;
  const y = (bottom * scale - size) * pose.scaleY;
  const cos = Math.cos(pose.tilt), sin = Math.sin(pose.tilt);
  return {
    x: (mirror ? -1 : 1) * (x * cos - y * sin + (pose.shiftX ?? 0)), y: x * sin + y * cos - pose.lift,
    width: (right - left) * scale * pose.scaleX, height: (bottom - top) * scale * pose.scaleY,
  };
}

export function transitionPoses(fromBounds: BodyBounds, fromPose: SpritePose | undefined, fromMirror: boolean,
  toBounds: BodyBounds, toPose: SpritePose | undefined, toMirror: boolean, size: number, scale: number, progress: number) {
  const a = footprint(fromBounds, fromPose ?? upright, fromMirror, size, scale);
  const b = footprint(toBounds, toPose ?? upright, toMirror, size, scale);
  const t = progress * progress * (3 - 2 * progress);
  const mix = (v: number, w: number) => v + (w - v) * t;
  const x = mix(a.x, b.x), y = mix(a.y, b.y);
  const width = mix(a.width, b.width), height = mix(a.height, b.height);
  function fit(bounds: BodyBounds, pose: SpritePose, mirror: boolean, geometry: typeof a) {
    const limit = (n: number) => Math.max(.76, Math.min(1.32, n));
    const result = { ...pose, scaleX: pose.scaleX * limit(width / geometry.width),
      scaleY: pose.scaleY * limit(height / geometry.height) };
    const foot = footprint(bounds, result, mirror, size, scale);
    result.shiftX = (pose.shiftX ?? 0) + (mirror ? -1 : 1) * (x - foot.x);
    result.lift += foot.y - y;
    return result;
  }
  return { from: fit(fromBounds, fromPose ?? upright, fromMirror, a), to: fit(toBounds, toPose ?? upright, toMirror, b) };
}

export function memoringPose(state: PetState, age: number, size: number, pace: number, grip?: SpritePose['anchor'], cue?: MotionCue): SpritePose {
  const neutral: SpritePose = { tilt: 0, scaleX: 1, scaleY: 1, lift: 0 };
  if (cue?.key === 'land') {
    const p = Math.min(1, Math.max(0, age / (cue.end - cue.start)));
    const squash = p < 0.28 ? Math.sin(p / 0.28 * Math.PI / 2) : Math.cos((p - 0.28) / 0.72 * Math.PI / 2);
    const rebound = Math.sin(Math.PI * Math.max(0, (p - 0.36) / 0.64));
    const weight = 0.09 + 0.12 * cue.strength;
    return { ...neutral, scaleX: 1 + squash * weight * 0.7 - rebound * 0.035, scaleY: 1 - squash * weight + rebound * 0.045 };
  }
  if (grip) {
    const swing = Math.sin(age / 88) * (0.052 + 0.095 * Math.exp(-age / 330));
    return { ...neutral, anchor: grip, tilt: swing, scaleY: 1 + Math.abs(swing) * 0.3 };
  }
  if (state === 'walk') {
    // Four drawings per stride. Keep the planted sole on the floor as the other passes.
    const stride = age * Math.PI * 2 / 400;
    return { ...neutral, tilt: pace * Math.sin(stride) * 0.012,
      scaleY: 1 - pace * (1 + Math.cos(stride * 2)) * 0.006 };
  }
  if (state === 'react') {
    const p = Math.min(1, age / 500);
    const bounce = Math.sin(p * Math.PI);
    return { ...neutral, lift: size * 0.065 * bounce, scaleY: 1 + bounce * 0.09,
      tilt: Math.sin(p * Math.PI * 2) * bounce * 0.09 };
  }
  const seconds = age / 1000;
  const asleep = state === 'sleep';
  const breath = (1 - Math.cos(seconds * (asleep ? 2 : 3))) / 2;
  return { ...neutral, scaleX: 1 + breath * (asleep ? 0.011 : -0.012), scaleY: 1 + breath * (asleep ? 0.025 : 0.031),
    tilt: asleep ? 0 : 0.019 * Math.sin(seconds * 2.1) };
}

const durations: Record<PetMotion, number> = {
  fly: Infinity, wallImpact: 145, wallFall: Infinity, petBump: 145,
  land: 170, ouch: 640, recover: 430,
  wake: 740, doze: 1150, curious: 880,
  jot: 770, stretch: 1050, bow: 960,
  stalk: 300, groom: 840, highFive: 2300, highFiveTap: 550, tea: 2500,
  offer: Infinity, receive: 700,
  peek: 640, slip: 430, look: 460, startle: 320, meet: 660,
  jump: Infinity, climb: Infinity,
  sideIdle: Infinity, wallIdle: Infinity, wallFront: Infinity, frontWalk: Infinity, backWalk: Infinity,
  fireBreath: 660,
  pokeLeft: 480, pokeRight: 480, pokeForehead: 480,
  grabLeft: Infinity, grabRight: Infinity,
  scratch: 440,
  wallCling: Infinity, landPrepare: Infinity,
  toyWatch: 430, toyPounce: 460, toyLand: 330, toyAfter: 620, toyRod: Infinity, toyRodHit: 420,
};

export function personalityOf(species: SpeciesConfig) {
  return species.behavior.personality ?? (species.id === 'munchlax' ? 'relaxed' :
    species.id === 'psyduck' ? 'curious' : 'cautious');
}

export function motionCue(species: SpeciesConfig, key: PetMotion, now: number, side: -1 | 1 = 1, strength = 0): MotionCue {
  const clip = species.motions?.[key];
  const base = key === 'wallImpact' || key === 'petBump' ? durations[key] * (0.52 + strength * 0.62) : durations[key];
  const timed = clip && !clip.loop && Number.isFinite(base) ? 1000 * clip.frameCount / clip.fps : base;
  const personality = personalityOf(species);
  const extra = key === 'recover' && personality === 'cautious' && !clip ? 240 : 0;
  return { key, start: now, end: now + timed + extra, side, strength };
}

export function poseFor(cue: MotionCue, now: number, species: SpeciesConfig): SpritePose | undefined {
  const { key, start, end, side, strength } = cue;
  const age = Math.max(0, now - start);
  const p = Math.min(1, age / (end - start));
  const pulse = Math.sin(p * Math.PI);
  const personality = personalityOf(species);
  if (key === 'wallImpact') {
    const pose = { tilt: 0, scaleX: 1, scaleY: 1, lift: 0, wall: side };
    if (species.id === 'mono-cat') return { ...pose, scaleX: 1 - 0.18 * pulse, scaleY: 1 + 0.09 * pulse, tilt: -side * pulse * 0.09 };
    if (species.id === 'block-dino') return { ...pose, tilt: -side * pulse * 0.26, scaleY: 1 - 0.14 * pulse };
    if (species.id === 'vintage-teddy') return { ...pose, tilt: side * pulse * 0.14, scaleY: 1 - 0.05 * pulse };
  }
  if (species.motions?.[key] && !['stretch', 'groom', 'offer', 'receive', 'tea'].includes(key)) {
    if (key === 'wallImpact' || key === 'wallCling' || key === 'slip' || key === 'peek') {
      return { tilt: 0, scaleX: 1, scaleY: 1, lift: 0, wall: side };
    }
    return undefined;
  }
  const pose: SpritePose = { tilt: 0, scaleX: 1, scaleY: 1, lift: 0 };
  if (species.id === 'basic-memoring' && (key === 'offer' || key === 'receive')) {
    // The paper above the folded arms is about 5% narrower on the receiving sheet.
    const reach = key === 'offer' ? Math.min(1, age / 150) : 1 - p;
    const dip = key === 'receive' ? pulse : 0;
    return { ...pose, scaleX: 1.05, scaleY: 1 - .025 * dip,
      tilt: .04 * reach + .035 * dip };
  }
  switch (key) {
    case 'stalk': return { ...pose, scaleY: 1 - .13 * pulse, tilt: side * .06 * pulse };
    case 'groom': return { ...pose, tilt: side * .055 * pulse * Math.sin(p * Math.PI * 4) };
    case 'offer': return species.id === 'mono-cat' ? pose :
      { ...pose, tilt: side * .065 * Math.min(1, age / 150), scaleY: 1 + .025 * Math.sin(age / 280) };
    case 'receive': return { ...pose, scaleX: 1 + .075 * pulse, scaleY: 1 - .12 * pulse, tilt: side * .045 * Math.sin(2 * Math.PI * p) };
    case 'highFiveTap': return { ...pose, lift: 8 * pulse, tilt: -side * .08 * pulse };
    case 'tea': return { ...pose, tilt: side * .08 * pulse, scaleY: 1 - .065 * pulse };
    case 'jot': return { ...pose, tilt: side * pulse * (0.07 + 0.08 * Math.sin(4 * Math.PI * p)), scaleY: 1 - 0.035 * pulse };
    case 'stretch': return { ...pose, scaleX: 1 - 0.08 * pulse, scaleY: 1 + 0.14 * pulse };
    case 'bow': {
      const dip = Math.sin(Math.PI * p) ** 2;
      return { ...pose, scaleY: 1 - 0.16 * dip, tilt: side * 0.07 * dip };
    }
    case 'fly': return { ...pose, tilt: side * (0.12 + strength * 0.26) + Math.sin(age / 100) * 0.11, pivot: 'center' };
    case 'wallImpact': return { ...pose, wall: side, tilt: side * (0.02 + strength * 0.05), scaleX: 0.98 - strength * 0.31, scaleY: 1 + strength * 0.08 };
    case 'petBump': return { ...pose, tilt: side * (0.06 + strength * 0.32), scaleX: 1 - strength * 0.16, scaleY: 1 + strength * 0.07, pivot: 'center' };
    case 'wallFall': return { ...pose, tilt: -side * (0.38 + Math.sin(age / 90) * 0.16), pivot: 'center' };
    case 'land': return { ...pose, scaleX: 1 + pulse * (0.07 + strength * 0.23), scaleY: 1 - pulse * (0.08 + strength * 0.24) };
    case 'ouch': return { ...pose, tilt: side * 0.13 * pulse, scaleY: 1 - pulse * 0.19 };
    case 'recover': return { ...pose, tilt: Math.sin(p * Math.PI * (personality === 'relaxed' ? 6 : 3)) * pulse * 0.17 };
    case 'wake': return { ...pose, scaleY: 1 + pulse * 0.065, scaleX: 1 - pulse * 0.025, tilt: Math.sin(p * Math.PI * 2) * 0.04 };
    case 'doze': return { ...pose, tilt: side * Math.sin(p * Math.PI * 2) ** 2 * 0.055, scaleY: 1 - 0.045 * pulse };
    case 'curious': return { ...pose, tilt: side * pulse * 0.18, scaleY: 1 - pulse * 0.05 };
    case 'peek': return { ...pose, wall: side, tilt: side * pulse * 0.21, scaleY: 1 - pulse * 0.1 };
    case 'slip': return { ...pose, wall: side, tilt: -side * pulse * 0.23, scaleY: 1 + pulse * 0.08 };
    case 'look': case 'meet': return { ...pose, tilt: side * pulse * 0.09 };
    case 'startle': return { ...pose, tilt: -side * pulse * 0.12, lift: pulse * 12, scaleY: 1 + pulse * 0.12 };
  }
}
