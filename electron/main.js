// PeeKit — 메인 프로세스
// 화면 전체를 덮는 투명한 "오버레이" 창 하나에 책갈피·캐릭터·메모지를 그린다.
// 오버레이는 평소 클릭이 아래 창으로 통과하고(click-through), 마우스가 책갈피/캐릭터/메모 위에 있을 때만 클릭을 받는다.
const path = require('path');
const {
  app, BrowserWindow, screen, ipcMain, Tray, Menu, Notification, globalShortcut,
  nativeImage, session, shell,
} = require('electron');
const store = require('./store');
const hostedAI = require('./hosted-ai');
const ai = require('./ai');
const { watchForeground } = require('./foreground');
const { getWeather } = require('./weather');
const { calendar } = require('./google-calendar');
const { displayEdge } = require('./display-edge');

// Keep the original Electron profile after the product rename.
const profile = process.env.MIKKANG_USER_DATA || path.join(app.getPath('appData'), 'Mikang Memo');
require('node:fs').mkdirSync(profile, { recursive: true });
app.setPath('userData', profile);
const pet = require('../dist-pet/main/index.cjs');

const ARGS = process.argv.slice(1);
const DEMO = ARGS.includes('--demo');            // 가짜 바탕화면 배경을 깔아 미리보기 (개발·스크린샷용)
const IS_MAC = process.platform === 'darwin';
const IS_WIN = process.platform === 'win32';

if (!app.requestSingleInstanceLock()) { app.quit(); }
app.setAppUserModelId('com.mikangscone.bookmarkmemo');
if (process.platform === 'linux') app.commandLine.appendSwitch('enable-transparent-visuals');

let win = null, tray = null, interactive = false, lastCursor = '', modeOverride = 'auto';
let display = null;
let quitting = false;
let stopBackground = () => {};
let petControls = null;
let proPreview = false;

const send = (ch, ...a) => { if (win && !win.isDestroyed()) win.webContents.send(ch, ...a); };

function placeOverlay(target) {
  if (!win || win.isDestroyed()) return;
  display = target || screen.getAllDisplays().find(d => d.id === display?.id) || screen.getPrimaryDisplay();
  lastCursor = '';
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
    ...(IS_MAC ? { type: 'panel' } : {}),
    show: false, title: 'PeeKit', icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false },
  });
  if (IS_MAC) {
    win.setAlwaysOnTop(true, 'floating');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
    require('../dist-pet/main/stationary.node').pin(win.getNativeWindowHandle());
  } else {
    win.setAlwaysOnTop(true, 'pop-up-menu');
  }
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'), { query: { demo: DEMO ? '1' : '' } });
  win.once('ready-to-show', () => { win.showInactive(); placeOverlay(); });
  win.on('blur', () => send('win-blur'));
  win.on('closed', () => {
    win = null;
    if (!quitting) app.quit();
  });
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
  return setInterval(() => {
    if (!win || !display) return;
    const p = screen.getCursorScreenPoint();
    const target = screen.getDisplayNearestPoint(p);
    const wa = target.workArea;
    const edge = displayEdge(p, target);
    const msg = { x: p.x - wa.x, y: p.y - wa.y, edge, on: display.id === target.id, displayId: target.id };
    const sig = `${msg.x},${msg.y},${edge},${target.id},${msg.on}`;
    if (sig !== lastCursor) { lastCursor = sig; send('cursor', msg); }
  }, 40);
}

ipcMain.handle('win:peek-display', (event, id, side) => {
  if (event.sender !== win?.webContents) return false;
  const point = screen.getCursorScreenPoint();
  const target = screen.getDisplayNearestPoint(point);
  if (target.id !== id || !side || displayEdge(point, target) !== side) return false;
  if (display.id !== id) placeOverlay(target);
  return true;
});

function startForegroundWatch() {
  const ownPids = () => app.getAppMetrics().map((m) => m.pid).concat(process.pid);
  return watchForeground((info) => send('fg', info), ownPids);
}

