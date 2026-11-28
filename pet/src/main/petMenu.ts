import { app, dialog, nativeImage } from 'electron';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { SpeciesAnimationDef, SpeciesConfig } from '../shared/speciesSchema';
import { getLocalSpeciesRoot, listAvailableSpecies } from './speciesLoader';

export function saveImagePet(source: string) {
  if (source.length > 5_000_000 || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(source)) {
    throw new Error('펫으로 쓸 PNG 이미지를 확인해 주세요.');
  }
  const art = nativeImage.createFromDataURL(source);
  if (art.isEmpty()) throw new Error('지원되는 이미지 파일을 선택해 주세요.');
  const size = art.getSize();
  const scale = Math.min(1, 360 / Math.max(size.width, size.height));
  const image = art.resize({ width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)), quality: 'best' });
  const frame = image.getSize();
  const side = Math.max(frame.width, frame.height);
  const bitmap = image.toBitmap();
  const square = Buffer.alloc(side * side * 4);
  const left = Math.floor((side - frame.width) / 2);
  for (let row = 0; row < frame.height; row++) {
    bitmap.copy(square, ((side - frame.height + row) * side + left) * 4, row * frame.width * 4, (row + 1) * frame.width * 4);
  }
  const png = nativeImage.createFromBitmap(square, { width: side, height: side }).toPNG();
  const id = 'image-' + createHash('sha256').update(png).digest('hex').slice(0, 12);
  const dir = path.join(getLocalSpeciesRoot(), id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'pet.png'), png);
  const base: SpeciesAnimationDef = { sheet: 'pet.png', frameWidth: side, frameHeight: side, frameCount: 1, fps: 2, loop: true };
  const config: SpeciesConfig = { id, displayName: '내 사진 펫', version: '1.0.0',
    animations: { idle: { ...base, motion: 'breathe' }, walk: { ...base, motion: 'waddle', mirrorWhen: 'left' },
      sleep: { ...base, motion: 'sleep', effect: 'sleep' }, dragged: { ...base, motion: 'wriggle' } },
    behavior: { walkSpeedPxPerSec: 45, idleMinMs: 1800, idleMaxMs: 3700, walkMinMs: 4500, walkMaxMs: 8500, spriteScale: 120 / side } };
  const configPath = path.join(dir, 'species.json');
  if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  return id;
}

export function runPetMenuAction(action: unknown, select: (id: string) => void, dismiss: (id: string) => void, hide: () => void, openRecent: () => void) {
  if (!action || typeof action !== 'object' || !('kind' in action)) return;
  try {
    switch (action.kind) {
      case 'select': {
        const id = 'id' in action ? action.id : undefined;
        if (typeof id === 'string' && listAvailableSpecies().some((species) => species.id === id)) select(id);
        break;
      }
      case 'dismiss':
        if ('id' in action && typeof action.id === 'string') dismiss(action.id);
        break;
      case 'recent-note': openRecent(); break;
      case 'hide': hide(); break;
      case 'quit': app.quit(); break;
    }
  } catch (error) {
    dialog.showErrorBox('데스크톱 펫', String(error));
  }
}
