import type { PetState } from './petState';

export type PetMotion = 'fly' | 'wallImpact' | 'wallFall' | 'petBump' | 'land' | 'ouch' | 'recover' |
  'wake' | 'doze' | 'curious' | 'peek' | 'slip' | 'look' | 'startle' | 'meet' | 'jump' | 'climb' |
  'toyWatch' | 'toyPounce' | 'toyLand' | 'toyAfter' | 'toyRod' | 'toyRodHit' | 'sideIdle' | 'wallIdle' | 'wallFront' |
  'frontWalk' | 'backWalk' | 'fireBreath' |
  'pokeLeft' | 'pokeRight' | 'pokeForehead' | 'grabLeft' | 'grabRight' | 'scratch' |
  'wallCling' | 'landPrepare' | 'jot' | 'stretch' | 'bow' | 'stalk' | 'groom' |
  'highFive' | 'highFiveTap' | 'tea' | 'offer' | 'receive';
export type PetPersonality = 'relaxed' | 'cautious' | 'curious';

/**
 * A single animation's sprite-sheet definition. Frames are laid out left-to-right
 * in one row of `sheet`, each `frameWidth x frameHeight` pixels.
 */
export interface SpeciesAnimationDef {
  sheet: string;
  /** Optional authored left view with the same frame layout as the primary sheet. */
  leftSheet?: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: boolean;
  /** Optional motion applied to a single illustration without changing the asset. */
  motion?: 'breathe' | 'quietBreath' | 'waddle' | 'sway' | 'sleep' | 'bounce' | 'wriggle';
  effect?: 'rest' | 'sleep' | 'happy' | 'held';
  bottomInset?: number;
  pixelArt?: boolean;
  displaySize?: number;
  mirrorWhen?: 'left' | 'right' | 'always';
  /** Transparent horizontal margins of a static wall pose, in source pixels. */
  wallInsets?: { left: number; right: number };
  authoredGrip?: boolean;
  /** Extra sheet rows hold the dinosaur without its top block, then the block alone. */
  splitBlock?: boolean;
  /** Center of the visible mouth in each source frame. Omitted on rear views. */
  mouthCenters?: ([number, number] | null)[];
  /** Visible body edges per frame, excluding detached expression marks. A single entry is shared. */
  bodyBounds?: [number, number, number, number][];
  /** Stand at the height and foot line of the first walking frame. */
  matchWalkHeight?: boolean;
  /** Hand position on the unmirrored receiving frame, in source pixels. */
  receivePoint?: [number, number];
  sourceFrames?: { sx: number; sy: number; sw: number; sh: number }[][];
}

export interface SpeciesBehaviorDef {
  personality?: PetPersonality;
  throwReactions?: { playful: PetMotion; hurt: PetMotion };
  doubleClick?: 'fire' | 'chase' | 'ink' | 'hearts';
  greeting?: { motion: 'jot' | 'scratch' | 'fireBreath' | 'stretch' | 'bow'; line: string };
  /** Use the normal landing sequence even after a hard fall. */
  alwaysLandOnFeet?: boolean;
  /** Mouth position in the right-facing frame, with the first open frame index. */
  fireMouth?: { x: number; y: number; frame: number };
  /** Smallest transparent margin on each side across both edge-walk sheets, in source pixels. */
  sideWalkInsets?: { left: number; right: number };
  /** Fraction of the sprite scale lost at the far end of an edge walk. */
  sideWalkDepth?: number;
  walkSpeedPxPerSec: number;
  idleMinMs: number;
  idleMaxMs: number;
  walkMinMs: number;
  walkMaxMs: number;
  spriteScale: number;
}

export interface SpeciesAttribution {
  author: string;
  license: string;
  sourceUrl?: string;
}

/**
 * A playtime-gated unlock: once cumulative app-open runtime reaches
 * unlockAtMs, unlockedBehaviorStates become eligible idle-phase variants
 * (see BehaviorController.beginIdlePhase) and unlockedInteractions become
 * available (see InputController's isInteractionUnlocked checks, e.g. the
 * "poke" interaction id). Tiers are content, not engine config — new ones
 * need no code changes.
 */
