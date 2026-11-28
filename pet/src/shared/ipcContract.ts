import type { SpeciesConfig } from './speciesSchema';

export const IPC = {
  FEATURE_TIPS: 'scene:featureTips',
  RENDERER_READY: 'scene:ready',
  SET_CLICK_THROUGH: 'pet:setClickThrough',
  DRAG_START: 'pet:dragStart',
  DRAG_MOVE: 'pet:dragMove',
  DRAG_END: 'pet:dragEnd',
  GET_WORK_AREA: 'pet:getWorkArea',
  GET_PLAYTIME: 'pet:getPlaytime',
  GET_STATS: 'pet:getStats',
  SET_STAT: 'pet:setStat',
  INCREMENT_STAT: 'pet:incrementStat',
  LOAD_SPECIES: 'species:load',
  TRAY_SHOW_HIDE: 'tray:toggleVisibility',
  QUIT_REQUESTED: 'app:quitRequested',
  SCENE_COMMAND: 'scene:command',
  PET_MENU_SPECIES: 'pet:menuSpecies',
  PET_MENU_ACTION: 'pet:menuAction',
  PET_DISMISSED: 'pet:dismissed',
  SIZE_CHANGED: 'pet:size',
  DROP_CONTENT: 'pet:dropContent',
  PERCHED: 'pet:perched',
  PHOTO_DROP: 'pet:photoDrop',
  PHOTO_ERROR: 'pet:photoError',
  OPEN_BOOKMARKS: 'pet:openBookmarks',
  OPEN_OVERVIEW: 'pet:openOverview',
  REQUEST_BRIEFING: 'pet:requestBriefing',
  SHOW_BRIEFING: 'pet:showBriefing',
  SCHEDULE_SPEECH: 'pet:scheduleSpeech',
  CURSOR_POINT: 'pet:cursorPoint',
} as const;

export type SceneCommand = 'demo' | 'quiet' | 'toy';
export type PetMenuAction = { kind: 'select' | 'dismiss'; id: string } | { kind: 'hide' | 'quit' | 'recent-note' };
export interface PetMenuSpecies { id: string; label: string; selected: boolean; visible: boolean; dismissed: boolean }

export interface DroppedPhoto { name: string; type: string; bytes: ArrayBuffer }
export const MAX_DROPPED_PHOTOS = 6;
export const MAX_PHOTO_DROP_BYTES = 60 * 1024 * 1024;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DragMovePayload {
  x: number;
  y: number;
}

export type LoadSpeciesPayload = SpeciesConfig & { dismissedIds?: string[] };

export interface SetStatPayload {
  key: string;
  value: number;
}

export interface IncrementStatPayload {
  key: string;
  delta: number;
}

export interface FeatureTip { id: string; instruction: string }

export interface PetAPI {
  onFeatureTips(callback: (tips: FeatureTip[], enabled: boolean) => void): void;
  ready(): void;
  onSizeChanged(callback: (size: number) => void): void;
  onSceneCommand(callback: (command: SceneCommand) => void): void;
  getPetMenuSpecies(): Promise<PetMenuSpecies[]>;
  runPetMenuAction(action: PetMenuAction): void;
  onPerched(callback: (id: string | null) => void): void;
  sendContent(content: { imageUrl: string; text: string }): void;
  sendPhotos(photos: DroppedPhoto[]): void;
  photoError(message: string): void;
  openBookmarks(anchor: Rect): void;
  openOverview(): void;
  requestBriefing(id: string): void;
  onBriefing(callback: (id: string, text: string) => void): void;
  onScheduleSpeech(callback: (text: string, id: string) => void): void;
  getCursorPoint(): Promise<{ x: number; y: number; fileDrag?: boolean }>;
  setClickThrough(ignore: boolean): void;
  dragStart(): void;
  dragMove(payload: DragMovePayload): void;
  dragEnd(): void;
  getWorkArea(): Promise<Rect>;
  getPlaytimeMs(): Promise<number>;
  /**
   * Generic named-stat persistence — framework only, not wired into any
   * gameplay logic yet. See src/main/statsTracker.ts.
   */
  getStats(): Promise<Record<string, number>>;
  setStat(payload: SetStatPayload): void;
  incrementStat(payload: IncrementStatPayload): void;
  onSpeciesLoaded(callback: (species: LoadSpeciesPayload) => void): void;
  onPetDismissed(callback: (id: string) => void): void;
  onVisibilityToggled(callback: (visible: boolean) => void): void;
  onQuitRequested(callback: () => void): void;
}
