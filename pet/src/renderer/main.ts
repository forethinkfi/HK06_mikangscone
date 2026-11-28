import { TipHistory, voiceTip } from './featureTips';
import type { FeatureTip } from '../shared/ipcContract';
import '../../../src/drop-content.js';
import type { SpeciesConfig, ChatterConfig, PetMotion, SpeciesAnimationDef } from '../shared/speciesSchema';
import type { PetState } from '../shared/petState';
import { PetStateMachine } from './PetStateMachine';
import { AnimationController, type FrameRect } from './AnimationController';
import { PetRenderer } from './PetRenderer';
import { PetEffects } from './PetEffects';
import { PetQuickMenu } from './PetQuickMenu';
import { EmptyRosterPaper } from './EmptyRosterPaper';
import { FishingRig, type FishingPose } from './FishingRig';
import { BehaviorController } from './BehaviorController';
import { advanceFlight, landingReaction, launchVelocity, releaseVelocity, RELEASE_SAMPLE_WINDOW_MS, type PointerSample, type Flight } from './throwMotion';
import type { Rect, Vec2 } from './types';
import { FrameSizing, memoringPose, motionCue, personalityOf, poseFor, transitionPoses, type BodyBounds, type MotionCue, type SpritePose } from './petMotion';
import { MAX_DROPPED_PHOTOS, MAX_PHOTO_DROP_BYTES, type DroppedPhoto } from '../shared/ipcContract';

interface SpriteLayer {
  clip: SpeciesAnimationDef;
  frame: FrameRect;
  pose?: SpritePose;
  mirror?: boolean;
  bounds?: BodyBounds;
}

interface Companion {
  original: SpeciesConfig;
  paused: boolean;
  flight?: Flight;
  species: SpeciesConfig;
  state: PetStateMachine;
  animation: AnimationController;
  behavior: BehaviorController;
  bubble: HTMLDivElement;
  until: number;
  speakingUntil: number;
  speechStart?: number;
  facing: number;
  cue?: MotionCue;
  clip?: SpeciesAnimationDef;
  playbackKey?: PetMotion | PetState;
  playbackStartedAt: number;
  pose?: SpritePose;
  mirror?: boolean;
  turnUntil?: number;
  transition?: { from: SpriteLayer; start: number; duration: number; dominant?: SpriteLayer };
  nextCueAt: number;
  nextLookAt: number;
  pointerDistance: number;
  reactionUntil: number;
  chasing?: boolean;
  huntAim?: Vec2;
  missedSwipe?: boolean;
  nextSwipe?: number;
  invitation?: { since: number; point: Vec2 };
  inviteAfter?: number;
  meal?: 'photo' | 'text';
  looseBlockAt?: number;
  lastThrow?: { speed: number; wallSpeed: number };
  sizing: FrameSizing;
  nextBurstAt?: number;
  firePending?: boolean;
  toyPlay?: { origin: Vec2; position: Vec2; strike: Vec2; aim: Vec2; side: -1 | 1; hit: boolean };
}

let petSize = 72;
const BRIEFING_HOLD_MS = 1000;

function sizeSpecies(species: SpeciesConfig): SpeciesConfig {
  const idle = species.animations.idle;
  const scale = species.behavior.spriteScale;
  const ratio = petSize / (idle?.displaySize ?? (idle?.frameWidth ?? 475) * scale);
  function resizeClips<T extends Partial<Record<string, SpeciesAnimationDef>>>(clips: T): T {
    return Object.fromEntries(Object.entries(clips).map(([key, clip]) => [
      key, clip?.displaySize ? { ...clip, displaySize: clip.displaySize * ratio } : clip,
    ])) as T;
  }
  return { ...species, behavior: { ...species.behavior, spriteScale: scale * ratio },
    animations: resizeClips(species.animations), motions: species.motions && resizeClips(species.motions) };
}

function positionSpeech(el: HTMLElement, center: number, top: number, bottom: number, bounds: Rect) {
  const width = el.offsetWidth, height = el.offsetHeight;
  const x = Math.max(12, Math.min(bounds.width - width - 12, center - width / 2));
  const below = top < height + 22;
  el.style.left = `${x}px`;
  el.style.top = `${below ? Math.min(bounds.height - height - 12, bottom + 10) : top - height - 10}px`;
  el.style.setProperty('--tail-x', `${Math.max(8, Math.min(width - 8, center - x))}px`);
  el.toggleAttribute('data-below', below);
}
const HOVER_EXIT_PADDING = 5;
const FACE_MOTIONS = {
  left: { poke: 'pokeLeft', grab: 'grabLeft' },
  right: { poke: 'pokeRight', grab: 'grabRight' },
  forehead: { poke: 'pokeForehead', grab: undefined },
} as const;

function faceRegion(offset: Vec2) {
  return offset.y / petSize < 0.49 ? 'forehead' : offset.x < petSize / 2 ? 'left' : 'right';
}

const REACTION_LINES = {
  grab: ['으앗, 잡지 마아!', '잠깐만, 나 내려갈래!', '히익! 발이 땅에서 떨어졌어!'],
  bump: ['아야야!', '아야, 코야!', '아야! 벽이 딱딱해에!'],
  landing: ['다음엔 살포시 내려줘, 응?', '으앗, 엉덩이야… 다음엔 살살!', '다음엔 던지기 말고 살포시, 약속!'],
  playful: ['한 번 더!', '이번엔 조금 더 멀리!', '오, 또 해줘!'],
  photo: ['사진 받았어요!'],
  text: ['쪽지 받았어요!'],
};

function animationFor(species: SpeciesConfig, state: PetState) {
  return species.animations[state] ??
    (state === 'hurt' ? species.animations.react : undefined) ?? species.animations.idle;
}

function cueAnimation(species: SpeciesConfig, { key: motion, strength }: MotionCue, facing: number) {
  if (species.motions?.[motion]) return species.motions[motion];
  if (species.id === 'basic-memoring' && motion === 'land') return animationFor(species, 'idle');
  if ((facing === 2 || facing === 6) && species.motions?.sideIdle && (motion === 'curious' || motion === 'meet' || motion === 'startle')) {
    return species.motions.sideIdle;
  }
  const fallback: Partial<Record<PetMotion, PetState>> = {
    highFiveTap: 'react', receive: 'react', offer: 'idle', tea: 'sit',
    fly: 'dragged', wallFall: 'dragged', land: 'sit', ouch: 'hurt',
    doze: 'sit', curious: 'react', startle: 'react', slip: 'walk',
  };
  if (motion === 'wallImpact' || motion === 'petBump') return animationFor(species, strength > 0.5 ? 'hurt' : 'idle');
  return animationFor(species, fallback[motion] ?? 'idle');
}

