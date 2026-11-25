// Sticky-note windows: one small frameless window per memo, movable anywhere and remembered.
const path = require('node:path');
const fs = require('node:fs');
const { app, BrowserWindow, screen } = require('electron');

const DEFAULT = { width: 320, height: 360 };
const MIN = { width: 240, height: 200 };
const FULL_HEIGHT = 640; // tall enough to read AI 정리 under the note

/** @type {Map<number, BrowserWindow>} */
const windows = new Map();
/** saved place of every note, and whether it was open: { [id]: { x, y, width, height, open } } */
let state = {};
let quitting = false;
let saveTimer = null;

const stateFile = () => path.join(app.getPath('userData'), 'notes.json');

function load() {
  try {
    state = JSON.parse(fs.readFileSync(stateFile(), 'utf8')) || {};
  } catch {
    state = {};
  }
}

function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(stateFile(), JSON.stringify(state));
    } catch (e) {
      console.error('notes.json', e);
    }
  }, 300);
}

/** Keep a saved rectangle on a screen that still exists. */
function onScreen(b) {
  const area = screen.getDisplayMatching(b).workArea;
  const width = Math.min(Math.max(b.width, MIN.width), area.width);
  const height = Math.min(Math.max(b.height, MIN.height), area.height);
  const x = Math.min(Math.max(b.x, area.x), area.x + area.width - width);
  const y = Math.min(Math.max(b.y, area.y), area.y + area.height - height);
  return { x, y, width, height };
}

/** New notes cascade from the right of the panel, or next to the note that made them. */
function placeFor(near) {
  const area = screen.getPrimaryDisplay().workArea;
  if (near) return onScreen({ ...DEFAULT, x: near.x + 32, y: near.y + 32 });
  const n = windows.size;
  return onScreen({ ...DEFAULT, x: area.x + 460 + (n % 6) * 34, y: area.y + 90 + (n % 6) * 34 });
}

function open(id, { load: loadPage, near, preload } = {}) {
  id = Number(id);
  if (!Number.isInteger(id) || id <= 0) return;
  const existing = windows.get(id);
  if (existing && !existing.isDestroyed()) {
    if (existing.isMinimized()) existing.restore();
    existing.show();
    existing.focus();
    return;
  }
  const saved = state[id];
  const bounds = saved ? onScreen(saved) : placeFor(near);
  const w = new BrowserWindow({
    ...bounds,
    minWidth: MIN.width,
    minHeight: MIN.height,
    frame: false,
    transparent: true, // rounded corners + soft shadow drawn by the page
    resizable: false, // transparent windows can't use the OS edge; the page has its own grip
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: '#00000000',
    title: '메모',
    webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  windows.set(id, w);
  state[id] = { ...bounds, open: true };
  saveSoon();

  loadPage(w, id);
  w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // moving only stores the position: Windows reports transparent windows a few px larger
  // than asked, and saving that size would make notes creep bigger on every launch
  w.on('moved', () => {
    if (w.isDestroyed()) return;
    const { x, y } = w.getBounds();
    state[id] = { ...state[id], x, y, open: true };
    saveSoon();
  });
  w.on('closed', () => {
    windows.delete(id);
    // closing the app keeps notes marked open, so they come back next time
    if (!quitting && state[id]) {
      state[id].open = false;
      saveSoon();
    }
  });
}

function fromSender(sender) {
  for (const [id, w] of windows) if (!w.isDestroyed() && w.webContents === sender) return { id, w };
  return null;
}

function close(sender, forget) {
  const hit = fromSender(sender);
  if (!hit) return;
  if (forget) {
    delete state[hit.id];
    saveSoon();
  }
  hit.w.close();
}

/** Set a note's size and remember exactly what was asked for. */
function setSize(id, w, width, height) {
  const s = state[id] || { ...w.getBounds() };
  const next = onScreen({ x: s.x, y: s.y, width: Math.round(width), height: Math.round(height) });
  w.setBounds(next);
  state[id] = { ...next, open: true };
  saveSoon();
}

function resize(sender, width, height) {
  const hit = fromSender(sender);
  if (hit && Number.isFinite(width) && Number.isFinite(height)) setSize(hit.id, hit.w, width, height);
}

/** 전체보기 needs room: grow the window downward (never shrink it). */
function ensureHeight(sender, height) {
  const hit = fromSender(sender);
  if (!hit) return;
  const s = state[hit.id];
  if (s && s.height >= height) return;
  setSize(hit.id, hit.w, s ? s.width : DEFAULT.width, height);
}

function boundsOf(sender) {
  const hit = fromSender(sender);
  return hit ? hit.w.getBounds() : null;
}

/** A memo was deleted somewhere: close its window and forget its place. */
function forget(id) {
  id = Number(id);
  delete state[id];
  saveSoon();
  const w = windows.get(id);
  if (w && !w.isDestroyed()) w.close();
}

function reopenSaved(opts) {
  for (const [id, s] of Object.entries(state)) if (s && s.open) open(Number(id), opts);
}

app.on('before-quit', () => {
  quitting = true;
  clearTimeout(saveTimer);
  try {
    fs.writeFileSync(stateFile(), JSON.stringify(state));
  } catch {}
});

module.exports = { load, open, close, resize, ensureHeight, boundsOf, forget, reopenSaved, FULL_HEIGHT, windows };
