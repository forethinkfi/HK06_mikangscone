import type { SpeciesConfig, ChatterConfig } from '../shared/speciesSchema';
import { PetStateMachine } from './PetStateMachine';
import { AnimationController } from './AnimationController';
import { PetRenderer } from './PetRenderer';
import { BehaviorController } from './BehaviorController';
import type { Vec2 } from './types';

interface Companion {
  species: SpeciesConfig;
  state: PetStateMachine;
  animation: AnimationController;
  behavior: BehaviorController;
  bubble: HTMLDivElement;
  until: number;
  speakingUntil: number;
}

async function main(): Promise<void> {
  const canvas = document.getElementById('pet-canvas') as HTMLCanvasElement;
  const renderer = new PetRenderer(canvas);
  const bounds = await window.petAPI.getWorkArea();
  let pets: Companion[] = [];
  let chatter: ChatterConfig | undefined;
  let nextChat = Infinity;
  let nextMeeting = 0;
  let reply: { pet: Companion; text: string; at: number } | null = null;
  let pointer: Vec2 = { x: -1000, y: -1000 };
  let held: { pet: Companion; start: Vec2; offset: Vec2; dragging: boolean } | null = null;
  let clickThrough = true;
  const random = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
  const schedule = () => {
    nextChat = performance.now() + 1000 * ((chatter?.minIntervalSec ?? 180) + Math.random() * ((chatter?.maxIntervalSec ?? 360) - (chatter?.minIntervalSec ?? 180)));
  };
  function say(pet: Companion, text: string, now: number) {
    pet.bubble.textContent = `${pet.species.displayName}\n${text}`;
    pet.until = now + (chatter?.bubbleSec ?? 7) * 1000;
    pet.speakingUntil = pet.until;
    pet.bubble.hidden = false;
  }
  function converse(a: Companion, b: Companion, now: number) {
    if (!chatter?.dialogues.length) return;
    const lines = random(chatter.dialogues);
    say(a, lines[0], now);
    reply = { pet: b, text: lines[1], at: now + 1900 };
    b.speakingUntil = now + 1900 + chatter.bubbleSec * 1000;
    nextMeeting = now + 45000;
  }
  window.petAPI.onSceneCommand((command) => {
    if (!chatter) return;
    if (command === 'quiet') {
      chatter.enabled = !chatter.enabled;
      reply = null;
      for (const pet of pets) { pet.until = 0; pet.speakingUntil = 0; }
      schedule();
    } else if (chatter.enabled) {
      if (pets.length > 1) converse(pets[0], pets[1], performance.now());
      else if (pets.length) say(pets[0], random(chatter.solo), performance.now());
      schedule();
    }
  });
  window.petAPI.onSpeciesLoaded((loaded) => {
    for (const pet of pets) pet.bubble.remove();
    reply = null; held = null; renderer.clearCache(); chatter = loaded.chatter;
    pets = [loaded, ...(loaded.companions ?? [])].map((species, index) => {
      const state = new PetStateMachine();
      const animation = new AnimationController();
      const size = (species.animations.idle?.frameWidth ?? 475) * species.behavior.spriteScale;
      const behavior = new BehaviorController(state, species.behavior,
        { x: Math.max(0, Math.min(bounds.width - size, bounds.width * 0.25 + index * 220)), y: Math.max(80, bounds.height - size - 32) },
        () => ['idle', 'sit', 'sleep']);
      const bubble = document.createElement('div');
      bubble.className = 'speech'; bubble.hidden = true; document.body.append(bubble);
      state.onChange((next) => {
        const def = species.animations[next] ?? species.animations.idle;
        if (def) animation.setAnimation(def);
      });
      if (species.animations.idle) animation.setAnimation(species.animations.idle);
      return { species, state, animation, behavior, bubble, until: 0, speakingUntil: 0 };
    });
    nextChat = performance.now() + 6000; nextMeeting = performance.now() + 20000;
  });
  window.petAPI.ready();
  const hit = () => [...pets].reverse().find((pet) => {
    const def = pet.species.animations[pet.state.getState()] ?? pet.species.animations.idle;
    if (!def) return false;
    const box = renderer.getSpriteBounds(def, pet.behavior.getPosition(), pet.species.behavior.spriteScale);
    return pointer.x >= box.x && pointer.x <= box.x + box.width && pointer.y >= box.y && pointer.y <= box.y + box.height;
  });
  canvas.addEventListener('pointermove', (event) => {
    pointer = { x: event.clientX, y: event.clientY };
    if (!held) return;
    if (!held.dragging && Math.hypot(pointer.x - held.start.x, pointer.y - held.start.y) > 6) {
      held.dragging = true;
      held.pet.state.transition('idle'); held.pet.behavior.interruptForDrag();
    }
    if (held.dragging) {
      const def = held.pet.species.animations.idle!;
      const scale = held.pet.species.behavior.spriteScale;
      held.pet.behavior.setPosition({
        x: Math.max(0, Math.min(bounds.width - def.frameWidth * scale, pointer.x - held.offset.x)),
        y: Math.max(70, Math.min(bounds.height - def.frameHeight * scale, pointer.y - held.offset.y)),
      });
    }
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const pet = hit(); if (!pet) return;
    const pos = pet.behavior.getPosition();
    held = { pet, start: { ...pointer }, offset: { x: pointer.x - pos.x, y: pointer.y - pos.y }, dragging: false };
    canvas.setPointerCapture(event.pointerId);
  });
  function release() {
    if (!held) return;
    if (held.dragging) held.pet.behavior.resumeAfterDrag();
    else {
      held.pet.state.transition('idle'); held.pet.behavior.react();
      if (chatter?.enabled) say(held.pet, random(chatter.solo), performance.now());
    }
    held = null;
  }
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  let previous = performance.now();
  function tick(now: number) {
    const delta = Math.min(now - previous, 100); previous = now;
    renderer.clear();
    if (reply && now >= reply.at) { say(reply.pet, reply.text, now); reply = null; }
    if (chatter?.enabled && pets.length && now >= nextChat && !held && !reply) {
      if (pets.length > 1 && Math.random() < 0.55) converse(pets[0], pets[1], now);
      else say(random(pets), random(chatter.solo), now);
      schedule();
    }
    for (const [index, pet] of pets.entries()) {
      const def = pet.species.animations[pet.state.getState()] ?? pet.species.animations.idle;
      if (!def) continue;
      const scale = pet.species.behavior.spriteScale;
      if (now >= pet.speakingUntil || held?.pet === pet) pet.behavior.update(delta, bounds, def.frameWidth * scale);
      pet.animation.update(delta);
      if (pet.state.getState() === 'react' && pet.animation.isFinished()) pet.behavior.endReaction();
      const frame = pet.animation.getCurrentFrameRect();
      if (frame) renderer.render(def, frame, pet.behavior.getPosition(), scale);
      const pos = pet.behavior.getPosition();
      pet.bubble.style.left = `${Math.max(12, Math.min(bounds.width - 280, pos.x + def.frameWidth * scale / 2 - 130))}px`;
      const overlaps = pets.some((other) => other !== pet && now < other.until && Math.abs(other.behavior.getPosition().x - pos.x) < 280);
      pet.bubble.style.top = `${Math.max(8, pos.y - pet.bubble.offsetHeight - 12 - (overlaps && index % 2 ? 110 : 0))}px`;
      pet.bubble.hidden = now >= pet.until;
    }
    if (chatter?.enabled && now >= nextMeeting && !reply && !held) {
      for (let i = 0; i < pets.length; i++) {
        const a = pets[i]; const b = pets.slice(i + 1).find((other) =>
          Math.abs(a.behavior.getPosition().x - other.behavior.getPosition().x) < 210 &&
          Math.abs(a.behavior.getPosition().y - other.behavior.getPosition().y) < 100);
        if (b && now > a.until && now > b.until) { converse(a, b, now); break; }
      }
    }
    const ignore = !held && !hit();
    if (ignore !== clickThrough) { clickThrough = ignore; window.petAPI.setClickThrough(ignore); }
    canvas.style.cursor = held?.dragging ? 'grabbing' : hit() ? 'grab' : 'default';
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
void main();
