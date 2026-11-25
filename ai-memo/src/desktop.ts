/** Bridge exposed by electron/preload.cjs. Undefined when the page runs in a normal browser. */
export interface OrganizeResult {
  title: string;
  summary: string;
  tags: string[];
  todos: { text: string }[];
  events: { title: string; datetime: string }[];
  decisions: string[];
}

export interface DesktopBridge {
  setOpen: (open: boolean) => Promise<void>;
  initialOpen: () => Promise<boolean>;
  setPassthrough: (through: boolean) => void;
  openNote: (id: number) => Promise<void>;
  /** close the note window this page lives in; `forget` drops its saved position */
  closeNote: (forget?: boolean) => Promise<void>;
  forgetNote: (id: number) => Promise<void>;
  resizeNote: (width: number, height: number) => void;
  ensureNoteTall: () => Promise<void>;
  noteBounds: () => Promise<{ x: number; y: number; width: number; height: number } | null>;
  onRequestOpen: (cb: () => void) => () => void;
  aiStatus: () => Promise<{ hasKey: boolean; model: string }>;
  organize: (memo: { title: string; body: string; kind: 'memo' | 'meeting' }) => Promise<
    { ok: true; result: OrganizeResult } | { ok: false; error: string }
  >;
  syncAlarms: (list: { key: string; title: string; datetime: string }[]) => Promise<void>;
  testAlarm: () => Promise<boolean>;
}

declare global {
  interface Window {
    desktop?: DesktopBridge;
  }
}

export const desktop = window.desktop;
export const isDesktop = !!desktop;

/** Set when this page is a single sticky-note window (?note=ID). */
const noteParam = Number(new URLSearchParams(location.search).get('note'));
export const noteWindowId: number | null = Number.isInteger(noteParam) && noteParam > 0 ? noteParam : null;