function trayIcon() {
  const f = IS_MAC ? 'trayTemplate.png' : 'tray.png';
  const img = nativeImage.createFromPath(path.join(__dirname, '..', 'build', f));
  if (IS_MAC) img.setTemplateImage(true);
  return img.isEmpty() ? nativeImage.createFromPath(path.join(__dirname, '..', 'build', 'icon.png')).resize({ width: 18, height: 18 }) : img;
}
function buildTrayMenu() {
  const mode = (v, label) => ({ label, type: 'radio', checked: modeOverride === v, click: () => { modeOverride = v; send('cmd', 'mode:' + v); buildTrayMenu(); } });
  const menu = Menu.buildFromTemplate([
    { label: '책갈피 펼치기', accelerator: 'CommandOrControl+Shift+M', click: () => send('cmd', 'summon') },
    { label: '새 메모', click: () => send('cmd', 'new') },
    { label: '일정 보기', click: () => send('cmd', 'agenda') },
    { label: '전체보기', click: () => send('cmd', 'board') },
    { label: 'AI 비서', click: () => send('cmd', 'assistant') },
    petControls?.state().present
      ? { label: '데스크톱 펫 숨기기', click: () => pet.setPetVisible(false) }
      : { label: '펫 소환하기', click: () => petControls?.show() },
    { type: 'separator' },
    { label: '화면 모드', submenu: [mode('auto', '펫에서 열기'), mode('desktop', '책갈피 표시')] },
    { label: '설정…', click: () => send('cmd', 'settings') },
    { label: '데이터 폴더 열기', click: () => shell.openPath(store.dir()) },
    { type: 'separator' },
    { label: '종료', role: 'quit' },
  ]);
  tray.setContextMenu(menu);
}
async function openDroppedMacPhotos(paths) {
  const fs = require('node:fs/promises');
  const photos = [];
  let remaining = 60 * 1024 * 1024;
  for (const file of paths) {
    if (!/\.(jpe?g|jfif|pjpeg|pjp|png|apng|gif|webp|bmp|dib|svg|avif|heic|heif|ico|cur|tiff?)$/i.test(file)) continue;
    if (photos.length === 6) { send('pet-photo-error', '사진은 메모 하나에 6장까지 담을 수 있어요.'); break; }
    try {
      const stat = await fs.stat(file);
      if (!stat.isFile()) continue;
      if (stat.size > remaining) { send('pet-photo-error', '한 번에 60MB 이하의 사진을 놓아 주세요.'); continue; }
      const bytes = await fs.readFile(file);
      remaining -= bytes.byteLength;
      photos.push({ name: path.basename(file), type: '', bytes });
    } catch { send('pet-photo-error', '사진 파일을 읽을 수 없어요.'); }
  }
  if (photos.length) send('pet-photos', photos);
}
function createTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip(IS_MAC ? 'PeeKit · 사진을 놓아 메모 만들기' : 'PeeKit');
  if (IS_MAC) {
    tray.on('drop-files', (_event, files) => { void openDroppedMacPhotos(files); });
    tray.on('drop-text', (_event, text) => {
      if (text.trim()) send('pet-content', { text: text.slice(0, 100000), imageUrl: '' });
    });
  }
  buildTrayMenu();
  if (IS_WIN) tray.on('click', () => send('cmd', 'summon'));
}

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+M', () => send('cmd', 'summon'));
}

