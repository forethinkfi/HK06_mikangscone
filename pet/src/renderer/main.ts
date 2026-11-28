import '../../../src/drop-content.js';
import type { SpeciesConfig, ChatterConfig, PetMotion, SpeciesAnimationDef } from '../shared/speciesSchema';
import type { PetState } from '../shared/petState';
import { PetStateMachine } from './PetStateMachine';
import { AnimationController } from './AnimationController';
import { PetRenderer } from './PetRenderer';
import { PetEffects } from './PetEffects';
import { PetQuickMenu } from './PetQuickMenu';
import { EmptyRosterPaper } from './EmptyRosterPaper';
import { FishingRig, type FishingPose } from './FishingRig';
import { BehaviorController } from './BehaviorController';
import { advanceFlight, launchVelocity, releaseVelocity, RELEASE_SAMPLE_WINDOW_MS, type PointerSample, type Flight } from './throwMotion';
import type { Rect, Vec2 } from './types';
import { motionCue, personalityOf, poseFor, type MotionCue } from './petMotion';
import { MAX_DROPPED_PHOTOS, MAX_PHOTO_DROP_BYTES, type DroppedPhoto } from '../shared/ipcContract';

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
  facing: number;
  cue?: MotionCue;
  clip?: SpeciesAnimationDef;
  playbackKey?: PetMotion | PetState;
  nextCueAt: number;
  nextLookAt: number;
  pointerDistance: number;
  reactionUntil: number;
  chasing?: boolean;
  nextBurstAt?: number;
  firePending?: boolean;
  toyPlay?: { origin: Vec2; position: Vec2; strike: Vec2; aim: Vec2; side: -1 | 1; hit: boolean };
}

let petSize = 72;
const BRIEFING_HOLD_MS = 1200;

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
};

function animationFor(species: SpeciesConfig, state: PetState) {
  return species.animations[state] ??
    (state === 'hurt' ? species.animations.react : undefined) ?? species.animations.idle;
}

function cueAnimation(species: SpeciesConfig, { key: motion, strength }: MotionCue, facing: number) {
  if (species.motions?.[motion]) return species.motions[motion];
  if ((facing === 2 || facing === 6) && species.motions?.sideIdle && (motion === 'curious' || motion === 'meet' || motion === 'startle')) {
    return species.motions.sideIdle;
  }
  const fallback: Partial<Record<PetMotion, PetState>> = {
    fly: 'dragged', wallFall: 'dragged', land: 'sit', ouch: 'hurt',
    doze: 'sit', curious: 'react', startle: 'react', slip: 'walk',
  };
  if (motion === 'wallImpact' || motion === 'petBump') return animationFor(species, strength > 0.5 ? 'hurt' : 'idle');
  return animationFor(species, fallback[motion] ?? 'idle');
}

