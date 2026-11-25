// Electron main process: the bookmark window, and (later) AI + alarms.
// API keys are read here from .env and never sent to the renderer.
const path = require('node:path');
const fs = require('node:fs');
const { app, BrowserWindow, ipcMain, screen, session } = require('electron');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const ai = require('./ai.cjs');
const alarms = require('./alarms.cjs');
const notes = require('./notes.cjs');

const PRELOAD = path.join(__dirname, 'preload.cjs');

// dev checks run with their own data folder so they never touch real memos
if (process.env.AI_MEMO_USER_DATA) app.setPath('userData', process.env.AI_MEMO_USER_DATA);

/** Load the app page into a window; `note` makes it a single sticky-note window. */
function loadPage(w, note) {
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) w.loadURL(note ? `${devUrl}?note=${note}` : devUrl);
  else w.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), note ? { query: { note: String(note) } } : undefined);
}
const noteOpts = { load: loadPage, preload: PRELOAD };

const TAB = { width: 44, height: 196 };
const PANEL_WIDTH = 420;

/** @type {BrowserWindow | null} */
let win = null;

function boundsFor(open) {
  const { workArea } = screen.getPrimaryDisplay();
  if (open) return { x: workArea.x, y: workArea.y, width: PANEL_WIDTH, height: workArea.height };
  return {
    x: workArea.x,
    y: Math.round(workArea.y + workArea.height * 0.28),
    width: TAB.width,
    height: TAB.height,
  };
}

function createWindow() {
  const startOpen = process.env.AI_MEMO_OPEN === '1';
  win = new BrowserWindow({
    ...boundsFor(startOpen),
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    title: 'AI 메모지',
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  // stay above normal windows but below screen savers / full-screen video
  win.setAlwaysOnTop(true, 'floating');

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  loadPage(win, null);

  // don't let links open inside the bookmark window
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => {
    if (devUrl && url.startsWith(devUrl)) return;
    e.preventDefault();
  });

  maybeScreenshot(startOpen);
}

/** AI_MEMO_SHOT=out.png → capture the window once it has rendered, then quit (used for checks). */
function maybeScreenshot(startOpen) {
  const out = process.env.AI_MEMO_SHOT;
  if (!out) return;
  win.webContents.once('did-finish-load', () => {
    setTimeout(async () => {
      if (process.env.AI_MEMO_SCRIPT) {
        // dev check: run a script in the page (returns a string to log)
        const code = fs.readFileSync(process.env.AI_MEMO_SCRIPT, 'utf8');
        try {
          console.log('[script]', await win.webContents.executeJavaScript(code));
        } catch (e) {
          console.log('[script] failed:', e && e.message);
        }
      }
      if (process.env.AI_MEMO_TOGGLE_TEST) {
        // click 접기, then the bookmark, logging window bounds after each
        const click = (sel) =>
          win.webContents.executeJavaScript(`document.querySelector('${sel}').click()`);
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        await click('button[title="접기 (Esc)"]');
        await wait(500);
        console.log('[toggle] after close', JSON.stringify(win.getBounds()));
        await click('button[title="메모지 펼치기"]');
        await wait(800);
        console.log('[toggle] after open', JSON.stringify(win.getBounds()));
      }
      if (process.env.AI_MEMO_NOTE_SCRIPT) {
        const [first] = notes.windows.values();
        if (first) {
          // simulate dragging the note somewhere else (fires 'moved' like a real drag)
          first.setPosition(900, 300);
          first.emit('moved');
          const code = fs.readFileSync(process.env.AI_MEMO_NOTE_SCRIPT, 'utf8');
          try {
            console.log('[note-script]', await first.webContents.executeJavaScript(code));
          } catch (e) {
            console.log('[note-script] failed:', e && e.message);
          }
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      for (const [id, w] of notes.windows) console.log('[note]', id, JSON.stringify(w.getBounds()));
      const img = await win.webContents.capturePage();
      fs.writeFileSync(out, img.toPNG());
      console.log(`[shot] ${out} ${JSON.stringify(win.getBounds())} open=${startOpen}`);
      setTimeout(() => app.quit(), Number(process.env.AI_MEMO_STAY_MS || 0));
    }, Number(process.env.AI_MEMO_SHOT_DELAY || 2500));
  });
}

// over the see-through gaps between cards, let clicks fall through to the window behind
// (forward: true keeps mousemove coming so the page can switch it back over a card)
ipcMain.on('window:passthrough', (_e, through) => {
  if (process.env.AI_MEMO_SCRIPT) console.log('[passthrough]', Boolean(through));
  win?.setIgnoreMouseEvents(Boolean(through), { forward: true });
});

ipcMain.handle('window:set-open', (_e, open) => {
  if (!win) return;
  win.setIgnoreMouseEvents(false);
  win.setBounds(boundsFor(Boolean(open)));
  if (open) win.focus();
});

ipcMain.handle('window:initial-open', () => process.env.AI_MEMO_OPEN === '1');

// sticky-note windows
ipcMain.handle('note:open', (e, id) => {
  // a note opened from another note appears next to it
  notes.open(id, { ...noteOpts, near: notes.boundsOf(e.sender) || undefined });
});
ipcMain.handle('note:close', (e, forget) => notes.close(e.sender, Boolean(forget)));
ipcMain.handle('note:forget', (_e, id) => notes.forget(id));
ipcMain.on('note:resize', (e, width, height) => notes.resize(e.sender, Number(width), Number(height)));
ipcMain.handle('note:ensure-tall', (e) => notes.ensureHeight(e.sender, notes.FULL_HEIGHT));
ipcMain.handle('note:bounds', (e) => notes.boundsOf(e.sender));

ipcMain.handle('ai:status', () => ai.status());
ipcMain.handle('ai:organize', (_e, memo) => {
  if (!memo || typeof memo.body !== 'string') return { ok: false, error: '메모 내용이 없어요.' };
  return ai.organize({ title: String(memo.title || ''), body: memo.body, kind: memo.kind === 'meeting' ? 'meeting' : 'memo' });
});

ipcMain.handle('alarms:sync', (_e, list) => alarms.sync(list));
ipcMain.handle('alarms:test', () => alarms.show('🎀 알람 테스트', '알림이 이렇게 떠요.'));

// Windows needs an app id for toast notifications to show
if (process.platform === 'win32') app.setAppUserModelId('AI 메모지');

app.whenReady().then(() => {
  // only the microphone (for 녹음) may be requested by the page
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'media'));
  createWindow();
  // bring back the notes that were open last time, where they were
  notes.load();
  notes.reopenSaved(noteOpts);
  alarms.start(() => {
    if (!win) return;
    win.webContents.send('window:request-open');
    win.show();
  });
  // keep the bookmark glued to the left edge if the screen layout changes
  screen.on('display-metrics-changed', () => {
    if (!win) return;
    const open = win.getBounds().width > TAB.width;
    win.setBounds(boundsFor(open));
  });
});

app.on('window-all-closed', () => app.quit());
