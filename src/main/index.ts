import { app, ipcMain, screen } from 'electron';
import { PetWindowManager } from './petWindow';
import { TrayManager } from './trayManager';
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
import { AppSettings } from './appSettings';
import { loadCompanionScene } from './sceneLoader';
import fs from 'node:fs';
import { getLocalSpeciesRoot } from './speciesLoader';
import { IPC } from '../shared/ipcContract';
import { runPetMenuAction } from './petMenu';
import type { SpeciesConfig } from '../shared/speciesSchema';

const FALLBACK_SPECIES_ID = 'placeholder';

// Reopening the launcher must never create another set of companions.
if (!app.requestSingleInstanceLock()) {
  app.exit(0);
}

registerAssetProtocolScheme();

const windowManager = new PetWindowManager();
const trayManager = new TrayManager();
const progressionTracker = new ProgressionTracker();
const statsTracker = new StatsTracker();
const appSettings = new AppSettings();
let unwatchSpecies: (() => void) | null = null;

/**
 * Loads the requested species, falling back (and self-healing the
 * persisted selection) if it no longer exists — e.g. its local folder was
 * deleted, or (for reloads) a species.json edit briefly leaves it invalid
 * mid-save.
 */
function loadSpeciesWithFallback(id: string) {
  try {
    return loadSpecies(id);
  } catch (error) {
    console.error(`Failed to load species "${id}", falling back to "${FALLBACK_SPECIES_ID}":`, error);
    return loadSpecies(FALLBACK_SPECIES_ID);
  }
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

function bootstrap(): void {
  registerAssetProtocolHandler();
  ensureLocalSpeciesRoot();
  appSettings.load();
  statsTracker.load();
  progressionTracker.start();

  const window = windowManager.create();
  registerIpcHandlers(windowManager, progressionTracker, statsTracker);

  let activeSpecies = process.env.PET_SPECIES_ID ?? appSettings.getSelectedSpeciesId();
  const dismissed = new Set(appSettings.getDismissedSpeciesIds());
  let visibleSpecies = new Set<string>();
  const publish = (scene: SpeciesConfig) => {
    visibleSpecies = new Set([scene, ...(scene.companions ?? [])].map(({ id }) => id).filter((id) => !dismissed.has(id)));
    sendSpeciesLoaded(window, { ...scene, dismissedIds: [...dismissed] });
    trayManager.refresh();
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
    trayManager.refresh();
  };
  ipcMain.handle(IPC.CURSOR_POINT, (event) => {
    if (window.isDestroyed() || event.sender !== window.webContents) return { x: -1, y: -1 };
    const cursor = screen.getCursorScreenPoint();
    const bounds = window.getContentBounds();
    return { x: cursor.x - bounds.x, y: cursor.y - bounds.y };
  });
  ipcMain.handle(IPC.PET_MENU_SPECIES, (event) => {
    if (event.sender !== window.webContents) return [];
    return listAvailableSpecies().map(({ id, displayName }) => ({ id, label: displayName,
      visible: visibleSpecies.has(id), dismissed: dismissed.has(id), selected: id === activeSpecies && visibleSpecies.has(id) }));
  });
  ipcMain.on(IPC.PET_MENU_ACTION, (event, action: unknown) => {
    if (event.sender === window.webContents) void runPetMenuAction(window, action, selectPet, dismissPet);
  });

  trayManager.create({
    onSceneCommand: (command) => window.webContents.send(IPC.SCENE_COMMAND, command),
    onToggleVisibility: () => windowManager.toggleVisibility(),
    isVisible: () => windowManager.isVisible(),
    onQuit: () => app.quit(),
    listSpecies: () => listAvailableSpecies(),
    isSpeciesDismissed: (id) => dismissed.has(id),
    getSelectedSpeciesId: () => visibleSpecies.has(activeSpecies) ? activeSpecies : '',
    onSelectSpecies: selectPet,
  });

  ipcMain.on(IPC.RENDERER_READY, (event) => {
    if (event.sender !== window.webContents) return;
    publish(loadCompanionScene(loadSpeciesWithFallback(activeSpecies)));
    watchActiveSpecies(activeSpecies, publish);
  });
}

app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  // Desktop pet has no meaningful "no windows" state on any platform; quitting
  // is driven by the tray's Quit item, not window close.
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  progressionTracker.stop();
  unwatchSpecies?.();
});
