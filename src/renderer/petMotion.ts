import type { PetMotion, SpeciesConfig } from '../shared/speciesSchema';

export interface MotionCue {
  key: PetMotion;
  start: number;
  end: number;
  side: -1 | 1;
  strength: number;
}

export interface SpritePose {
  tilt: number;
  scaleX: number;
  scaleY: number;
  lift: number;
  wall?: -1 | 1;
  pivot?: 'center' | 'bottom';
}

const durations: Record<PetMotion, number> = {
  fly: Infinity, wallImpact: 145, wallFall: Infinity, petBump: 145,
  land: 170, ouch: 640, recover: 430,
  wake: 740, doze: 1150, curious: 880,
  peek: 640, slip: 430, look: 460, startle: 320, meet: 660,
  jump: Infinity, climb: Infinity,
  sideIdle: Infinity, wallIdle: Infinity, wallFront: Infinity, frontWalk: Infinity, backWalk: Infinity,
  toyWatch: 430, toyPounce: 460, toyLand: 330, toyAfter: 620, toyRod: Infinity, toyRodHit: 420,
};

export function personalityOf(species: SpeciesConfig) {
  return species.behavior.personality ?? (species.id === 'munchlax' ? 'relaxed' :
    species.id === 'psyduck' ? 'curious' : 'cautious');
}

export function motionCue(species: SpeciesConfig, key: PetMotion, now: number, side: -1 | 1 = 1, strength = 0): MotionCue {
  const clip = key !== 'wallImpact' || strength > 0.5 ? species.motions?.[key] : undefined;
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
  if (species.motions?.[key] && (key !== 'wallImpact' || strength > 0.5)) {
    if (key === 'wallImpact' || key === 'slip' || key === 'peek') return { tilt: 0, scaleX: 1, scaleY: 1, lift: 0, wall: side };
    return undefined;
  }
  const pose: SpritePose = { tilt: 0, scaleX: 1, scaleY: 1, lift: 0 };
  switch (key) {
    case 'fly': return { ...pose, tilt: side * (0.12 + strength * 0.26) + Math.sin(age / 100) * 0.11, pivot: 'center' };
    case 'wallImpact': return { ...pose, wall: side, tilt: side * (0.02 + strength * 0.05), scaleX: 0.98 - strength * 0.31, scaleY: 1 + strength * 0.08 };
    case 'petBump': return { ...pose, tilt: side * (0.06 + strength * 0.32), scaleX: 1 - strength * 0.16, scaleY: 1 + strength * 0.07, pivot: 'center' };
    case 'wallFall': return { ...pose, tilt: -side * (0.38 + Math.sin(age / 90) * 0.16), pivot: 'center' };
    case 'land': return { ...pose, scaleX: 1 + pulse * (0.07 + strength * 0.23), scaleY: 1 - pulse * (0.08 + strength * 0.24) };
    case 'ouch': return { ...pose, tilt: side * 0.13 * pulse, scaleY: 1 - pulse * 0.19 };
    case 'recover': return { ...pose, tilt: Math.sin(p * Math.PI * (personality === 'relaxed' ? 6 : 3)) * pulse * 0.17 };
    case 'wake': return { ...pose, scaleY: 1 + pulse * 0.17, scaleX: 1 - pulse * 0.05, tilt: Math.sin(p * Math.PI * 2) * 0.1 };
    case 'doze': return { ...pose, tilt: side * Math.sin(p * Math.PI * 3) ** 2 * 0.16, scaleY: 1 - 0.13 * p };
    case 'curious': return { ...pose, tilt: side * pulse * 0.18, scaleY: 1 - pulse * 0.05 };
    case 'peek': return { ...pose, wall: side, tilt: side * pulse * 0.21, scaleY: 1 - pulse * 0.1 };
    case 'slip': return { ...pose, wall: side, tilt: -side * pulse * 0.23, scaleY: 1 + pulse * 0.08 };
    case 'look': case 'meet': return { ...pose, tilt: side * pulse * 0.09 };
    case 'startle': return { ...pose, tilt: -side * pulse * 0.12, lift: pulse * 12, scaleY: 1 + pulse * 0.12 };
  }
}
