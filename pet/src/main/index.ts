import { app, ipcMain, screen } from 'electron';
import { PetWindowManager } from './petWindow';
import { registerIpcHandlers, sendSpeciesLoaded } from './ipcHandlers';
import {
  loadSpecies,
  listAvailableSpecies,
  ensureLocalSpeciesRoot,
  watchSpecies,
} from './speciesLoader';
import { registerAssetProtocolScheme, registerAssetProtocolHandler } from './assetProtocol';
import { ProgressionTracker } from './progressionTracker';
import { StatsTracker } from './statsTracker';
import { AppSettings, DEFAULT_SPECIES_ID } from './appSettings';
import { loadCompanionScene } from './sceneLoader';
import fs from 'node:fs';
import { getLocalSpeciesRoot } from './speciesLoader';
import { IPC, MAX_DROPPED_PHOTOS, MAX_PHOTO_DROP_BYTES, type DroppedPhoto, type Rect } from '../shared/ipcContract';
import { saveImagePet, runPetMenuAction } from './petMenu';
import type { SpeciesConfig } from '../shared/speciesSchema';

const FALLBACK_SPECIES_ID = 'block-dino';

registerAssetProtocolScheme();

const windowManager = new PetWindowManager();
const progressionTracker = new ProgressionTracker();
const statsTracker = new StatsTracker();
const appSettings = new AppSettings();
let unwatchSpecies: (() => void) | null = null;
let onVisibilityChange: (() => void) | undefined;

/**
 * Loads the requested species, falling back (and self-healing the
 * persisted selection) if it no longer exists — e.g. its local folder was
 * deleted, or (for reloads) a species.json edit briefly leaves it invalid
 * mid-save.
 */
function loadSpeciesWithFallback(id: string) {
  for (const candidate of new Set([id, DEFAULT_SPECIES_ID])) {
    try {
      return loadSpecies(candidate);
    } catch (error) {
      console.warn(`Unable to load pet "${candidate}":`, error);
    }
  }
  return loadSpecies(FALLBACK_SPECIES_ID);
}

/**
 * Watches the active species' own folder and re-sends it on any change —
 * lets a user iterate on their local species' species.json/sprites without
 * restarting the app. Not a remote-update mechanism (deliberately out of
 * scope, see docs/roadmap.md) — purely local file watching for editing
 * convenience.
 *
 * Deliberately does NOT use loadSpeciesWithFallback/touch the persisted
 * selection here: a save that's briefly invalid mid-write (partial JSON,
 * an editor's atomic-replace window) should just be skipped and retried
 * on the next change, not silently switch the user's selected species —
 * that self-healing behavior is only appropriate at startup.
 */
function watchActiveSpecies(speciesId: string, publish: (scene: SpeciesConfig) => void): void {
  unwatchSpecies?.();
  const reload = () => {
    try {
      publish(loadCompanionScene(loadSpecies(speciesId)));
    } catch (error) {
      console.error(`Species "${speciesId}" reload failed, keeping the last good version:`, error);
    }
  };
  const unwatchers = listAvailableSpecies().map((item) => watchSpecies(item.id, reload));
  const watcher = fs.watch(getLocalSpeciesRoot(), (_event, filename) => {
    if (filename === 'scene.json') reload();
  });
  unwatchSpecies = () => { watcher.close(); unwatchers.forEach((stop) => stop()); };
}