/* ───────── IPC ───────── */
ipcMain.handle('state:load', () => store.loadState());
ipcMain.handle('state:save', (_e, s) => { store.saveState(s); return true; });
ipcMain.on('win:interactive', (_e, on) => setInteractive(!!on));
ipcMain.on('win:focus', () => { if (win) { if (IS_MAC) app.focus({ steal: true }); win.focus(); } });
ipcMain.on('win:release', () => { if (win && IS_WIN) win.blur(); });
ipcMain.handle('app:info', () => ({ platform: process.platform, version: app.getVersion().replace(/\+(\d+)$/, '.$1'), demo: DEMO, args: ARGS, proPreview: !app.isPackaged || DEMO }));
ipcMain.handle('memo-pet:visible', (event, visible) => {
  if (event.sender !== win?.webContents) return false;
  if (visible === true) petControls?.show();
  else if (visible === false) pet.setPetVisible(false);
  return petControls?.state().present ?? false;
});
ipcMain.handle('memo-pet:controls', async (event, action, id) => {
  if (!win || event.sender !== win.webContents || !petControls) return null;
  if (action === 'show') petControls.show(typeof id === 'string' ? id : undefined);
  if (action === 'photo' && proPreview && typeof id === 'string') {
    petControls.importPhoto(id);
  }
  return petControls.state();
});
ipcMain.handle('memo-pet:schedule-speech', (event, text, id) => {
  if (event.sender !== win?.webContents || typeof text !== 'string') return false;
  const line = text.trim().slice(0, 160);
  return line ? (petControls?.speakSchedule(line, id) ?? false) : false;
});
ipcMain.on('memo-pet:show-briefing', (event, id, text) => {
  if (event.sender === win?.webContents && typeof id === 'string' && typeof text === 'string') {
    petControls?.showBriefing(id, text.slice(0, 600));
  }
});
ipcMain.on('app:openData', () => shell.openPath(store.dir()));
ipcMain.on('pet:perch', (event, id) => {
  if (event.sender === win?.webContents && (id === null || typeof id === 'string')) petControls?.perch(id);
});
ipcMain.on('app:quit', () => app.quit());
ipcMain.on('settings:apply', (event, s) => {
  if (!s || event.sender !== win?.webContents) return;
  if (s.petSize !== undefined) petControls?.setSize(s.petSize);
  if (event.sender === win?.webContents && typeof s.proPreview === 'boolean') {
    proPreview = (!app.isPackaged || DEMO) && s.proPreview;
  }
  if (typeof s.launchAtLogin === 'boolean' && app.isPackaged) {
    const portable = IS_WIN && process.env.PORTABLE_EXECUTABLE_FILE;
    app.setLoginItemSettings({ openAtLogin: s.launchAtLogin, openAsHidden: true, ...(portable ? { path: portable } : {}) });
  }
  if (s.modeOverride && s.modeOverride !== modeOverride) { modeOverride = s.modeOverride; if (tray) buildTrayMenu(); }
});

ipcMain.on('notify', (_e, { title, body, noteId }) => {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, silent: false });
  n.on('click', () => { send('open-note', noteId); });
  n.show();
});

const personalOpenAI = require('./personal-openai');
const openAIRequest = (route, payload) => {
  const key = !hostedAI.direct && store.getKey('openai');
  return key ? personalOpenAI.request(key, route, payload) : hostedAI.request(route, store.getKey('hosted'), payload);
};
const notion = require('./notion-export').session();
ipcMain.handle('notion:action', (event, action, data) => {
  if (!notion || event.senderFrame !== win?.webContents.mainFrame ||
      event.senderFrame?.url.split('?')[0] !== require('url').pathToFileURL(path.join(__dirname,'../src/index.html')).href) return {ok:false};
  return notion(action,data);
});
const keyStatus = () => ({...store.keyStatus(), ...hostedAI.direct?.status()});
ipcMain.handle('keys:status', keyStatus);
ipcMain.handle('keys:set', (_e, name, value) => { if (hostedAI.direct && ['openai','kma'].includes(name)) hostedAI.direct.set(name,value);
  else if (['anthropic', 'hosted', 'openai', 'kma'].includes(name)) store.setKey(name, value);
  return keyStatus(); });

