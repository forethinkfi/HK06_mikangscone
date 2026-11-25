// Mikang Memo — 메인 프로세스
// 화면 전체를 덮는 투명한 "오버레이" 창 하나에 책갈피·캐릭터·메모지를 그린다.
// 오버레이는 평소 클릭이 아래 창으로 통과하고(click-through), 마우스가 책갈피/캐릭터/메모 위에 있을 때만 클릭을 받는다.
const path = require('path');
const {
  app, BrowserWindow, screen, ipcMain, Tray, Menu, Notification, globalShortcut,
  nativeImage, session, shell, systemPreferences,
} = require('electron');
const store = require('./store');
const ai = require('./ai');
const { watchForeground } = require('./foreground');
const { getWeather, whereAmI } = require('./weather');
const { osLocation } = require('./oslocation');

const ARGS = process.argv.slice(1);
const DEMO = ARGS.includes('--demo');            // 가짜 바탕화면 배경을 깔아 미리보기 (개발·스크린샷용)
const IS_MAC = process.platform === 'darwin';
const IS_WIN = process.platform === 'win32';

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.setAppUserModelId('com.mikangscone.bookmarkmemo');
if (process.platform === 'linux') app.commandLine.appendSwitch('enable-transparent-visuals');

let win = null, tray = null, interactive = false, lastCursor = '', modeOverride = 'auto', hiddenUntil = 0;
let display = null;

const send = (ch, ...a) => { if (win && !win.isDestroyed()) win.webContents.send(ch, ...a); };

function placeOverlay() {
  display = screen.getPrimaryDisplay();
  const wa = display.workArea;
  win.setBounds({ x: wa.x, y: wa.y, width: wa.width, height: wa.height });
  send('display', { width: wa.width, height: wa.height });
}

function createOverlay() {
  display = screen.getPrimaryDisplay();
  const wa = display.workArea;
  win = new BrowserWindow({
    x: wa.x, y: wa.y, width: wa.width, height: wa.height,
    transparent: !DEMO, backgroundColor: DEMO ? '#cdd9e6' : '#00000000',
    frame: false, resizable: false, movable: false, minimizable: false, maximizable: false,
    fullscreenable: false, skipTaskbar: true, hasShadow: false, alwaysOnTop: true,
    show: false, title: 'Mikang Memo',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false },
  });
  if (IS_MAC) {
    win.setAlwaysOnTop(true, 'floating');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } else {
    win.setAlwaysOnTop(true, 'pop-up-menu');
  }
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'), { query: { demo: DEMO ? '1' : '' } });
  win.once('ready-to-show', () => { win.showInactive(); placeOverlay(); });
  win.on('blur', () => send('win-blur'));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
}

function setInteractive(on) {
  if (!win || on === interactive) return;
  interactive = on;
  if (on) win.setIgnoreMouseEvents(false);
  else win.setIgnoreMouseEvents(true, { forward: true });
}

// 마우스 위치를 계속 렌더러에 알려준다 (가장자리 미리보기, 클릭 통과 판정에 사용).
function startCursorFeed() {
  setInterval(() => {
    if (!win || !display) return;
    const p = screen.getCursorScreenPoint();
    const b = display.bounds, wa = display.workArea;
    const onPrimary = p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height;
    let edge = null;
    if (onPrimary && p.y > b.y + 40 && p.y < b.y + b.height - 40) {
      if (p.x <= b.x + 1) edge = 'left';
      else if (p.x >= b.x + b.width - 2) edge = 'right';
    }
    const msg = { x: p.x - wa.x, y: p.y - wa.y, edge, on: onPrimary };
    const sig = `${msg.x},${msg.y},${edge}`;
    if (sig !== lastCursor) { lastCursor = sig; send('cursor', msg); }
  }, 40);
}

function startForegroundWatch() {
  const ownPids = () => app.getAppMetrics().map((m) => m.pid).concat(process.pid);
  watchForeground((info) => send('fg', info), ownPids);
}