export function startPet(notifyVisibilityChange: () => void, openBookmarks: (anchor: Rect) => void, onMenuSelection: (id: string) => void, requestBriefing: (id: string) => void,
  onPhotos: (photos: DroppedPhoto[]) => void,
  onPhotoError: (message: string) => void,
  openOverview: (target?: 'recent-note') => void, onContent: (content: { imageUrl: string; text: string }) => void) {
  onVisibilityChange = notifyVisibilityChange;
  registerAssetProtocolHandler();
  ensureLocalSpeciesRoot();
  appSettings.load();
  statsTracker.load();
  progressionTracker.start();

  const window = windowManager.create(true);
  registerIpcHandlers(windowManager, progressionTracker, statsTracker);

  let activeSpecies = process.env.PET_SPECIES_ID ?? appSettings.getSelectedSpeciesId();
  const dismissed = new Set(appSettings.getDismissedSpeciesIds());
  let visibleSpecies = new Set<string>();
  let guidesEnabled = true;
  let featureTips: import('../shared/ipcContract').FeatureTip[] = [];
  let rendererReady = false;
  let petSize = 72;
  let perchedId: string | null = null;
  const publish = (scene: SpeciesConfig) => {
    visibleSpecies = new Set([scene, ...(scene.companions ?? [])].map(({ id }) => id).filter((id) => !dismissed.has(id)));
    sendSpeciesLoaded(window, { ...scene, dismissedIds: [...dismissed] });
    notifyVisibilityChange();
  };
  const selectPet = (id: string) => {
    const scene = loadCompanionScene(loadSpecies(id));
    activeSpecies = id;
    dismissed.delete(id);
    appSettings.setSelectedSpeciesId(id);
    publish(scene);
    watchActiveSpecies(id, publish);
  };
  const dismissPet = (id: string) => {
    if (!visibleSpecies.delete(id)) return;
    dismissed.add(id);
    appSettings.dismissSpecies(id);
    window.webContents.send(IPC.PET_DISMISSED, id);
    notifyVisibilityChange();
  };
  const speciesOptions = () => listAvailableSpecies().map(({ id, displayName }) => ({
    id, label: displayName, visible: visibleSpecies.has(id), dismissed: dismissed.has(id),
    selected: id === activeSpecies && visibleSpecies.has(id),
  }));
  ipcMain.handle(IPC.CURSOR_POINT, (event) => {
    if (window.isDestroyed() || event.sender !== window.webContents) return { x: -1, y: -1 };
    const cursor = screen.getCursorScreenPoint();
    const bounds = window.getContentBounds();
    return { x: cursor.x - bounds.x, y: cursor.y - bounds.y, fileDrag: windowManager.fileDragActive() };
  });
  ipcMain.handle(IPC.PET_MENU_SPECIES, (event) => {
    if (event.sender !== window.webContents) return [];
    return speciesOptions();
  });
  ipcMain.on(IPC.PET_MENU_ACTION, (event, action: unknown) => {
    if (event.sender === window.webContents) {
      runPetMenuAction(action, (id) => {
        selectPet(id);
        onMenuSelection(id);
      }, dismissPet, () => setPetVisible(false), () => openOverview('recent-note'));
    }
  });
  ipcMain.on(IPC.DROP_CONTENT, (event, content) => {
    if (event.sender === window.webContents && typeof content?.text === 'string' &&
        content.text.length <= 100000 && typeof content.imageUrl === 'string' && content.imageUrl.length <= 16000000) onContent(content);
  });
  ipcMain.on(IPC.PHOTO_DROP, (event, photos) => {
    if (event.sender !== window.webContents || !Array.isArray(photos) ||
        !photos.length || photos.length > MAX_DROPPED_PHOTOS) return;
    if (!photos.every((photo) => typeof photo?.name === 'string' && typeof photo.type === 'string' &&
        photo.bytes instanceof ArrayBuffer && photo.bytes.byteLength > 0)) return;
    if (photos.reduce((total, photo) => total + photo.bytes.byteLength, 0) <= MAX_PHOTO_DROP_BYTES) onPhotos(photos);
  });
  ipcMain.on(IPC.PHOTO_ERROR, (event, message) => {
    if (event.sender === window.webContents && typeof message === 'string' && message.length <= 100) onPhotoError(message);
  });
  ipcMain.on(IPC.OPEN_BOOKMARKS, (event, anchor) => {
    if (!window.isDestroyed() && window.isVisible() && event.sender === window.webContents &&
        anchor && [anchor.x, anchor.y, anchor.width, anchor.height].every(Number.isFinite)) {
      const origin = window.getBounds();
      openBookmarks({ x: origin.x + anchor.x, y: origin.y + anchor.y, width: anchor.width, height: anchor.height });
    }
  });
  ipcMain.on(IPC.OPEN_OVERVIEW, (event) => {
    if (!window.isDestroyed() && window.isVisible() && event.sender === window.webContents) openOverview();
  });
  ipcMain.on(IPC.REQUEST_BRIEFING, (event, id: unknown) => {
    if (!window.isDestroyed() && window.isVisible() && event.sender === window.webContents &&
        typeof id === 'string' && visibleSpecies.has(id)) requestBriefing(id);
  });

  ipcMain.on(IPC.RENDERER_READY, (event) => {
    if (event.sender !== window.webContents) return;
    const scene = loadCompanionScene(loadSpeciesWithFallback(activeSpecies));
    if (activeSpecies !== scene.id) appSettings.setSelectedSpeciesId(scene.id);
    activeSpecies = scene.id;
    if ([scene, ...(scene.companions ?? [])].every(({ id }) => dismissed.has(id))) {
      dismissed.delete(scene.id);
    }
    rendererReady = true;
    window.webContents.send(IPC.FEATURE_TIPS, featureTips, guidesEnabled);
    window.webContents.send(IPC.PERCHED, perchedId);
    window.webContents.send(IPC.SIZE_CHANGED, petSize);
    publish(scene);
    watchActiveSpecies(activeSpecies, publish);
  });
  const show = (id?: string) => {
    const species = speciesOptions();
    if (id && !species.some((item) => item.id === id)) return;
    const next = id ?? species.find((item) => item.id === activeSpecies)?.id ??
      species.find((item) => item.id === DEFAULT_SPECIES_ID)?.id ?? FALLBACK_SPECIES_ID;
    if (id || !visibleSpecies.size) selectPet(next);
    setPetVisible(true);
  };
  return {
    setFeatureTips(tips: typeof featureTips, enabled = true) {
      guidesEnabled = enabled;
      featureTips = tips;
      if (rendererReady && !window.isDestroyed()) window.webContents.send(IPC.FEATURE_TIPS, tips, guidesEnabled);
    },
    state: () => ({ present: isPetVisible() && (!rendererReady || visibleSpecies.size > 0), species: speciesOptions() }),
    show,
    perch(id: string | null) {
      perchedId = id;
      if (rendererReady && !window.isDestroyed()) window.webContents.send(IPC.PERCHED, id);
    },
    setSize(size: number) {
      if (![56, 64, 72, 80, 88, 96, 112, 128].includes(size) || petSize === size) return;
      petSize = size;
      if (rendererReady && !window.isDestroyed()) window.webContents.send(IPC.SIZE_CHANGED, size);
    },
    importPhoto: (source: string) => show(saveImagePet(source)),
    showBriefing(id: string, text: string) {
      if (!window.isDestroyed() && window.isVisible() && visibleSpecies.has(id)) {
        window.webContents.send(IPC.SHOW_BRIEFING, id, text);
      }
    },
    speakSchedule(text: string, id = activeSpecies) {
      if (window.isDestroyed() || !rendererReady || !window.isVisible() || !visibleSpecies.has(id)) return false;
      window.webContents.send(IPC.SCHEDULE_SPEECH, text, id);
      return true;
    },
  };
}

export function isPetVisible(): boolean {
  return windowManager.isVisible();
}

export function setPetVisible(visible: boolean): void {
  windowManager.setVisibility(visible);
  onVisibilityChange?.();
}

app.on('before-quit', () => {
  progressionTracker.stop();
  unwatchSpecies?.();
});
