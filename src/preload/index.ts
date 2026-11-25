import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC,
  type PetAPI,
  type Rect,
  type LoadSpeciesPayload,
  type SetStatPayload,
  type IncrementStatPayload,
  type SceneCommand,
} from '../shared/ipcContract';

const petAPI: PetAPI = {
  ready() { ipcRenderer.send(IPC.RENDERER_READY); },
  onSceneCommand(callback) {
    ipcRenderer.on(IPC.SCENE_COMMAND, (_event, command: SceneCommand) => callback(command));
  },
  getPetMenuSpecies() { return ipcRenderer.invoke(IPC.PET_MENU_SPECIES); },
  runPetMenuAction(action) { ipcRenderer.send(IPC.PET_MENU_ACTION, action); },
  getCursorPoint() { return ipcRenderer.invoke(IPC.CURSOR_POINT); },
  setClickThrough(ignore: boolean) {
    ipcRenderer.send(IPC.SET_CLICK_THROUGH, ignore);
  },
  dragStart() {
    ipcRenderer.send(IPC.DRAG_START);
  },
  dragMove(payload) {
    ipcRenderer.send(IPC.DRAG_MOVE, payload);
  },
  dragEnd() {
    ipcRenderer.send(IPC.DRAG_END);
  },
  getWorkArea(): Promise<Rect> {
    return ipcRenderer.invoke(IPC.GET_WORK_AREA);
  },
  getPlaytimeMs(): Promise<number> {
    return ipcRenderer.invoke(IPC.GET_PLAYTIME);
  },
  getStats(): Promise<Record<string, number>> {
    return ipcRenderer.invoke(IPC.GET_STATS);
  },
  setStat(payload: SetStatPayload) {
    ipcRenderer.send(IPC.SET_STAT, payload);
  },
  incrementStat(payload: IncrementStatPayload) {
    ipcRenderer.send(IPC.INCREMENT_STAT, payload);
  },
  onSpeciesLoaded(callback: (species: LoadSpeciesPayload) => void) {
    ipcRenderer.on(IPC.LOAD_SPECIES, (_event, species: LoadSpeciesPayload) => callback(species));
  },
  onPetDismissed(callback) { ipcRenderer.on(IPC.PET_DISMISSED, (_event, id: string) => callback(id)); },
  onVisibilityToggled(callback: (visible: boolean) => void) {
    ipcRenderer.on(IPC.TRAY_SHOW_HIDE, (_event, visible: boolean) => callback(visible));
  },
  onQuitRequested(callback: () => void) {
    ipcRenderer.on(IPC.QUIT_REQUESTED, () => callback());
  },
};

contextBridge.exposeInMainWorld('petAPI', petAPI);