function trayIcon() {
  const f = IS_MAC ? 'trayTemplate.png' : 'tray.png';
  const img = nativeImage.createFromPath(path.join(__dirname, '..', 'build', f));
  if (IS_MAC) img.setTemplateImage(true);
  return img.isEmpty() ? nativeImage.createFromPath(path.join(__dirname, '..', 'build', 'icon.png')).resize({ width: 18, height: 18 }) : img;
}
function hiddenLabel() {
  if (hiddenUntil === Infinity || hiddenUntil > Date.now() + 365 * 86400000) return '캐릭터 다시 보이기 (숨김 중)';
  const m = Math.max(1, Math.round((hiddenUntil - Date.now()) / 60000));
  return `캐릭터 다시 보이기 (${m >= 60 ? Math.floor(m / 60) + '시간 ' + (m % 60 ? (m % 60) + '분 ' : '') : m + '분 '}남음)`;
}
function buildTrayMenu() {
  const mode = (v, label) => ({ label, type: 'radio', checked: modeOverride === v, click: () => { modeOverride = v; send('cmd', 'mode:' + v); buildTrayMenu(); } });
  const menu = Menu.buildFromTemplate([
    { label: '책갈피 펼치기', accelerator: 'CommandOrControl+Shift+M', click: () => send('cmd', 'summon') },
    { label: '새 메모', click: () => send('cmd', 'new') },
    { label: '녹음 메모', accelerator: 'CommandOrControl+Shift+R', click: () => send('cmd', 'record') },
    { label: '일정 보기', click: () => send('cmd', 'agenda') },
    { label: '메모 모아보기', click: () => send('cmd', 'board') },
    { type: 'separator' },
    hiddenUntil ? { label: hiddenLabel(), click: () => send('cmd', 'show') } : { label: '캐릭터 잠깐 숨기기', submenu: [
      { label: '30분', click: () => send('cmd', 'hide:30') },
      { label: '1시간', click: () => send('cmd', 'hide:60') },
      { label: '2시간', click: () => send('cmd', 'hide:120') },
      { label: '내일 아침(9시)까지', click: () => send('cmd', 'hide:tomorrow') },
      { label: '다시 켤 때까지', click: () => send('cmd', 'hide:forever') },
    ] },
    { label: '화면 모드', submenu: [mode('auto', '자동 (바탕화면이면 책갈피, 앱을 쓰면 캐릭터만)'), mode('desktop', '항상 책갈피'), mode('pet', '항상 캐릭터만')] },
    { label: '설정…', click: () => send('cmd', 'settings') },
    { label: '데이터 폴더 열기', click: () => shell.openPath(store.dir()) },
    { type: 'separator' },
    { label: '종료', role: 'quit' },
  ]);
  tray.setContextMenu(menu);
}
function createTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip('Mikang Memo');
  buildTrayMenu();
  if (IS_WIN) tray.on('click', () => send('cmd', 'summon'));
}

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+M', () => send('cmd', 'summon'));
  globalShortcut.register('CommandOrControl+Shift+R', () => send('cmd', 'record'));
}

/* ───────── IPC ───────── */
ipcMain.handle('state:load', () => store.loadState());
ipcMain.handle('state:save', (_e, s) => { store.saveState(s); return true; });
ipcMain.on('win:interactive', (_e, on) => setInteractive(!!on));
ipcMain.on('win:focus', () => { if (win) { if (IS_MAC) app.focus({ steal: true }); win.focus(); } });
ipcMain.on('win:release', () => { if (win && IS_WIN) win.blur(); });
ipcMain.handle('app:info', () => ({ platform: process.platform, version: app.getVersion(), demo: DEMO, args: ARGS }));
ipcMain.on('app:openData', () => shell.openPath(store.dir()));
ipcMain.on('app:quit', () => app.quit());
ipcMain.on('settings:apply', (_e, s) => {
  if (!s) return;
  if (typeof s.launchAtLogin === 'boolean' && app.isPackaged) app.setLoginItemSettings({ openAtLogin: s.launchAtLogin, openAsHidden: true });
  if (s.modeOverride && s.modeOverride !== modeOverride) { modeOverride = s.modeOverride; if (tray) buildTrayMenu(); }
  if ('hiddenUntil' in s) { hiddenUntil = s.hiddenUntil || 0; if (tray) buildTrayMenu(); }
});