export interface ProgressionTier {
  id: string;
  unlockAtMs: number;
  unlockedBehaviorStates: PetState[];
  unlockedInteractions: string[];
}

/**
 * The content contract for a creature. New creatures are added purely as new
 * files under assets/species/<id>/ plus one of these config objects — no
 * engine code changes required. This is the intended extension point for
 * swapping in real art later.
 */
export interface SpeciesConfig {
  fishingToy?: { handle: string; fish: string };
  companions?: SpeciesConfig[];
  chatter?: ChatterConfig;
  dialogue?: Pick<ChatterConfig, 'solo' | 'dialogues'> & {
    reply?: string;
    reactions?: Partial<Record<'grab' | 'bump' | 'landing' | 'playful' | 'photo' | 'text', string[]>>;
  };
  id: string;
  displayName: string;
  version: string;
  animations: Partial<Record<PetState, SpeciesAnimationDef>>;
  motions?: Partial<Record<PetMotion, SpeciesAnimationDef>>;
  behavior: SpeciesBehaviorDef;
  attribution?: SpeciesAttribution;
  progression?: ProgressionTier[];
}

export interface ChatterConfig {
  enabled: boolean;
  minIntervalSec: number;
  maxIntervalSec: number;
  bubbleSec: number;
  solo: string[];
  dialogues: [string, string][];
}

export function isSpeciesConfig(value: unknown): value is SpeciesConfig {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || typeof v.displayName !== 'string') return false;
  if (typeof v.version !== 'string') return false;
  if (typeof v.animations !== 'object' || v.animations === null) return false;
  if (v.fishingToy !== undefined) {
    if (typeof v.fishingToy !== 'object' || !v.fishingToy) return false;
    const toy = v.fishingToy as Record<string, unknown>;
    if (typeof toy.handle !== 'string' || !toy.handle || typeof toy.fish !== 'string' || !toy.fish) return false;
  }
  if (v.motions !== undefined) {
    if (typeof v.motions !== 'object' || !v.motions || Array.isArray(v.motions)) return false;
    for (const definition of Object.values(v.motions)) {
      if (typeof definition !== 'object' || !definition) return false;
      const clip = definition as Record<string, unknown>;
      if (typeof clip.sheet !== 'string' || !clip.sheet || typeof clip.loop !== 'boolean') return false;
      if (![clip.frameWidth, clip.frameHeight, clip.frameCount].every((n) => typeof n === 'number' && Number.isSafeInteger(n) && n > 0)) return false;
      if (typeof clip.fps !== 'number' || !Number.isFinite(clip.fps) || clip.fps <= 0) return false;
    }
  }
  if (typeof v.behavior !== 'object' || v.behavior === null) return false;
  const b = v.behavior as Record<string, unknown>;
  if (b.greeting !== undefined) {
    const greeting = b.greeting as Partial<NonNullable<SpeciesBehaviorDef['greeting']>> | null;
    if (!greeting || !['jot', 'scratch', 'fireBreath', 'stretch', 'bow'].includes(String(greeting.motion)) ||
        typeof greeting.line !== 'string') return false;
  }
  if (b.personality !== undefined && !['relaxed', 'cautious', 'curious'].includes(String(b.personality))) return false;
  if (b.alwaysLandOnFeet !== undefined && typeof b.alwaysLandOnFeet !== 'boolean') return false;
  const requiredBehaviorKeys: (keyof SpeciesBehaviorDef)[] = [
    'walkSpeedPxPerSec',
    'idleMinMs',
    'idleMaxMs',
    'walkMinMs',
    'walkMaxMs',
    'spriteScale',
  ];
  if (!requiredBehaviorKeys.every((key) => typeof b[key] === 'number')) return false;

  if (v.progression !== undefined) {
    if (!Array.isArray(v.progression)) return false;
    const validTier = (t: unknown): boolean => {
      if (typeof t !== 'object' || t === null) return false;
      const tier = t as Record<string, unknown>;
      return (
        typeof tier.id === 'string' &&
        typeof tier.unlockAtMs === 'number' &&
        Array.isArray(tier.unlockedBehaviorStates) &&
        Array.isArray(tier.unlockedInteractions)
      );
    };
    if (!v.progression.every(validTier)) return false;
  }

  return true;
}