async function main(): Promise<void> {
  const canvas = document.getElementById('pet-canvas') as HTMLCanvasElement;
  const renderer = new PetRenderer(canvas);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const effects = new PetEffects(canvas.getContext('2d')!);
  const bounds = await window.petAPI.getWorkArea();
  const floorX = (x: number, size: number) => Math.max(0, Math.min(Math.max(0, bounds.width - size), x));
  const petPosition = (pet: Companion) => {
    const size = petSize;
    if (pet.flight) return pet.flight.position;
    return { x: floorX(pet.toyPlay?.position.x ?? pet.behavior.getPosition().x, size), y: Math.max(0, bounds.height - size) };
  };
  let pets: Companion[] = [];
  let sceneReady = false;
  const gestureTips: FeatureTip[] = [];
  let appTips: FeatureTip[] = [];
  let lastSoloWasTip = false;
  const history = new TipHistory(localStorage);
  function onGesture<K extends keyof HTMLElementEventMap>(type: K, id: string, instruction: string, handler: (event: HTMLElementEventMap[K]) => void) {
    canvas.addEventListener(type, handler);
    gestureTips.push({ id, instruction });
  }
  function registerGesture<T>(id: string, instruction: string, action: T): T {
    gestureTips.push({ id, instruction });
    return action;
  }
  let guidesEnabled = true;
  window.petAPI.onFeatureTips((tips, enabled) => {
    appTips = tips;
    guidesEnabled = enabled;
    if (!enabled) for (const pet of pets) if (pet.bubble.hasAttribute('data-guide')) hush(pet);
  });
  let chatter: ChatterConfig | undefined;
  let nextChat = Infinity;
  let nextMeeting = 0;
  let nextEncounter = 0;
  let previous = performance.now();
  let reply: { pet: Companion; text: string; at: number } | null = null;
  let pointer: Vec2 = { x: -1000, y: -1000 };
  let held: { samples: PointerSample[]; pet: Companion; pointerId: number; start: Vec2; offset: Vec2; region: ReturnType<typeof faceRegion>; since: number; dragging: boolean } | null = null;
  let rightPress: { pet: Companion; pointerId: number; timer: number; briefed: boolean } | null = null;
  let activeBriefing: { pet: Companion; until: number } | undefined;
  let perchedId: string | null = null;
  window.petAPI.onPerched((id) => { perchedId = id; });
  let briefingHold: Companion | undefined;

  let briefingBounds: DOMRect | undefined;
  let clickThrough = true;
  const macDragTracking = navigator.platform.startsWith('Mac');
  let fileDrag = false;
  let dropTarget: Companion | undefined;
  let hoveredPet: Companion | undefined;
  let toyEnabled = false;
  let toyNextPlayAt = 0;
  let lastPointerAt = -Infinity;
  let nextCursorPoll = 0;
  let toyPointer = { ...pointer };
  let toyProp: SpeciesAnimationDef | undefined;
  let fishingRig = new FishingRig();
  let fishingPose: FishingPose | undefined;
  const propAnimation = new AnimationController();
  const hasToy = (pet: Companion) => !!(pet.species.motions?.toyWatch && pet.species.motions.toyPounce &&
    (pet.species.fishingToy || pet.species.motions.toyRod));
  const toyOwner = () => pets.find(hasToy);
  function toggleToy() {
    toyEnabled = !toyEnabled && !!toyOwner();
    toyProp = undefined;
    fishingPose = undefined;
    fishingRig = new FishingRig();
  }
  let focusMode = localStorage.getItem('pet.focusMode') === 'on';
  let menuSpeaker: Companion | undefined;
  const focusLines: Record<string, string> = {
    'mono-cat': '쓰는 동안 여기 있을게. 알람 오면 알려줄게, 냥.',
    'block-dino': '자네, 천천히 쓰게. 알람이 오면 내가 알려 주겠네.',
    'basic-memoring': '여기서 조용히 기다릴게요. 알람 시간에 만나요!',
    'pastel-octopus': '여덟 팔 얌전히 모으고 기다릴게요. 알람은 챙길게요!',
    'vintage-teddy': '주인님, 편히 쓰세요. 알람 시간이 되면 알려 드리겠습니다.',
  };
  const petMenu = new PetQuickMenu(toggleToy, () => focusMode, () => {
    focusMode = !focusMode;
    localStorage.setItem('pet.focusMode', focusMode ? 'on' : 'off');
    reply = null;
    schedule();
    if (focusMode) {
      if (toyEnabled) toggleToy();
      for (const pet of pets) {
        if (pet.chasing) stopHunt(pet);
        hush(pet);
        if (pet.flight || held?.pet === pet) continue;
        pet.toyPlay = undefined;
        pet.cue = undefined;
        pet.behavior.resumeAfterDrag();
      }
    }
    if (focusMode && guidesEnabled && menuSpeaker && pets.includes(menuSpeaker)) {
      say(menuSpeaker, focusLines[menuSpeaker.species.id] ?? focusLines['basic-memoring'], performance.now());
      menuSpeaker.bubble.setAttribute('data-guide', '');
    }
  });
  gestureTips.push({id:'pet:focus',instruction:'조용히 쓰고 싶으면 Shift를 누르고 나를 우클릭해서 집중 모드를 켜'},
    {id:'pet:guide-setting',instruction:'기능 설명을 쉬고 싶으면 설정에서 펫 기능 가이드를 꺼'});
  const emptyPaper = new EmptyRosterPaper((anchor) => petMenu.open(anchor, false, false, true));
  const briefingCard = document.createElement('button');
  const briefingTitle = document.createElement('strong');
  const briefingBody = document.createElement('span');
  briefingCard.className = 'pet-briefing';
  briefingCard.hidden = true;
  briefingCard.type = 'button';
  briefingCard.setAttribute('aria-label', '오늘 브리핑 · 전체보기 열기');
  briefingCard.addEventListener('click', () => {
    activeBriefing = undefined;
    briefingBounds = undefined;
    window.petAPI.openOverview();
  });
  briefingTitle.textContent = '오늘 브리핑';
  briefingCard.append(briefingTitle, briefingBody);
  document.body.append(briefingCard);
  window.petAPI.onBriefing((id, text) => {
    const pet = pets.find((item) => item.species.id === id);
    if (!pet || briefingHold !== pet) return;
    briefingCard.dataset.speaker = pet.species.id;
    briefingBody.textContent = text;
    activeBriefing = { pet, until: performance.now() + 8000 };
    briefingHold = undefined;

  });
  let nextPointerPoll = 0;
  const pollPointer = () => !held && (clickThrough || !!hoveredPet || !!activeBriefing || pets.some((pet) => pet.chasing));
  document.addEventListener('pointermove', (event) => {
    if (sceneReady && (pets.length === 0 || event.target === briefingCard || briefingCard.contains(event.target as Node)) && event.isPrimary) {
      pointer = { x: event.clientX, y: event.clientY };
      lastPointerAt = performance.now();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (!event.defaultPrevented && event.key === 'Escape' && toyEnabled) toggleToy();
  });
  canvas.addEventListener('wheel', (event) => {
    if (!toyEnabled || petMenu.isOpen || !toyOwner()?.species.fishingToy) return;
    event.preventDefault();
    toyPointer = { x: event.clientX, y: event.clientY };
    lastPointerAt = performance.now();
    fishingRig.wheel((event.deltaY || event.deltaX) * (event.deltaMode === 1 ? 18 : 1));
  }, { passive: false });
  const resting = (pet: Companion) => pet.state.getState() === 'sleep' || pet.cue?.key === 'doze';
  function hush(pet: Companion) {
    if (reply?.pet === pet) reply = null;
    pet.bubble.removeAttribute('data-guide');
    pet.until = 0;
    pet.speakingUntil = 0;
    pet.reactionUntil = 0;
    pet.bubble.hidden = true;
  }
  function cue(pet: Companion, key: PetMotion, now: number, side: -1 | 1 = 1, strength = 0) {
    pet.cue = motionCue(pet.species, key, now, side, strength);
    if (pet.playbackKey === key) pet.playbackKey = undefined;
    if (key === 'doze') {
      hush(pet);
      renderer.preload(pet.species.animations.sleep);
    }
    return pet.cue;
  }
  const random = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
  const schedule = () => {
    nextChat = performance.now() + 1000 * ((chatter?.minIntervalSec ?? 180) + Math.random() * ((chatter?.maxIntervalSec ?? 360) - (chatter?.minIntervalSec ?? 180)));
  };
  function say(pet: Companion, text: string, now: number, pause = true) {
    if (!canChat(pet, now)) return;
    pet.bubble.removeAttribute('data-guide');
    pet.bubble.textContent = text;
    pet.speechStart = now;
    pet.until = now + (chatter?.bubbleSec ?? 7) * 1000;
    pet.speakingUntil = pause ? pet.until : 0;
    pet.bubble.hidden = false;
  }
  function reactWithLine(pet: Companion, reaction: keyof typeof REACTION_LINES, now: number) {
    if (!chatter?.enabled || resting(pet)) return;
    if (reply?.pet === pet) reply = null;
    const lines = pet.species.dialogue?.reactions?.[reaction];
    pet.bubble.removeAttribute('data-guide');
    pet.bubble.textContent = random(lines?.length ? lines : REACTION_LINES[reaction]);
    pet.speechStart = now;
    pet.reactionUntil = now + (reaction === 'landing' || reaction === 'bump' ? 3200 : 1600);
    pet.until = pet.reactionUntil;
    pet.speakingUntil = reaction === 'landing' ? pet.until : 0;
    pet.bubble.hidden = false;
  }
  const canChat = (pet: Companion, now: number) =>
    pet.species.id !== perchedId && !pet.flight && !pet.chasing && !resting(pet) && !pet.cue &&
    held?.pet !== pet && now >= pet.reactionUntil && now >= (pet.turnUntil ?? 0);
  let pendingSchedule: { text: string; id: string; expires: number } | null = null;
  window.petAPI.onScheduleSpeech((text, id) => {
    pendingSchedule = { id, text, expires: performance.now() + 90_000 };
  });
  function converse(a: Companion, b: Companion, now: number) {
    if (!chatter || !canChat(a, now) || !canChat(b, now)) return;
    if (!a.species.dialogue?.dialogues.length && b.species.dialogue?.dialogues.length) [a, b] = [b, a];
    const lines = random(a.species.dialogue?.dialogues.length ? a.species.dialogue.dialogues : chatter.dialogues);
    if (!lines) return;
    say(a, lines[0], now);
    reply = { pet: b, text: b.species.dialogue?.reply || lines[1], at: now + 1900 };
    b.speakingUntil = now + 1900 + chatter.bubbleSec * 1000;
    nextMeeting = now + 45000;
  }
  window.petAPI.onSceneCommand((command) => {
    if (command === 'toy') {
      toggleToy();
      return;
    }
    if (!chatter) return;
    if (command === 'quiet') {
      chatter.enabled = !chatter.enabled;
      reply = null;
      for (const pet of pets) { pet.until = 0; pet.speakingUntil = 0; pet.reactionUntil = 0; }
      schedule();
    } else if (chatter.enabled) {
      if (pets.length > 1) converse(pets[0], pets[1], performance.now());
      else if (pets.length) talkToUser(pets[0], performance.now());
      schedule();
    }
  });
  window.petAPI.onSizeChanged((size) => {
    if (size === petSize) return;
    petSize = size;
    for (const pet of pets) {
      pet.species = sizeSpecies(pet.original);
      pet.sizing.observe(undefined);
      pet.playbackKey = undefined;
      pet.pose = undefined;
      pet.transition = undefined;
      pet.turnUntil = undefined;
    }
    toyProp = undefined;
  });
  window.petAPI.onSpeciesLoaded((loaded) => {
    endOffer();
    cancelRightPress();
    activeBriefing = undefined;

    briefingHold = undefined;
    briefingBounds = undefined;
    briefingCard.hidden = true;
    sceneReady = true;
    petMenu.close();
    toyEnabled = false;
    fishingPose = undefined;
    for (const pet of pets) pet.bubble.remove();
    reply = null; held = null; toyProp = undefined; renderer.clearCache(); chatter = loaded.chatter;
    const dismissed = new Set(loaded.dismissedIds);
    pets = [loaded, ...(loaded.companions ?? [])].filter(({ id }) => !dismissed.has(id)).map((original, index) => {
      const species = sizeSpecies(original);
      renderer.preload(species.motions?.fireBreath);
      const state = new PetStateMachine();
      const animation = new AnimationController();
      const size = petSize;
      const startX = species.id === 'basic-memoring' ? bounds.width - size - 24 : bounds.width * 0.25 + index * 160;
      const x = floorX(startX, size);
      const patrolDirection = species.motions?.frontWalk && species.motions.backWalk ?
        (x > (bounds.width - size) / 2 ? 1 : -1) : undefined;
      const walkEaseMs = species.id === 'basic-memoring' ? 280 : 0;
      const behavior = new BehaviorController(state, species.behavior, { x, y: 0 }, () => ['idle', 'sit', 'sleep'], patrolDirection, walkEaseMs);
      const bubble = document.createElement('div');
      bubble.dataset.speaker = species.id;
      bubble.className = 'speech'; bubble.hidden = true; document.body.append(bubble);
      const initialAnimation = animationFor(species, state.getState());
      if (initialAnimation) animation.setAnimation(initialAnimation);
      const now = performance.now();
      return { original, sizing: new FrameSizing(), paused: false, species, state, animation, behavior, bubble, until: 0, speakingUntil: 0, facing: 0,
        clip: initialAnimation, playbackKey: state.getState(), playbackStartedAt: now, reactionUntil: 0,
        nextCueAt: now + 2400,
        nextLookAt: 0, pointerDistance: Infinity };
    });
    nextChat = performance.now() + 6000; nextMeeting = performance.now() + 20000; nextEncounter = performance.now() + 4000;
  });
  window.petAPI.onPetDismissed((id) => {
    const departing = pets.find((pet) => pet.species.id === id);
    if (!departing) return;
    if (dropTarget === departing) endOffer();
    if (rightPress?.pet === departing) cancelRightPress();
    if (activeBriefing?.pet === departing) activeBriefing = undefined;
    const fishing = toyOwner() === departing;
    hush(departing);
    departing.bubble.remove();
    if (held?.pet === departing) held = null;
    pets = pets.filter((pet) => pet !== departing);
    if (fishing && toyEnabled) toggleToy();
  });
  function talkToUser(pet: Companion, now: number) {
    if (!chatter?.enabled || !canChat(pet, now) || now < pet.until) return;
    if (guidesEnabled && !focusMode && !lastSoloWasTip) {
      const tip = history.next([...gestureTips, ...appTips]);
      if (tip) {
        say(pet, voiceTip(pet.species.id, tip.instruction), now);
        pet.bubble.setAttribute('data-guide', '');
        lastSoloWasTip = true;
        return;
      }
    }
    lastSoloWasTip = false;
    const lines = pet.species.dialogue?.solo;
    const line = random(lines?.length ? lines : chatter?.solo ?? []);
    if (line) say(pet, line, now);
  }
  window.petAPI.ready();
  const hit = () => [...pets].reverse().find((pet) => {
    if (pet.species.id === perchedId) return false;
    const layer = pet.transition?.dominant;
    const def = layer?.clip ?? pet.clip;
    if (!def) return false;
    const frame = layer?.frame ?? pet.animation.getCurrentFrameRect(pet.facing);
    const pose = layer ? layer.pose : pet.pose;
    const pos = petPosition(pet);
    const scale = pet.species.behavior.spriteScale;
    const box = pose && frame ? renderer.getPoseBounds(def, frame, pos, scale, pose, petSize) : renderer.getSpriteBounds(def, pos, scale);
    // Keep the current target through small frame-to-frame changes at its edge.
    const padding = fileDrag ? 28 : pet === hoveredPet ? HOVER_EXIT_PADDING : 0;
    const left = pose && !pose.wall && (layer ? layer.mirror : pet.mirror) ? pos.x * 2 + petSize - box.x - box.width : box.x;
    return pointer.x >= left - padding && pointer.x <= left + box.width + padding &&
      pointer.y >= box.y - padding && pointer.y <= box.y + box.height + padding;
  });
  function setDropTarget(target: Companion | undefined) {
    if (dropTarget === target) return;
    if (dropTarget?.cue?.key === 'offer') dropTarget.cue = undefined;
    dropTarget = target;
    if (!target || target.flight) return;
    if (target.chasing) stopHunt(target);
    target.toyPlay = undefined;
    target.state.transition('idle');
    hush(target);
    cue(target, 'offer', performance.now(), pointer.x < petPosition(target).x + petSize / 2 ? -1 : 1);
  }
  function receive(target: Companion, kind: 'photo' | 'text', side: -1 | 1) {
    if (!pets.includes(target) || target.flight || held?.pet === target) return;
    target.meal = kind;
    target.state.transition('idle');
    const now = performance.now();
    hush(target);
    cue(target, 'receive', now, side);
    reactWithLine(target, kind, now);
  }
  function trackDrop(event: DragEvent) {
    if (!event.dataTransfer || !window.MemoDrop.accepts(event.dataTransfer)) return;
    fileDrag = true;
    event.preventDefault();
    pointer = { x: event.clientX, y: event.clientY };
    setDropTarget(hit());
    event.dataTransfer.dropEffect = dropTarget ? 'copy' : 'none';
    updateMouseTarget();
  }
  canvas.addEventListener('dragenter', trackDrop);
  canvas.addEventListener('dragover', trackDrop);
  function endOffer() { fileDrag = false; setDropTarget(undefined); }
  canvas.addEventListener('dragleave', endOffer);
  window.addEventListener('dragend', endOffer);
  window.addEventListener('blur', endOffer);
  onGesture('drop', 'pet:drop', '메모할 사진이나 글을 내 위에 끌어다 놓아', async (event) => {
    event.preventDefault();
    pointer = { x: event.clientX, y: event.clientY };
    const target = hit();
    const side = target?.cue?.side ?? 1;
    fileDrag = false; setDropTarget(undefined);
    if (!target || !event.dataTransfer) return;
    const files = window.MemoDrop.files(event.dataTransfer);
    const images = files.filter(file =>
      file.type.startsWith('image/') || /\.(jpe?g|jfif|pjpeg|pjp|png|apng|gif|webp|bmp|dib|svg|avif|heic|heif|ico|cur|tiff?)$/i.test(file.name));
    if (!images.length) {
      const content = window.MemoDrop.content(event.dataTransfer);
      if (content.imageUrl || content.text) {
        receive(target, content.imageUrl ? 'photo' : 'text', side);
        window.petAPI.sendContent(content);
      }
      else window.petAPI.photoError('사진이나 글을 놓아 주세요.');
      return;
    }
    const photos: DroppedPhoto[] = [];
    let totalBytes = 0;
    for (const file of images) {
      if (photos.length >= MAX_DROPPED_PHOTOS) { window.petAPI.photoError('사진은 메모 하나에 6장까지 담을 수 있어요.'); break; }
      if (totalBytes + file.size > MAX_PHOTO_DROP_BYTES) { window.petAPI.photoError('한 번에 60MB 이하의 사진을 놓아 주세요.'); continue; }
      try {
        const bytes = await file.arrayBuffer();
        if (!bytes.byteLength) throw new Error('Empty photo');
        photos.push({ name: file.name, type: file.type, bytes });
        totalBytes += bytes.byteLength;
      } catch { window.petAPI.photoError('사진을 읽을 수 없어요.'); }
    }
    if (photos.length) {
      receive(target, 'photo', side);
      window.petAPI.sendPhotos(photos);
    }
  });
  function beginDrag(grab: NonNullable<typeof held>) {
    const { pet } = grab;
    const now = performance.now();
    grab.dragging = true;
    if (pet.chasing) stopHunt(pet);
    pet.looseBlockAt = undefined;
    pet.lastThrow = undefined;
    pet.cue = undefined;
    pet.transition = undefined;
    pet.turnUntil = undefined;
    pet.state.transition('idle');
    pet.behavior.interruptForDrag();
    const clips = pet.species.motions;
    renderer.preload(clips?.fly);
    renderer.preload(clips?.wallCling ?? clips?.wallImpact);
    renderer.preload(clips?.wallFall);
    renderer.preload(clips?.land);
    const gripX = grab.offset.x / petSize;
    const region = pet.species.id === 'mono-cat' && (gripX < 0.3 || gripX > 0.7)
      ? (gripX < 0.5 ? 'left' : 'right') : grab.region;
    const grabMotion = FACE_MOTIONS[region].grab;
    if (grabMotion && pet.species.motions?.[grabMotion]) cue(pet, grabMotion, now);
    hush(pet);
    reactWithLine(pet, 'grab', now);
  }
  function positionHeld(grab: NonNullable<typeof held>) {
    const size = petSize;
    const x = floorX(pointer.x - grab.offset.x, size);
    const y = Math.max(0, Math.min(bounds.height - size, pointer.y - grab.offset.y));
    grab.pet.flight = { position: { x, y }, velocity: { x: 0, y: 0 } };
  }
  function moveHeld(event: PointerEvent) {
    if (!event.isPrimary || (held && held.pointerId !== event.pointerId)) return;
    pointer = { x: event.clientX, y: event.clientY };
    lastPointerAt = performance.now();
    toyPointer = pointer;
    if (!held) return;
    held.samples = held.samples.filter(sample => event.timeStamp - sample.time <= RELEASE_SAMPLE_WINDOW_MS);
    held.samples.push({ ...pointer, time:event.timeStamp });
    const drift = Math.hypot(pointer.x - held.start.x, pointer.y - held.start.y);
    if (!held.dragging && drift >= 5) beginDrag(held);
    if (held.dragging) positionHeld(held);
  }
  canvas.addEventListener('pointermove', moveHeld);
  canvas.addEventListener('mousemove', (event) => {
    if (!clickThrough) return;
    pointer = { x: event.clientX, y: event.clientY };
    lastPointerAt = performance.now();
    updateMouseTarget();
  });
  const requestBriefing = registerGesture('pet:briefing', '오늘 일정이 궁금하면 내 위에서 마우스 오른쪽 버튼을 꾹 눌러', window.petAPI.requestBriefing);
  const openBookmarks = registerGesture('pet:bookmarks', '책갈피를 펼치려면 나를 가볍게 우클릭해', window.petAPI.openBookmarks);
  function cancelRightPress() {
    if (rightPress) window.clearTimeout(rightPress.timer);
    rightPress = null;
  }
  canvas.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || held || rightPress || petMenu.isOpen || (event.button !== 0 && event.button !== 2)) return;
    pointer = { x: event.clientX, y: event.clientY };
    const pet = hit(); if (!pet) return;
    if (event.button === 2) {
      if (event.shiftKey) return;
      event.preventDefault();
      const timer = window.setTimeout(() => {
        if (!rightPress) return;
        rightPress.briefed = true;
        briefingHold = pet;
        requestBriefing(pet.species.id);
      }, BRIEFING_HOLD_MS);
      rightPress = { pet, pointerId: event.pointerId, timer, briefed: false };
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    const pos = petPosition(pet);
    if (pet.toyPlay) {
      pet.toyPlay = undefined;
      pet.behavior.setPosition({ x: pos.x, y: 0 });
      toyNextPlayAt = performance.now() + 1200;
    }
    const offset = { x: pointer.x - pos.x, y: pointer.y - pos.y };
    held = { samples: [{ ...pointer, time: event.timeStamp }], pet, pointerId: event.pointerId, start: { ...pointer }, offset, region: faceRegion(offset),
      since: performance.now(), dragging: false };
    if (pet.flight) { beginDrag(held); positionHeld(held); }
    canvas.setPointerCapture(event.pointerId);
  });
  function release(event: Event) {
    if (rightPress && (!(event instanceof PointerEvent) || event.pointerId === rightPress.pointerId)) {
      const { briefed, pet } = rightPress;
      cancelRightPress();
      if (event instanceof PointerEvent && event.type === 'pointerup' && event.button === 2 && !briefed) {
        activeBriefing = undefined;
        briefingHold = undefined;
        const pos = petPosition(pet);
        briefingBounds = undefined;
        openBookmarks({ ...pos, width: petSize, height: petSize });
      }
    }
    if (!held || (event instanceof PointerEvent && event.pointerId !== held.pointerId)) return;
    if (event instanceof PointerEvent && event.type === 'pointerup') moveHeld(event);
    const { pet, dragging, offset, region, samples } = held;
    held = null;
    if (dragging && pet.flight) {
      hush(pet);
      const velocity = event.type === 'pointerup' ? releaseVelocity(samples) : { x: 0, y: 0 };
      pet.lastThrow = { speed: Math.hypot(velocity.x, velocity.y), wallSpeed: 0 };
      pet.flight.velocity = launchVelocity(velocity, bounds.height - petSize - pet.flight.position.y);
      cue(pet, 'fly', performance.now(), pet.facing >= 5 ? -1 : 1);
    } else if (event.type === 'pointerup') {
      const now = performance.now();
      if (pet.chasing) return;
      if (pet.species.behavior.greeting && (pet.nextBurstAt ?? 0) > now) return;
      pet.paused = !pet.paused;
      pet.cue = undefined;
      pet.state.transition('idle');
      if (!pet.paused || pet.chasing || (pet.nextBurstAt ?? 0) > now) return;
      if (pet.species.motions?.scratch) {
        pet.state.transition('idle');
        cue(pet, 'scratch', now, offset.x < petSize / 2 ? -1 : 1);
        return;
      }
      const motion = FACE_MOTIONS[region].poke;
      if (pet.species.motions?.[motion]) {
        pet.state.transition('idle');
        cue(pet, motion, now);
        return;
      }
      if (resting(pet)) return;
      pet.cue = undefined;
      pet.state.transition('idle'); pet.behavior.react();
      if (chatter?.enabled) talkToUser(pet, now);
    }
  }
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  canvas.addEventListener('dblclick', (event) => {
    if (event.button !== 0 || held || petMenu.isOpen) return;
    pointer = { x: event.clientX, y: event.clientY };
    const pet = hit();
    const action = pet?.species.behavior.doubleClick;
    if (!pet || pet.flight) return;
    const greeting = pet.species.behavior.greeting;
    if (greeting) {
      event.preventDefault();
      const now = performance.now();
      if ((pet.nextBurstAt ?? 0) > now) return;
      const pos = petPosition(pet);
      let side: -1 | 1 = pointer.x < pos.x + petSize / 2 ? -1 : 1;
      if (greeting.motion === 'fireBreath') {
        if (pos.x < petSize * 0.8) side = 1;
        else if (pos.x + petSize * 1.8 > bounds.width) side = -1;
      }
      pet.toyPlay = undefined;
      pet.cue = undefined;
      pet.state.transition('idle');
      hush(pet);
      if (chatter?.enabled) say(pet, greeting.line, now, false);
      const gesture = cue(pet, greeting.motion, now, side);
      pet.firePending = greeting.motion === 'fireBreath';
      pet.nextBurstAt = Math.max(now + 1000, gesture.end);
      return;
    }
    if (!action) return;
    event.preventDefault();
    if (action === 'chase') {
      if (pet.chasing) {
        stopHunt(pet);
      } else {
        if (toyEnabled && toyOwner() === pet) toggleToy();
        pet.toyPlay = undefined;
        pet.cue = undefined;
        hush(pet);
        pet.paused = false;
        pet.huntAim = undefined;
        pet.nextSwipe = performance.now() + 230;
        pet.state.transition('idle');
        if (chatter?.enabled) say(pet, '거기 서. 이번엔 내가 잡을 거야.', performance.now(), false);
        pet.chasing = true;
      }
      return;
    }
    const now = performance.now();
    if ((pet.nextBurstAt ?? 0) > now) return;
    const pos = petPosition(pet);
    const size = petSize;
    const side = pos.x < size * .6 ? 1 : pos.x + size * 1.65 > bounds.width || pet.facing >= 5 ? -1 : 1;
    pet.nextBurstAt = now + 1000;
    pet.cue = undefined;
    const breath = action === 'fire' ? pet.species.motions?.fireBreath : undefined;
    pet.state.transition('idle');
    if (!breath) pet.behavior.react();
    if (breath) {
      pet.firePending = true;
      cue(pet, 'fireBreath', now, side);
      return;
    }
    if (action === 'fire') pet.facing = side < 0 ? 6 : 2;
    effects.burst(action, {
      x: pos.x + size * (action === 'fire' ? side < 0 ? .26 : .74 : .5),
      y: pos.y + size * (action === 'fire' ? .42 : action === 'ink' ? .64 : .27),
    }, side, now);
  });
  onGesture('contextmenu', 'pet:menu', '펫 메뉴가 궁금하면 Shift를 누른 채 나를 우클릭해', (event) => {
    event.preventDefault();
    if (!event.shiftKey) return;
    pointer = { x: event.clientX, y: event.clientY };
    const pet = hit();
    if (pet) { menuSpeaker = pet; petMenu.open(pointer, hasToy(pet), toyEnabled); }
  });
  window.addEventListener('blur', release);

  function finishCue(pet: Companion, now: number) {
    const active = pet.cue;
    if (!active || pet.toyPlay || now < active.end) return;
    if (pet.chasing && active.key === 'stalk') {
      pet.missedSwipe = undefined;
      cue(pet, 'scratch', now, active.side);
      return;
    }
    if (pet.chasing && active.key === 'scratch') {
      if (pet.missedSwipe && pet.species.motions?.groom) cue(pet, 'groom', now, active.side);
      else pet.cue = undefined;
      pet.nextSwipe = now + 650;
      return;
    }
    if (active.key === 'land') pet.looseBlockAt = undefined;
    if (pet.flight && (active.key === 'wallImpact' || active.key === 'wallCling')) {
      cue(pet, 'wallFall', now, active.side, active.strength);
    } else if (active.key === 'land' && active.afterLanding) {
      cue(pet, active.afterLanding, now, active.side, active.strength);
    } else if ((active.key === 'ouch' || (active.key === 'land' && !pet.species.behavior.throwReactions && active.strength > 0.65)) && pet.species.motions?.recover) {
      cue(pet, 'recover', now, active.side);
    } else pet.cue = undefined;
  }

  function playWithToy(pet: Companion, now: number, delta: number): boolean {
    const clips = pet.species.motions;
    if (!clips?.toyWatch || !clips.toyPounce || held?.pet === pet || !hasToy(pet)) return false;
    const play = pet.toyPlay;
    const size = petSize;
    const floor = Math.max(0, bounds.height - size);
    const maxX = Math.max(0, bounds.width - size);
    const xInBounds = (x: number) => Math.min(maxX, Math.max(0, x));
    const lure = fishingPose?.fish ?? toyPointer;
    const strikeAt = (aim: Vec2, side: -1 | 1): Vec2 => ({
      x: xInBounds(aim.x - size * (side < 0 ? 0.22 : 0.78)),
      y: Math.max(0, Math.min(floor - 12, aim.y - size * 0.54)),
    });
    if (play && pet.cue) {
      const active = pet.cue;
      if (active.key === 'toyWatch') {
        if (!toyEnabled || Math.abs(lure.x - play.origin.x - size / 2) > size * 1.4 || lure.y < floor - size * 1.1) {
          pet.toyPlay = undefined;
          pet.cue = undefined;
          return false;
        }
        play.side = lure.x < play.origin.x + size / 2 ? -1 : 1;
        play.aim = { ...lure };
        play.strike = strikeAt(lure, play.side);
        if (now >= active.end) cue(pet, 'toyPounce', now, play.side);
      }
      else if (active.key === 'toyPounce') {
        const p = Math.min(1, (now - active.start) / (active.end - active.start));
        const hitAt = 3 / 7;
        play.position = { x: xInBounds(play.origin.x + (play.strike.x - play.origin.x) * Math.min(1, p / hitAt)),
          y: floor };
        if (!play.hit && p >= hitAt) {
          play.hit = true;
          if (toyEnabled && Math.hypot(lure.x - play.aim.x, lure.y - play.aim.y) <= size * 0.3) {
            if (pet.species.fishingToy) fishingRig.tap(play.side);
            else if (clips.toyRodHit) {
              toyProp = clips.toyRodHit;
              propAnimation.setAnimation(toyProp);
            }
          }
        }
        if (p === 1) {
          pet.behavior.setPosition({ x: play.position.x, y: 0 });
          cue(pet, 'toyLand', now, play.side);
        }
      } else if (active.key === 'toyLand' && now >= active.end) cue(pet, 'toyAfter', now, play.side);
      else if (active.key === 'toyAfter' && now >= active.end) {
        pet.toyPlay = undefined;
        pet.cue = undefined;
        pet.behavior.resumeAfterDrag();
        toyNextPlayAt = now + 1450;
      }
      return true;
    }
    if (!toyEnabled || pet.cue || resting(pet) || now < toyNextPlayAt) return false;
    const from = petPosition(pet);
    const cursor = lure;
    const dx = cursor.x - (from.x + size / 2);
    if (from.y < floor - 1 || cursor.x < 0 || cursor.x > bounds.width ||
        cursor.y < Math.max(0, floor - size * 1.1) || cursor.y > bounds.height || Math.abs(dx) > size * 3.5) return false;
    const side = dx < 0 ? -1 : 1;
    pet.facing = side < 0 ? 6 : 2;
    if (Math.abs(dx) > size * 0.98) {
      const step = Math.min(Math.abs(dx) - size * 0.85, delta * 0.115);
      const nextX = xInBounds(from.x + step * side);
      if (pet.state.getState() !== 'walk') {
        pet.state.transition('idle');
        pet.state.transition('walk');
      }
      pet.behavior.setPosition({ x: nextX, y: 0 });
      return true;
    }
    hush(pet);
    const strike = strikeAt(cursor, side);
    pet.toyPlay = { origin: from, position: from, strike, aim: { ...cursor }, side, hit: false };
    cue(pet, 'toyWatch', now, side);
    return true;
  }

  const pointerInArea = (point = toyPointer) => point.x >= 0 && point.y >= 0 && point.x <= bounds.width && point.y <= bounds.height;

  function updateToy(now: number, delta: number) {
    if (!toyEnabled) return;
    if (now >= nextCursorPoll && now - lastPointerAt > 90) {
      nextCursorPoll = now + 45;
      void window.petAPI.getCursorPoint().then((point) => {
        if (performance.now() - lastPointerAt > 90) toyPointer = point;
      });
    }
    const cat = toyOwner();
    fishingPose = cat?.species.fishingToy && pointerInArea()
      ? fishingRig.update(toyPointer, petSize, bounds.width, bounds.height, delta) : undefined;
  }

  function renderToy(delta: number) {
    if (!toyEnabled || !pointerInArea()) return;
    const cat = toyOwner();
    if (cat?.species.fishingToy && fishingPose) {
      renderer.renderFishingRig(cat.species.fishingToy, fishingPose);
      return;
    }
    const idle = cat?.species.motions?.toyRod;
    if (!cat || !idle) return;
    if (!toyProp || propAnimation.isFinished()) {
      toyProp = idle;
      propAnimation.setAnimation(idle);
    }
    propAnimation.update(delta);
    const frame = propAnimation.getCurrentFrameRect();
    if (!frame) return;
    const size = petSize;
    renderer.render(toyProp, frame, { x: toyPointer.x - size * 0.91, y: toyPointer.y - size * 0.92 }, cat.species.behavior.spriteScale);
  }

  function cueForMovement(pet: Companion, now: number, after: Vec2, previousState: PetState) {
    const state = pet.state.getState();
    const personality = personalityOf(pet.species);
    const size = petSize;
    const onFloor = after.y >= bounds.height - size - 0.5;
    const side = after.x < bounds.width / 2 ? -1 : 1;
    if (state === 'sleep') {
      hush(pet);
      if (previousState !== 'sleep' && onFloor) cue(pet, 'doze', now, side);
      return;
    }
    if (previousState === 'sleep') {
      cue(pet, 'wake', now, side);
      return;
    }
    const distance = Math.hypot(pointer.x - after.x - size / 2, pointer.y - after.y - size / 2);
    const closer = Number.isFinite(pet.pointerDistance) ? pet.pointerDistance - distance : 0;
    pet.pointerDistance = distance;
    if (state !== 'idle' || !onFloor) return;
    const settledProfile = pet.species.motions?.sideIdle && (pet.facing === 2 || pet.facing === 6);
    if ((!settledProfile || now - lastPointerAt <= 120) && now >= pet.nextLookAt && distance < size * 1.55 && closer > 3) {
      const looking = pointer.x < after.x + size / 2 ? -1 : 1;
      cue(pet, closer > 27 ? 'startle' : 'look', now, looking);
      pet.facing = looking < 0 ? 6 : 2;
      pet.nextLookAt = now + (personality === 'cautious' ? 2600 : 4400);
    } else if (!settledProfile && personality === 'curious' && now >= pet.nextCueAt) {
      cue(pet, 'curious', now, side);
      pet.nextCueAt = now + 10500;
    }
  }

  function encounter(now: number) {
    if (now < nextEncounter || held) return;
    const walkers = pets.filter((pet) => pet.species.id !== perchedId && !pet.cue && !pet.chasing &&
      pet.state.getState() === 'walk' && now >= pet.speakingUntil);
    for (const a of walkers) {
      if (a.facing !== 2) continue;
      const left = petPosition(a);
      const b = walkers.find((other) => {
        const right = petPosition(other);
        const gap = right.x - left.x;
        return other.facing === 6 && gap > 0 && gap < (petSize + petSize) * 0.55 &&
          left.y + petSize >= bounds.height - 1 && right.y + petSize >= bounds.height - 1;
      });
      if (!b) continue;
      cue(a, 'meet', now, 1);
      cue(b, 'meet', now, -1);
      const yielding = personalityOf(a.species) === 'curious' ? a : b;
      yielding.behavior.turnAround();
      nextEncounter = now + 9000;
      return;
    }
  }

  function updateMouseTarget() {
    hoveredPet = hit();
    const overBriefing = !!activeBriefing && !!briefingBounds &&
      pointer.x >= briefingBounds.left && pointer.x <= briefingBounds.right &&
      pointer.y >= briefingBounds.top && pointer.y <= briefingBounds.bottom;
    const capturingWheel = toyEnabled && pointerInArea() && !!toyOwner()?.species.fishingToy;
    const ignore = !dropTarget && !held && !rightPress && !petMenu.isOpen && !capturingWheel && !emptyPaper.captures(pointer) && !hoveredPet && !overBriefing;
    if (ignore !== clickThrough) { clickThrough = ignore; window.petAPI.setClickThrough(ignore); }
    canvas.classList.toggle('is-dragging', !!held?.dragging);
  }

  function stopHunt(pet: Companion) {
    pet.chasing = false;
    pet.huntAim = undefined;
    pet.missedSwipe = undefined;
    pet.cue = undefined;
    pet.paused = false;
    pet.behavior.resumeAfterDrag();
    hush(pet);
  }

  function followCursor(pet: Companion, delta: number, now: number) {
    const size = petSize;
    const pos = petPosition(pet);
    const dx = pointer.x - pos.x - size / 2, dy = pointer.y - pos.y - size * .58;
    if (!pointerInArea(pointer) || Math.hypot(dx, dy) > Math.max(240, size * 4.5)) {
      stopHunt(pet);
      return;
    }
    if (pet.cue) {
      if (pet.cue.key === 'scratch' && pet.huntAim && pet.missedSwipe === undefined && now - pet.cue.start >= 120) {
        pet.missedSwipe = Math.hypot(pointer.x - pet.huntAim.x, pointer.y - pet.huntAim.y) > size * .32;
      }
      return;
    }
    const side = dx < 0 ? -1 : 1;
    pet.facing = side < 0 ? 6 : 2;
    if (Math.abs(dx) < size * .85 && Math.abs(dy) < size * .84) {
      pet.state.transition('idle');
      if (now >= (pet.nextSwipe ?? 0) && (!pet.huntAim || Math.hypot(pointer.x - pet.huntAim.x, pointer.y - pet.huntAim.y) > 8)) {
        pet.huntAim = { ...pointer };
        cue(pet, 'stalk', now, side);
      }
      return;
    }
    const target = floorX(pointer.x - size / 2, size);
    const distance = pet.behavior.getPosition().x;
    const gap = target - distance;
    if (Math.abs(gap) < 5) {
      pet.state.transition('idle');
      return;
    }
    if (pet.state.getState() !== 'walk') {
      pet.state.transition('idle');
      pet.state.transition('walk');
    }
    pet.behavior.setPosition({ x: distance + Math.sign(gap) * Math.min(Math.abs(gap), delta * .205), y: 0 });
  }

  function invitePointer(pet: Companion, now: number) {
    const octopus = !!pet.species.motions?.highFive;
    if (!octopus && pet.species.id !== 'vintage-teddy') return;
    const pos = petPosition(pet);
    const x = (pointer.x - pos.x) / petSize, y = (pointer.y - pos.y) / petSize;
    const dx = x - .5;
    const nearby = Math.abs(dx) <= 1.35 && y > -.35 && y < 1.2;
    if (pet.cue?.key === 'highFive') {
      const tip = pet.cue.side < 0 ? .13 : .87;
      if (!nearby) pet.cue = undefined;
      else if (now - pet.cue.start > 160 && Math.hypot(x - tip, y - .59) < .15) {
        const side = pet.cue.side;
        pet.cue = undefined;
        if (chatter?.enabled) say(pet, '짝! 손끝이 딱 맞았어요!', now, false);
        cue(pet, 'highFiveTap', now, side);
      }
      return;
    }
    if (!nearby || now < pet.until || Math.abs(dx) < .55 || held || rightPress || fileDrag || petMenu.isOpen || pet.flight ||
        pet.cue || resting(pet) || (!octopus && pet.state.getState() === 'walk') ||
        pet.toyPlay || pet.chasing || now < (pet.inviteAfter ?? 0)) {
      pet.invitation = undefined;
      return;
    }
    const invitation = pet.invitation;
    if (!invitation || Math.hypot(pointer.x - invitation.point.x, pointer.y - invitation.point.y) > 7) {
      pet.invitation = { since: now, point: { ...pointer } };
      return;
    }
    if (now - invitation.since < (octopus ? 430 : 950)) return;
    pet.state.transition('idle');
    if (!octopus && chatter?.enabled) say(pet, '주인님, 차가 식기 전에 드시지요.', now, false);
    cue(pet, octopus ? 'highFive' : 'tea', now, dx < 0 ? -1 : 1);
    pet.invitation = undefined;
    pet.inviteAfter = now + (octopus ? 4500 : 18000);
  }

  function tick(now: number) {
    bounds.width = window.innerWidth; bounds.height = window.innerHeight;
    const delta = Math.min(now - previous, 100); previous = now;
    renderer.clear();
    const empty = sceneReady && pets.length === 0;
    emptyPaper.update(empty, petMenu.isOpen, bounds.width, bounds.height, delta);
    // Forwarded movement can be missed when a pet walks under a stationary cursor
    // or the cursor leaves the whole work area from an interactive pet.
    if (sceneReady && pollPointer() && !document.hidden && now >= nextPointerPoll && (macDragTracking || now - lastPointerAt > 90)) {
      nextPointerPoll = now + 40;
      void window.petAPI.getCursorPoint().then((point) => {
        if (point.fileDrag !== undefined && !dropTarget) fileDrag = point.fileDrag;
        if (!pollPointer() || (!point.fileDrag && performance.now() - lastPointerAt <= 90)) return;
        pointer = point;
        updateMouseTarget();
      }).catch(() => {});
    }
    updateToy(now, delta);
    const heldAnimation = held?.pet.species.animations.dragged;
    if (held && !held.dragging && now - held.since >= 200 && (heldAnimation?.motion === 'wriggle' || heldAnimation?.authoredGrip)) {
      beginDrag(held);
      positionHeld(held);
    }
    if (reply && now >= reply.at) { say(reply.pet, reply.text, now); reply = null; }
    if (pendingSchedule && now >= pendingSchedule.expires) pendingSchedule = null;
    if (pendingSchedule && !petMenu.isOpen && !reply && !document.hidden) {
      const speaker = pets.find((pet) => pet.species.id === pendingSchedule?.id && now >= pet.until && canChat(pet, now));
      if (speaker) {
        say(speaker, pendingSchedule.text, now, false);
        pendingSchedule = null;
        schedule();
      }
    }
    if (!focusMode && chatter?.enabled && pets.length && now >= nextChat && !held && !reply) {
      const available = pets.filter((pet) => canChat(pet, now));
      if (available.length > 1 && Math.random() < 0.55) converse(available[0], available[1], now);
      else if (available.length) talkToUser(random(available), now);
      if (available.length) schedule();
      else nextChat = now + 1500;
    }
    if (!focusMode) encounter(now);
    if (activeBriefing && (now >= activeBriefing.until || held || petMenu.isOpen || !pets.includes(activeBriefing.pet))) {
      activeBriefing = undefined;
      briefingBounds = undefined;
    }
    briefingCard.hidden = !activeBriefing;
    for (const pet of pets) {
      if (pet.species.id === perchedId) { pet.bubble.hidden = true; continue; }
      finishCue(pet, now);
      if (!focusMode) invitePointer(pet, now);
      const scale = pet.species.behavior.spriteScale;
      const before = petPosition(pet);
      const previousState = pet.state.getState();
      if (pet.flight) {
        const braced = pet.cue?.key === 'wallCling' || pet.cue?.key === 'wallImpact';
        if (held?.pet !== pet && !braced) {
          const step = advanceFlight(pet.flight, delta / 1000, Math.max(0, bounds.width - petSize), Math.max(0, bounds.height - petSize));
          pet.flight = step;
          if (step.wall && pet.lastThrow) pet.lastThrow.wallSpeed = Math.max(pet.lastThrow.wallSpeed, step.wallSpeed);
          if (step.wall && !step.landed) {
            const side = step.wall === 'left' ? -1 : 1;
            const strength = Math.min(1, step.wallSpeed / 1800);
            if (pet.species.motions?.wallImpact?.splitBlock && step.wallSpeed >= 900) pet.looseBlockAt = now;
            if (pet.species.id === 'pastel-octopus' && pet.species.motions?.wallCling) {
              const contact = motionCue(pet.species, 'wallCling', now, side, strength);
              contact.end = now + 340 - 190 * strength;
              pet.cue = contact;
              step.velocity = { x: -side * (85 + 330 * strength), y: 40 };
            } else {
              const impact = motionCue(pet.species, 'wallImpact', now, side, strength);
              impact.end = now + 115 - 55 * strength;
              pet.cue = impact;
              if (pet.species.id === 'mono-cat') {
                step.velocity = { x: -side * Math.max(160, Math.abs(step.velocity.x)), y: -140 - 110 * strength };
              }
            }
            if (pet.species.dialogue?.reactions?.bump?.length) reactWithLine(pet, 'bump', now);
          }
          if (!step.landed && !step.wall && pet.species.motions?.landPrepare &&
              (pet.cue?.key === 'fly' || pet.cue?.key === 'wallFall') && step.velocity.y > 100 &&
              bounds.height - petSize - step.position.y < step.velocity.y * 0.1) {
            cue(pet, 'landPrepare', now, pet.cue.side);
          }
          if (step.landed) {
            pet.behavior.setPosition({ x: step.position.x, y: 0 });
            pet.flight = undefined;
            pet.behavior.resumeAfterDrag();
            if (pet.paused) pet.state.transition('idle');
            const weight = Math.min(1, step.landingSpeed / 800);
            const landing = cue(pet, 'land', now, pet.facing >= 5 ? -1 : 1, weight);
            const reaction = landingReaction(pet.lastThrow?.speed ?? 0, step.landingSpeed, pet.lastThrow?.wallSpeed);
            pet.lastThrow = undefined;
            if (reaction && pet.species.behavior.throwReactions) {
              landing.afterLanding = pet.species.behavior.throwReactions[reaction];
              reactWithLine(pet, reaction === 'hurt' ? 'landing' : 'playful', now);
            } else if (step.hardLanding) reactWithLine(pet, 'landing', now);
            else hush(pet);
          }
        }
      } else if (!pet.paused && rightPress?.pet !== pet && !fileDrag && pet.chasing && held?.pet !== pet) {
        followCursor(pet, delta, now);
      } else if (!pet.paused && rightPress?.pet !== pet && !fileDrag && playWithToy(pet, now, delta)) { /* Toy pose drives position while active. */ }
      else if (!focusMode && !pet.paused && !fileDrag && held?.pet !== pet && !pet.cue && now >= pet.speakingUntil && now >= (pet.turnUntil ?? 0)) {
        const size = petSize;
        pet.behavior.update(delta, { x: 0, y: 0, width: Math.max(bounds.width, size), height: bounds.height }, size);
        cueForMovement(pet, now, petPosition(pet), previousState);
      }
      const after = petPosition(pet);
      const dx = after.x - before.x;
      const dy = after.y - before.y;
      const previousFacing = pet.facing;
      if (pet.toyPlay) pet.facing = pet.toyPlay.side < 0 ? 6 : 2;
      else if (pet.cue && ['fireBreath', 'scratch', 'highFive', 'groom', 'stalk', 'offer', 'receive', 'tea'].includes(pet.cue.key)) pet.facing = pet.cue.side < 0 ? 6 : 2;
      else if (pet.cue?.key === 'wallImpact' || pet.cue?.key === 'wallCling' || pet.cue?.key === 'wallFall' ||
          pet.cue?.key === 'landPrepare' || (pet.cue?.key === 'land' && pet.species.motions?.landPrepare)) {
        pet.facing = pet.cue.side < 0 ? 6 : 2;
      }
      else if (Math.abs(dx) > Math.max(0.01, Math.abs(dy))) pet.facing = dx < 0 ? 6 : 2;
      else if (Math.abs(dy) > 0.01) pet.facing = dy < 0 ? 4 : 0;
      const state = pet.state.getState();
      if (!pet.cue && state === 'walk' && previousState === 'walk' && Math.abs(previousFacing - pet.facing) === 4 &&
          (previousFacing === 2 || previousFacing === 6) && !reducedMotion.matches) pet.turnUntil = now + 190;
      const turning = !pet.cue && state === 'walk' && now < (pet.turnUntil ?? 0);
      const displayState = (focusMode && !pet.chasing && state === 'walk') || turning || (state === 'walk' && now < pet.speakingUntil) ? 'idle' : state;
      const sideIdle = !turning && (displayState === 'idle' || displayState === 'sit') &&
        (pet.facing === 2 || pet.facing === 6) && pet.species.motions?.sideIdle;
      const playback = pet.cue?.key ?? (sideIdle ? 'sideIdle' : displayState);
      const def = pet.cue ? cueAnimation(pet.species, pet.cue, pet.facing) : sideIdle || animationFor(pet.species, displayState);
      if (!def) continue;
      const isMemoring = pet.species.id === 'basic-memoring';
      const pace = Math.min(1, Math.abs(dx) / Math.max(0.01, pet.species.behavior.walkSpeedPxPerSec * delta / 1000));
      const changedClip = pet.playbackKey !== playback;
      if (changedClip) {
        const old = pet.clip;
        const restChange = playback === 'sleep' || playback === 'doze' || playback === 'wake' || pet.playbackKey === 'wake';
        const oldBounds = old?.bodyBounds;
        const immediate = playback === 'land' || playback === 'petBump' || playback === 'ouch' ||
          playback === 'jump' || playback === 'fireBreath' || playback === 'recover';
        const canBlend = old && old.sheet !== def.sheet && !immediate && !pet.flight && held?.pet !== pet && !reducedMotion.matches &&
          !pet.pose?.wall && (restChange || (oldBounds && def.bodyBounds));
        const last = canBlend && pet.animation.getCurrentFrameRect(previousFacing);
        const from = last && old ? pet.transition?.dominant ?? {
          clip: previousFacing >= 5 && old.leftSheet ? { ...old, sheet: old.leftSheet } : old,
          frame: last, pose: pet.pose, mirror: pet.mirror,
          bounds: oldBounds?.[pet.animation.currentFrameIndex] ?? oldBounds?.[0],
        } : undefined;
        const settling = pet.species.animations.idle?.matchWalkHeight && (playback === 'doze' || playback === 'wake');
        pet.transition = from ? { from, start: now, duration: settling ? 480 : restChange ? 290 : 165 } : undefined;
        pet.clip = def;
        pet.playbackKey = playback;
        pet.playbackStartedAt = now;
        pet.animation.setAnimation(def);
      } else {
        const rate = pet.cue?.key === 'wallImpact' && pet.species.motions?.wallImpact
          ? 1000 * def.frameCount / def.fps / (pet.cue.end - pet.cue.start)
          : held?.pet === pet && held.dragging ? 0.48 : isMemoring && playback === 'walk' ? pace : 1;
        pet.animation.update(delta * rate);
      }
      if (!pet.cue && pet.state.getState() === 'react' && pet.animation.isFinished()) pet.behavior.endReaction();
      const frame = pet.animation.getCurrentFrameRect(turning ? 0 : pet.facing);
      const grip = held?.pet === pet && held.dragging ? held.offset : undefined;
      const age = now - pet.playbackStartedAt;
      let pose = isMemoring && (pet.cue?.key === 'land' || !pet.cue) ? (reducedMotion.matches
        ? undefined
        : memoringPose(displayState, displayState === 'walk' && !pet.cue ? pet.animation.playbackElapsedMs : age, petSize, pace, grip, pet.cue))
        : pet.cue && poseFor(pet.cue, now, pet.species);
      const leftSheet = pet.facing >= 5 ? def.leftSheet : undefined;
      const mirror = !leftSheet && (def.mirrorWhen === 'always' || (def.mirrorWhen === 'left' ? pet.facing >= 5 : def.mirrorWhen === 'right' && pet.cue?.side === 1));
      if (grip && pet.species.id === 'mono-cat' && (playback === 'grabLeft' || playback === 'grabRight') && !reducedMotion.matches) {
        const anchor = { x: mirror ? petSize - grip.x : grip.x, y: grip.y };
        const settle = 1 - Math.exp(-age / 120);
        pose = { anchor, tilt: settle * (-0.22 + 0.045 * Math.sin(age / 145)), scaleX: 1, scaleY: 1, lift: 0 };
      }
      const body = def.bodyBounds?.[pet.animation.currentFrameIndex] ?? def.bodyBounds?.[0];
      const clips = pet.species.animations;
      // Seated drawings inherit the standing artwork's scale so the knees can still bend.
      const seated = (def === clips.sit || def === clips.sleep) && clips.idle?.matchWalkHeight;
      const scaleReference = seated ? clips.idle?.bodyBounds?.[0] : def.matchWalkHeight ? body : undefined;
      const walkBody = scaleReference && clips.walk?.bodyBounds?.[0];
      if (walkBody && body && scaleReference && scaleReference[3] > scaleReference[1]) {
        const factor = (walkBody[3] - walkBody[1]) / (scaleReference[3] - scaleReference[1]);
        const base = pose ?? { tilt: 0, scaleX: 1, scaleY: 1, lift: 0 };
        const scaleX = base.scaleX * factor;
        const scaleY = base.scaleY * factor;
        const centerX = after.x + petSize / 2;
        const left = centerX + (body[0] * scale - petSize / 2) * scaleX;
        const right = centerX + (body[2] * scale - petSize / 2) * scaleX;
        const floorLift = (petSize - walkBody[3] * scale) - (petSize - body[3] * scale) * scaleY;
        pose = { ...base, scaleX, scaleY };
        if (grip) {
          // Enlarge the drawing around its standing position, then swing around the cursor.
          pose.anchor = grip;
          const x = (grip.x - petSize / 2) * (factor - 1);
          const y = (grip.y - petSize) * (factor - 1) - floorLift;
          pose.shiftX = x * Math.cos(base.tilt) - y * Math.sin(base.tilt);
          pose.lift -= x * Math.sin(base.tilt) + y * Math.cos(base.tilt);
        } else if (!base.wall && !base.anchor && base.pivot !== 'center') {
          pose.shiftX = (base.shiftX ?? 0) + Math.max(0, -left) - Math.max(0, right - bounds.width);
          pose.lift += floorLift;
        }
      }
      const blending = pet.transition && now - pet.transition.start < pet.transition.duration;
      // Detached dinosaur pieces are part of the impact drawing, not a shrinking body.
      const fragmented = pet.species.id === 'block-dino' && playback === 'ouch';
      if (body && !blending && !fragmented && !reducedMotion.matches) {
        const duration = Math.min(changedClip ? 140 : 100, 850 / def.fps,
          pet.cue ? pet.cue.end - pet.cue.start : Infinity);
        const adjusted = pet.sizing.apply(body, pose, now, duration, changedClip, petSize - body[3] * scale);
        if (adjusted && adjusted !== pose && grip && !adjusted.anchor) {
          adjusted.anchor = { x: mirror ? petSize - grip.x : grip.x, y: grip.y };
          adjusted.lift = pose?.lift ?? 0;
        }
        pose = adjusted;
      } else if (!blending) pet.sizing.observe(body, pose);
      pet.pose = pose;
      pet.mirror = mirror;
      const view = leftSheet ? { ...def, sheet: leftSheet } : def;
      const pos = after;
      const airborne = pet.flight && held?.pet !== pet;
      const showSpeech = (!airborne || now < pet.reactionUntil) && activeBriefing?.pet !== pet && !resting(pet) && now < pet.until;
      let mouth;
      const center = view.mouthCenters?.[pet.animation.currentFrameIndex];
      if (center && !leftSheet && showSpeech && pet.speechStart !== undefined && !reducedMotion.matches) {
        const syllable = (now - pet.speechStart) / 145;
        const letter = pet.bubble.textContent?.[Math.floor(syllable)];
        if (letter && /[\p{L}\p{N}]/u.test(letter)) {
          const isCat = pet.species.id === 'mono-cat', isOctopus = pet.species.id === 'pastel-octopus';
          const beat = Math.sin(Math.PI * (syllable % 1));
          if (beat > .12) mouth = { center, radius: isOctopus ? 6 : 4.5, opening: beat * (isOctopus ? 2.5 : 3),
            color: isCat ? '#4f3033' : isOctopus ? '#a83d48' : '#713f32', tongue: isCat };
        }
      }
      if (frame) {
        if (pet.flight && (playback === 'fly' || playback === 'wallFall')) {
          effects.speedLines(pos, pet.flight.velocity, petSize);
        }
        const blend = pet.transition;
        if (blend && now - blend.start < blend.duration) {
          const previous = blend.from;
          if (!renderer.isReady(view) && age < 500) blend.start = now;
          const progress = (now - blend.start) / blend.duration;
          const bounds = def.bodyBounds?.[pet.animation.currentFrameIndex] ?? def.bodyBounds?.[0];
          const fitted = previous.bounds && bounds ? transitionPoses(previous.bounds, previous.pose, !!previous.mirror,
            bounds, pose, !!mirror, petSize, scale, progress) : undefined;
          const oldPose = fitted?.from ?? previous.pose;
          pet.pose = fitted?.to ?? pose;
          // Switch at matching geometry. Blending two faces here would show two pairs of eyes.
          const showPrevious = progress < .5;
          if (fitted) {
            if (showPrevious) renderer.render(previous.clip, previous.frame, pos, scale, undefined, oldPose, petSize, previous.mirror);
            else {
              if (bounds) pet.pose = pet.sizing.apply(bounds, pet.pose, now, Math.min(100, 850 / def.fps),
                false, petSize - bounds[3] * scale);
              renderer.render(view, frame, pos, scale, undefined, pet.pose, petSize, mirror, 1, mouth);
            }
          } else {
            renderer.render(previous.clip, previous.frame, pos, scale, undefined, oldPose, petSize, previous.mirror, Math.min(1, 2 * (1 - progress)));
            renderer.render(view, frame, pos, scale, undefined, pet.pose, petSize, mirror, Math.min(1, 2 * progress), mouth);
          }
          blend.dominant = showPrevious ? { ...previous, pose: oldPose } : { clip: view, frame, pose: pet.pose, mirror, bounds };
          if (showPrevious || !fitted) pet.sizing.observe(blend.dominant.bounds, blend.dominant.pose);
        } else if (view.splitBlock && pet.looseBlockAt !== undefined && pet.cue && !reducedMotion.matches) {
          const opening = Math.min(1, (now - pet.looseBlockAt) / 125);
          const closing = pet.cue.key === 'land' ? Math.max(0, 1 - (now - pet.cue.start) / (pet.cue.end - pet.cue.start)) : 1;
          const lift = opening * closing * petSize;
          renderer.render(view, { ...frame, sy: frame.sy + frame.sh }, pos, scale, undefined, pose, petSize, mirror);
          renderer.render(view, { ...frame, sy: frame.sy + frame.sh * 2 },
            { x: pos.x - pet.cue.side * lift * .13, y: pos.y - lift * .28 }, scale, undefined, pose, petSize, mirror);
        } else {
          pet.transition = undefined;
          renderer.render(view, frame, pos, scale, undefined, pose, petSize, mirror, 1, mouth);
        }
      }
      if (pet.cue?.key === 'jot') effects.checkmark(pos, petSize, (now - pet.cue.start) / (pet.cue.end - pet.cue.start));
      if (pet.cue?.key === 'tea' || pet.cue?.key === 'receive') {
        const hand = frame && pet.pose && view.receivePoint
          ? renderer.getPosePoint(view, frame, pos, scale, pet.pose, petSize, mirror, view.receivePoint) : undefined;
        effects.interactionProp(pet.cue.key, pos, petSize, pet.cue.side, (now - pet.cue.start) / (pet.cue.end - pet.cue.start), pet.meal, hand);
      }
      if (pet.cue?.key === 'fireBreath' && pet.firePending) {
        const mouth = pet.species.behavior.fireMouth ?? { x: .74, y: .42, frame: 1 };
        if (pet.animation.currentFrameIndex >= mouth.frame) {
          const side = pet.cue.side;
          const size = petSize;
          effects.burst('fire', {
            x: pos.x + size * (side < 0 ? 1 - mouth.x : mouth.x),
            y: pos.y + size * mouth.y,
          }, side, now);
          pet.firePending = false;
        }
      }
      pet.bubble.hidden = !showSpeech;
      const drawn = pet.transition?.dominant;
      const head = drawn?.pose ? renderer.getPoseBounds(drawn.clip, drawn.frame, pos, scale, drawn.pose, petSize).y :
        frame && pose ? renderer.getPoseBounds(def, frame, pos, scale, pose, petSize).y :
        frame && def.pixelArt ? renderer.getPaintBounds(def, frame, pos, scale).y : pos.y;
      if (activeBriefing?.pet === pet) {
        positionSpeech(briefingCard, pos.x + petSize / 2, head, pos.y + petSize, bounds);
        briefingBounds = briefingCard.getBoundingClientRect();
      }
      if (!pet.bubble.hidden) positionSpeech(pet.bubble, pos.x + petSize / 2, head, pos.y + petSize, bounds);
    }
    renderToy(delta);
    effects.draw(now);
    if (!focusMode && chatter?.enabled && now >= nextMeeting && !reply && !held) {
      for (let i = 0; i < pets.length; i++) {
        const a = pets[i]; const b = pets.slice(i + 1).find((other) =>
          Math.abs(petPosition(a).x - petPosition(other).x) < 210 &&
          Math.abs(petPosition(a).y - petPosition(other).y) < 100);
        if (b && now > a.until && now > b.until) { converse(a, b, now); break; }
      }
    }
    updateMouseTarget();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
void main();