// 아이폰 HEIC 사진 → JPEG (화면 쪽 보안 규칙을 느슨하게 하지 않도록 메인 프로세스에서 변환)
ipcMain.handle('image:dropped-url', async (event, source) => {
  if (event.sender !== win?.webContents) throw new Error('Unknown drop target');
  const url = new URL(source);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid image URL');
  const response = await fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(15000) });
  const type = response.headers.get('content-type')?.split(';')[0] || '';
  if (!response.ok || !type.startsWith('image/')) { await response.body?.cancel(); throw new Error('Image unavailable'); }
  const limit = 60 * 1024 * 1024;
  let size = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > limit) throw new Error('Image too large');
    chunks.push(chunk);
  }
  return { bytes: Buffer.concat(chunks, size), type };
});
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
ipcMain.handle('ai:search-notes', async (event, payload) => {
  if (event.sender !== win?.webContents || typeof payload?.query !== 'string' || !Array.isArray(payload.notes)) {
    return { ok: false };
  }
  const key = store.getKey('anthropic');
  if (!key) return { ok: false, reason: 'nokey' };
  const query = payload.query.trim().slice(0, 300);
  const notes = payload.notes.slice(0, 40).map((note) => ({
    title: typeof note?.title === 'string' ? note.title.slice(0, 300) : '',
    text: typeof note?.text === 'string' ? note.text.slice(0, 2600) : '',
  }));
  if (!query || !notes.length) return { ok: true, indexes: [] };
  try { return { ok: true, indexes: await ai.searchNotes(key, { query, notes }) }; }
  catch (e) { return { ok: false, reason: 'error', error: ai.describeError(e) }; }
});
ipcMain.handle('calendar:action', async (event, action) => {
  if (event.senderFrame !== win?.webContents.mainFrame ||
      event.senderFrame?.url.split('?')[0] !== require('url').pathToFileURL(path.join(__dirname,'../src/index.html')).href ||
      !['status','connect','today','disconnect'].includes(action)) return {ok:false};
  if (hostedAI.direct && ['today','connect'].includes(action) && !(await hostedAI.request('/calendar/client')).ok) {
    const selection = await require('electron').dialog.showOpenDialog(win,{title:'Google 데스크톱 OAuth JSON 선택',properties:['openFile'],filters:[{name:'JSON',extensions:['json']}]});
    const state = await calendar('status');
    if (selection.canceled) return state;
    try { hostedAI.direct.useGoogle(JSON.parse(require('fs').readFileSync(selection.filePaths[0],'utf8').replace(/^\uFEFF/,''))); }
    catch { return {...state,ok:false,error:'Google 데스크톱 앱용 OAuth JSON을 선택해 주세요.'}; }
  }
  return calendar(action);
});
ipcMain.handle('weather:get', async (_e, city) => {
  try { return await getWeather(city); }
  catch { return { ok: false, error: '날씨를 가져오지 못했어요. 인터넷 연결을 확인해 주세요.' }; }
});
ipcMain.handle('keys:test', (_e, name) => name === 'kma' ? getWeather('서울') : name === 'openai' ? openAIRequest('/status') : name === 'hosted' ? hostedAI.request('/status', store.getKey(name)) : ai.testKey(store.getKey('anthropic')));
ipcMain.handle('ai:merge-candidates', (event, notes) => {
  if (event.sender !== win?.webContents) return { ok: false };
  return openAIRequest('/merge-candidates', { notes });
});
ipcMain.handle('ai:organize', async (_e, payload) => {
  const code = store.getKey('hosted');
  if (hostedAI.direct ? hostedAI.direct.status().openai : store.getKey('openai') || code) return openAIRequest('/organize', payload);
  const key = store.getKey('anthropic');
  if (!key) return { ok: false, reason: 'nokey' };
  try { return { ok: true, result: await ai.organize(key, payload) }; }
  catch (e) { return { ok: false, reason: 'error', error: ai.describeError(e) }; }
});

/* ───────── 시작 ───────── */
app.on('second-instance', (_event, args) => {
  if (args.includes('--overview')) send('cmd', 'board');
  else if (petControls && !petControls.state().present) petControls.show();
  else send('cmd', 'summon');
});
app.whenReady().then(() => {
  if (IS_MAC && app.dock) app.dock.hide(); // 독 아이콘 없이 상주 (메뉴 막대 아이콘으로 조작)
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(['notifications', 'clipboard-sanitized-write'].includes(perm)));
  session.defaultSession.setPermissionCheckHandler((_wc, perm) => ['notifications'].includes(perm));
  petControls = pet.startPet(() => {
    if (tray) buildTrayMenu();
    send('pet-changed');
  }, (anchor) => {
    if (!win) return;
    const target = screen.getDisplayNearestPoint({ x: Math.round(anchor.x + anchor.width / 2), y: Math.round(anchor.y + anchor.height / 2) });
    if (target.id !== display.id) placeOverlay(target);
    const origin = win.getBounds();
    send('cmd', 'pet-bookmarks', { ...anchor, x: anchor.x - origin.x, y: anchor.y - origin.y });
  }, (id) => send('pet-menu-selected', id),
  (id) => send('pet-briefing-request', id), (photos) => send('pet-photos', photos),
  (message) => send('pet-photo-error', message), () => send('cmd', 'board'), (content) => send('pet-content', content));
  createOverlay();
  createTray();
  registerShortcuts();
  const cursorTimer = startCursorFeed();
  const stopForeground = startForegroundWatch();
  stopBackground = () => {
    clearInterval(cursorTimer);
    stopForeground();
  };
  for (const event of ['display-metrics-changed', 'display-added', 'display-removed']) {
    screen.on(event, () => placeOverlay());
  }
});
app.on('before-quit', () => { quitting = true; stopBackground(); });
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