ipcMain.on('notify', (_e, { title, body, noteId }) => {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, silent: false });
  n.on('click', () => { send('open-note', noteId); });
  n.show();
});

ipcMain.handle('keys:status', () => store.keyStatus());
ipcMain.handle('keys:set', (_e, name, value) => { if (['anthropic', 'openai'].includes(name)) store.setKey(name, value); return store.keyStatus(); });

// 아이폰 HEIC 사진 → JPEG (화면 쪽 보안 규칙을 느슨하게 하지 않도록 메인 프로세스에서 변환)
ipcMain.handle('image:heic', async (_e, buf) => {
  const convert = require('heic-convert');
  const out = await convert({ buffer: Buffer.from(buf), format: 'JPEG', quality: 0.85 });
  return new Uint8Array(out);
});
ipcMain.handle('ai:summarize', async (_e, payload) => {
  const key = store.getKey('anthropic');
  if (!key) return { ok: false, reason: 'nokey' };
  try { return { ok: true, text: await ai.summarizeAll(key, payload || {}) }; }
  catch (e) { return { ok: false, reason: 'error', error: ai.describeError(e) }; }
});
ipcMain.handle('place:os', () => osLocation());
ipcMain.handle('place:here', async (_e, coords) => {
  try { return await whereAmI(coords); }
  catch { return { ok: false, error: '지금 위치를 알아내지 못했어요. 인터넷 연결을 확인해 주세요.' }; }
});
ipcMain.handle('weather:get', async (_e, city) => {
  try { return await getWeather(city); }
  catch { return { ok: false, error: '날씨를 가져오지 못했어요. 인터넷 연결을 확인해 주세요.' }; }
});
ipcMain.handle('keys:test', (_e, name) => ai.testKey(name, store.getKey(name)));
ipcMain.handle('ai:organize', async (_e, payload) => {
  const key = store.getKey('anthropic');
  if (!key) return { ok: false, reason: 'nokey' };
  try { return { ok: true, result: await ai.organize(key, payload) }; }
  catch (e) { return { ok: false, reason: 'error', error: ai.describeError(e) }; }
});

ipcMain.handle('audio:save', (_e, id, buf, ext) => { store.saveAudio(id, buf, ext); return true; });
ipcMain.handle('audio:read', (_e, id) => { const p = store.findAudio(id); return p ? require('fs').readFileSync(p) : null; });
ipcMain.handle('audio:delete', (_e, id) => { store.deleteAudio(id); return true; });
ipcMain.handle('audio:transcribe', async (_e, id) => {
  const key = store.getKey('openai');
  if (!key) return { ok: false, reason: 'nokey' };
  const p = store.findAudio(id);
  if (!p) return { ok: false, reason: 'error', error: '녹음 파일을 찾지 못했어요.' };
  try { return { ok: true, text: await ai.transcribe(key, p) }; }
  catch (e) { return { ok: false, reason: 'error', error: ai.describeError(e) }; }
});
ipcMain.handle('mic:ask', async () => {
  if (IS_MAC) {
    const st = systemPreferences.getMediaAccessStatus('microphone');
    if (st === 'granted') return true;
    return systemPreferences.askForMediaAccess('microphone');
  }
  return true;
});

/* ───────── 시작 ───────── */
app.on('second-instance', () => send('cmd', 'summon'));
app.whenReady().then(() => {
  if (IS_MAC && app.dock) app.dock.hide(); // 독 아이콘 없이 상주 (메뉴 막대 아이콘으로 조작)
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(['media', 'notifications', 'geolocation', 'clipboard-sanitized-write'].includes(perm)));
  session.defaultSession.setPermissionCheckHandler((_wc, perm) => ['media', 'notifications', 'geolocation'].includes(perm));
  createOverlay();
  createTray();
  registerShortcuts();
  startCursorFeed();
  startForegroundWatch();
  screen.on('display-metrics-changed', placeOverlay);
  screen.on('display-added', placeOverlay);
  screen.on('display-removed', placeOverlay);
});
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