async function main(): Promise<void> {
  const canvas = document.getElementById('pet-canvas') as HTMLCanvasElement;
  const renderer = new PetRenderer(canvas);
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
  const otterSounds = new Map<string, HTMLAudioElement>();
  function playOtterSound(species: string, event: 'gift' | 'wall' | 'land' | 'bookmark' | 'receive') {
    if (species !== 'coral-otter') return;
    let clip = otterSounds.get(event);
    if (!clip) {
      clip = new Audio(new URL('sounds/otter-' + event + '.wav', document.baseURI).href);
      clip.volume = 0.55;
      otterSounds.set(event, clip);
    }
    clip.currentTime = 0;
    void clip.play().catch(() => {});
  }
  window.petAPI.onPerched((id) => {
    perchedId = id;
  });
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
  const petMenu = new PetQuickMenu(toggleToy);
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
    pet.until = 0;
    pet.speakingUntil = 0;
    pet.reactionUntil = 0;
    pet.bubble.hidden = true;
  }
  function cue(pet: Companion, key: PetMotion, now: number, side: -1 | 1 = 1, strength = 0) {
    pet.cue = motionCue(pet.species, key, now, side, strength);
    if (pet.playbackKey === key) pet.playbackKey = undefined;
    if (key === 'doze') hush(pet);
    return pet.cue;
  }
  const random = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
  const schedule = () => {
    nextChat = performance.now() + 1000 * ((chatter?.minIntervalSec ?? 180) + Math.random() * ((chatter?.maxIntervalSec ?? 360) - (chatter?.minIntervalSec ?? 180)));
  };
  function say(pet: Companion, text: string, now: number, pause = true) {
    if (!canChat(pet, now)) return;
    pet.bubble.textContent = text;
    pet.until = now + (chatter?.bubbleSec ?? 7) * 1000;
    pet.speakingUntil = pause ? pet.until : 0;
    pet.bubble.hidden = false;
  }
  function reactWithLine(pet: Companion, reaction: keyof typeof REACTION_LINES, now: number) {
    if (!chatter?.enabled || resting(pet)) return;
    if (reply?.pet === pet) reply = null;
    const lines = pet.species.dialogue?.reactions?.[reaction];
    pet.bubble.textContent = random(lines?.length ? lines : REACTION_LINES[reaction]);
    pet.reactionUntil = now + (reaction === 'landing' || reaction === 'bump' ? 3200 : 1600);
    pet.until = pet.reactionUntil;
    pet.speakingUntil = reaction === 'landing' ? pet.until : 0;
    pet.bubble.hidden = false;
  }
  const canChat = (pet: Companion, now: number) =>
    pet.species.id !== perchedId && !resting(pet) && !pet.cue && held?.pet !== pet && now >= pet.reactionUntil;
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
      pet.playbackKey = undefined;

    }
    toyProp = undefined;
  });
  window.petAPI.onSpeciesLoaded((loaded) => {
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
      const behavior = new BehaviorController(state, species.behavior, { x, y: 0 }, () => ['idle', 'sit', 'sleep'], patrolDirection);
      const bubble = document.createElement('div');
      bubble.dataset.speaker = species.id;
      bubble.className = 'speech'; bubble.hidden = true; document.body.append(bubble);
      const initialAnimation = animationFor(species, state.getState());
      if (initialAnimation) animation.setAnimation(initialAnimation);
      const now = performance.now();
      return { original, paused: false, species, state, animation, behavior, bubble, until: 0, speakingUntil: 0, facing: 0,
        clip: initialAnimation, playbackKey: state.getState(), reactionUntil: 0,
        nextCueAt: now + 2400,
        nextLookAt: 0, pointerDistance: Infinity };
    });
    nextChat = performance.now() + 6000; nextMeeting = performance.now() + 20000; nextEncounter = performance.now() + 4000;
    if (pets.length && !localStorage.getItem('pet-context-tip')) {
      localStorage.setItem('pet-context-tip', '1');
      say(pets[0], '나를 우클릭해 봐!', performance.now());
    }
  });
  window.petAPI.onPetDismissed((id) => {
    const departing = pets.find((pet) => pet.species.id === id);
    if (!departing) return;
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
    const lines = pet.species.dialogue?.solo;
    const line = random(lines?.length ? lines : chatter?.solo ?? []);
    if (line) say(pet, line, now);
  }
  window.petAPI.ready();
  const hit = () => [...pets].reverse().find((pet) => {
    if (pet.species.id === perchedId) return false;
    const def = pet.clip;
    if (!def) return false;
    const frame = pet.animation.getCurrentFrameRect(pet.facing);
    const pose = pet.cue && poseFor(pet.cue, previous, pet.species);
    const pos = petPosition(pet);
    const scale = pet.species.behavior.spriteScale;
    const box = pose && frame ? renderer.getPoseBounds(def, frame, pos, scale, pose, petSize) : renderer.getSpriteBounds(def, pos, scale);
    // Keep the current target through small frame-to-frame changes at its edge.
    const padding = fileDrag ? 28 : pet === hoveredPet ? HOVER_EXIT_PADDING : 0;
    return pointer.x >= box.x - padding && pointer.x <= box.x + box.width + padding &&
      pointer.y >= box.y - padding && pointer.y <= box.y + box.height + padding;
  });
  function trackDrop(event: DragEvent) {
    if (!event.dataTransfer || !window.MemoDrop.accepts(event.dataTransfer)) return;
    fileDrag = true;
    event.preventDefault();
    pointer = { x: event.clientX, y: event.clientY };
    dropTarget = hit();
    event.dataTransfer.dropEffect = dropTarget ? 'copy' : 'none';
    updateMouseTarget();
  }
  canvas.addEventListener('dragenter', trackDrop);
  canvas.addEventListener('dragover', trackDrop);
  canvas.addEventListener('dragleave', () => { fileDrag = false; dropTarget = undefined; });
  canvas.addEventListener('drop', async (event) => {
    event.preventDefault();
    pointer = { x: event.clientX, y: event.clientY };
    const target = hit() || dropTarget;
    fileDrag = false; dropTarget = undefined;
    if (!target || !event.dataTransfer) return;
    const files = window.MemoDrop.files(event.dataTransfer);
    const images = files.filter(file =>
      file.type.startsWith('image/') || /\.(jpe?g|jfif|pjpeg|pjp|png|apng|gif|webp|bmp|dib|svg|avif|heic|heif|ico|cur|tiff?)$/i.test(file.name));
    if (!images.length) {
      const content = window.MemoDrop.content(event.dataTransfer);
      if (content.imageUrl || content.text) {
        receiveMemo(target);
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
      receiveMemo(target);
      window.petAPI.sendPhotos(photos);
    }
  });
  function receiveMemo(pet: Companion) {
    if (pet.species.motions?.receive) cue(pet, 'receive', performance.now());
    playOtterSound(pet.species.id, 'receive');
  }
  function beginDrag(grab: NonNullable<typeof held>) {
    const { pet } = grab;
    const now = performance.now();
    grab.dragging = true;
    pet.cue = undefined;
    pet.state.transition('idle');
    pet.behavior.interruptForDrag();
    hush(pet);
    reactWithLine(pet, 'grab', now);
  }
  function positionHeld(grab: NonNullable<typeof held>) {
    const size = petSize;
    const x = floorX(pointer.x - grab.offset.x, size);
    const previousX = petPosition(grab.pet).x;
    if (x !== previousX) grab.pet.facing = x < previousX ? 6 : 2;
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
        window.petAPI.requestBriefing(pet.species.id);
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
        window.petAPI.openBookmarks({ ...pos, width: petSize, height: petSize });
      }
    }
    if (!held || (event instanceof PointerEvent && event.pointerId !== held.pointerId)) return;
    if (event instanceof PointerEvent && event.type === 'pointerup') moveHeld(event);
    const { pet, dragging, offset, region, samples } = held;
    held = null;
    if (dragging && pet.flight) {
      const velocity = event.type === 'pointerup' ? releaseVelocity(samples) : { x: 0, y: 0 };
      pet.flight.velocity = launchVelocity(velocity, bounds.height - petSize - pet.flight.position.y);
      cue(pet, 'fly', performance.now(), pet.facing >= 5 ? -1 : 1);
    } else if (event.type === 'pointerup') {
      const now = performance.now();
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
    if (!pet || !action || (action === 'shellGift' && pet.flight)) return;
    event.preventDefault();
    if (action === 'chase') {
      if (pet.chasing) {
        window.petAPI.runPetMenuAction({ kind: 'dismiss', id: pet.species.id });
      } else {
        if (toyEnabled && toyOwner() === pet) toggleToy();
        pet.toyPlay = undefined;
        pet.cue = undefined;
        hush(pet);
        pet.paused = false;
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
    if (action === 'shellGift') {
      pet.state.transition('idle');
      if (chatter?.enabled) say(pet, '내 주머니에 간직한 조개예요. 받아요!', now, false);
      pet.nextBurstAt = cue(pet, 'shellGift', now, side).end;
      playOtterSound(pet.species.id, 'gift');
      return;
    }
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
  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    if (!event.shiftKey) return;
    pointer = { x: event.clientX, y: event.clientY };
    const pet = hit();
    if (pet) petMenu.open(pointer, hasToy(pet), toyEnabled);
  });
  window.addEventListener('blur', release);

  function finishCue(pet: Companion, now: number) {
    if (pet.cue && !pet.toyPlay && now >= pet.cue.end) pet.cue = undefined;
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

  const pointerInArea = () => toyPointer.x >= 0 && toyPointer.y >= 0 && toyPointer.x <= bounds.width && toyPointer.y <= bounds.height;

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
      if (previousState === 'walk' && personality === 'relaxed' && onFloor) cue(pet, 'doze', now, side);
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
    const walkers = pets.filter((pet) => pet.species.id !== perchedId && !pet.cue &&
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

  function followCursor(pet: Companion, delta: number) {
    if (pointer.x < 0 || pointer.y < 0 || pointer.x > bounds.width || pointer.y > bounds.height) {
      pet.state.transition('idle');
      return;
    }
    const size = petSize;
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
    if (chatter?.enabled && pets.length && now >= nextChat && !held && !reply) {
      const available = pets.filter((pet) => canChat(pet, now));
      if (available.length > 1 && Math.random() < 0.55) converse(available[0], available[1], now);
      else if (available.length) talkToUser(random(available), now);
      if (available.length) schedule();
      else nextChat = now + 1500;
    }
    encounter(now);
    if (activeBriefing && (now >= activeBriefing.until || held || petMenu.isOpen || !pets.includes(activeBriefing.pet))) {
      activeBriefing = undefined;
      briefingBounds = undefined;
    }
    briefingCard.hidden = !activeBriefing;
    for (const pet of pets) {
      if (pet.species.id === perchedId) { pet.bubble.hidden = true; continue; }
      finishCue(pet, now);
      const scale = pet.species.behavior.spriteScale;
      const before = petPosition(pet);
      const previousState = pet.state.getState();
      if (pet.flight) {
        const braced = pet.cue?.key === 'wallCling' ||
          (pet.species.id === 'mono-cat' && pet.cue?.key === 'wallImpact');
        if (held?.pet !== pet && !braced) {
          const step = advanceFlight(pet.flight, delta / 1000, Math.max(0, bounds.width - petSize), Math.max(0, bounds.height - petSize));
          pet.flight = step;
          if (step.wall && !step.landed) {
            const side = step.wall === 'left' ? -1 : 1;
            const strength = Math.min(1, step.wallSpeed / 650);
            if (step.wallSpeed >= 240) playOtterSound(pet.species.id, 'wall');
            if (pet.species.motions?.wallCling) {
              const contact = motionCue(pet.species, 'wallCling', now, side, strength);
              contact.end = now + 650;
              pet.cue = contact;
              step.velocity = { x: -side * 65, y: 40 };
            } else {
              cue(pet, 'wallImpact', now, side, strength);
              if (pet.species.id === 'mono-cat') {
                step.velocity = { x: -side * (160 + strength * 130), y: -180 };
              }
            }
            if (pet.species.dialogue?.reactions?.bump?.length) reactWithLine(pet, 'bump', now);
          }
          if (step.landed) {
            playOtterSound(pet.species.id, 'land');
            pet.behavior.setPosition({ x: step.position.x, y: 0 });
            pet.flight = undefined;
            pet.behavior.resumeAfterDrag();
            if (pet.paused) pet.state.transition('idle');
            cue(pet, 'land', now, pet.facing >= 5 ? -1 : 1);
          }
        }
      } else if (!pet.paused && rightPress?.pet !== pet && !fileDrag && pet.chasing && held?.pet !== pet) {
        followCursor(pet, delta);
      } else if (!pet.paused && rightPress?.pet !== pet && !fileDrag && playWithToy(pet, now, delta)) { /* Toy pose drives position while active. */ }
      else if (!pet.paused && !fileDrag && held?.pet !== pet && !pet.cue && now >= pet.speakingUntil) {
        const size = petSize;
        pet.behavior.update(delta, { x: 0, y: 0, width: Math.max(bounds.width, size), height: bounds.height }, size);
        cueForMovement(pet, now, petPosition(pet), previousState);
      }
      const after = petPosition(pet);
      const dx = after.x - before.x;
      const dy = after.y - before.y;
      if (pet.toyPlay) pet.facing = pet.toyPlay.side < 0 ? 6 : 2;
      else if (pet.cue?.key === 'fireBreath' || pet.cue?.key === 'scratch') pet.facing = pet.cue.side < 0 ? 6 : 2;
      else if (pet.cue?.key === 'wallImpact' || pet.cue?.key === 'wallCling' || pet.cue?.key === 'wallFall' ||
          pet.cue?.key === 'landPrepare' || (pet.cue?.key === 'land' && pet.species.motions?.landPrepare)) {
        pet.facing = pet.cue.side < 0 ? 6 : 2;
      }
      else if (Math.abs(dx) > Math.max(0.01, Math.abs(dy))) pet.facing = dx < 0 ? 6 : 2;
      else if (Math.abs(dy) > 0.01) pet.facing = dy < 0 ? 4 : 0;
      const state = pet.state.getState();
      const sideIdle = (state === 'idle' || state === 'sit') && (pet.facing === 2 || pet.facing === 6) && pet.species.motions?.sideIdle;
      const playback = pet.cue?.key ?? (sideIdle ? 'sideIdle' : state);
      const def = pet.cue ? cueAnimation(pet.species, pet.cue, pet.facing) : sideIdle || animationFor(pet.species, state);
      if (!def) continue;
      if (pet.playbackKey !== playback) {
        pet.clip = def;
        pet.playbackKey = playback;
        pet.animation.setAnimation(def);
      } else pet.animation.update(held?.pet === pet && held.dragging ? delta * 0.48 : delta);
      if (!pet.cue && pet.state.getState() === 'react' && pet.animation.isFinished()) pet.behavior.endReaction();
      const frame = pet.animation.getCurrentFrameRect(pet.facing);
      const pose = pet.cue && poseFor(pet.cue, now, pet.species);
      const leftSheet = pet.facing >= 5 ? def.leftSheet : undefined;
      const mirror = !leftSheet && (def.mirrorWhen === 'always' || (def.mirrorWhen === 'left' ? pet.facing >= 5 : def.mirrorWhen === 'right' && pet.cue?.side === 1));
      const view = leftSheet ? { ...def, sheet: leftSheet } : def;
      const pos = after;
      if (frame) renderer.render(view, frame, pos, scale,
        undefined, pose, petSize, mirror);
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
      pet.bubble.hidden = activeBriefing?.pet === pet || resting(pet) || now >= pet.until;
      const head = frame && pose ? renderer.getPoseBounds(def, frame, pos, scale, pose, petSize).y :
        frame && def.pixelArt ? renderer.getPaintBounds(def, frame, pos, scale).y : pos.y;
      if (activeBriefing?.pet === pet) {
        positionSpeech(briefingCard, pos.x + petSize / 2, head, pos.y + petSize, bounds);
        briefingBounds = briefingCard.getBoundingClientRect();
      }
      if (!pet.bubble.hidden) positionSpeech(pet.bubble, pos.x + petSize / 2, head, pos.y + petSize, bounds);
    }
    renderToy(delta);
    effects.draw(now);
    if (chatter?.enabled && now >= nextMeeting && !reply && !held) {
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
