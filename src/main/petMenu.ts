import { app, BrowserWindow, dialog, nativeImage } from 'electron';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { SpeciesAnimationDef, SpeciesConfig } from '../shared/speciesSchema';
import { getLocalSpeciesRoot, listAvailableSpecies } from './speciesLoader';

interface ScheduleItem { time: string; title: string }
type Schedule = Record<string, ScheduleItem[]>;
let appointmentWindow: BrowserWindow | undefined;

const localDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

function schedulePath() {
  return path.join(app.getPath('userData'), 'pet-schedule.json');
}

function readSchedule(): Schedule {
  const file = schedulePath();
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) as Schedule : {};
}

function addSchedule(parent: BrowserWindow) {
  if (appointmentWindow) { appointmentWindow.focus(); return; }
  const day = localDate();
  const editor = new BrowserWindow({ parent, modal: true, width: 368, height: 298, resizable: false,
    title: '오늘 일정 추가', autoHideMenuBar: true, webPreferences: { sandbox: true, contextIsolation: true } });
  appointmentWindow = editor;
  editor.on('closed', () => { appointmentWindow = undefined; });
  editor.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  editor.webContents.on('will-navigate', (event, destination) => {
    event.preventDefault();
    const url = new URL(destination);
    if (url.origin !== 'https://pcpet.invalid' || url.pathname !== '/save') return;
    const title = (url.searchParams.get('title') ?? '').trim().slice(0, 100);
    const time = url.searchParams.get('time') ?? '';
    if (!title || (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) return;
    try {
      const schedule = readSchedule();
      const today = schedule[day] ?? [];
      schedule[day] = [...today, { title, time }];
      const target = schedulePath();
      fs.writeFileSync(`${target}.tmp`, JSON.stringify(schedule, null, 2), 'utf8');
      fs.renameSync(`${target}.tmp`, target);
      editor.close();
    } catch (error) {
      dialog.showErrorBox('일정을 저장할 수 없어요', String(error));
    }
  });
  const form = `<meta charset="utf-8"><title>오늘 일정 추가</title><style>
    body{font:15px system-ui;padding:22px;background:#faf8ff;color:#281d40} h1{font-size:20px;margin:0 0 16px}
    label{display:block;margin:12px 0}input{display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:7px 9px;border:1px solid #c5b9d9;border-radius:5px;font:inherit}
    button{background:#513780;color:white;border:0;border-radius:6px;padding:8px 17px;font:inherit;cursor:pointer}
    </style><h1>오늘 일정 추가</h1><form action="https://pcpet.invalid/save" method="get">
    <label>일정<input name="title" maxlength="100" required autofocus></label>
    <label>시간 (선택)<input type="time" name="time"></label><button type="submit">저장</button></form>`;
  void editor.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(form)}`);
}

async function pickImage(parent: BrowserWindow, select: (id: string) => void) {
  const result = await dialog.showOpenDialog(parent, { title: '펫으로 쓸 이미지 선택', properties: ['openFile'],
    filters: [{ name: '이미지', extensions: ['png', 'jpeg', 'jpg', 'webp'] }] });
  if (result.canceled || !result.filePaths[0]) return;
  const source = result.filePaths[0];
  const art = nativeImage.createFromPath(source);
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
  const config: SpeciesConfig = { id, displayName: path.parse(source).name.slice(0, 60), version: '1.0.0',
    animations: { idle: { ...base, motion: 'breathe' }, walk: { ...base, motion: 'waddle', mirrorWhen: 'left' },
      sleep: { ...base, motion: 'sleep', effect: 'sleep' }, dragged: base },
    behavior: { walkSpeedPxPerSec: 45, idleMinMs: 1800, idleMaxMs: 3700, walkMinMs: 4500, walkMaxMs: 8500, spriteScale: 120 / side } };
  const configPath = path.join(dir, 'species.json');
  if (!fs.existsSync(configPath)) fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  select(id);
}

export async function runPetMenuAction(window: BrowserWindow, action: unknown, select: (id: string) => void, dismiss: (id: string) => void) {
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
      case 'openImage': await pickImage(window, select); break;
      case 'addSchedule': addSchedule(window); break;
      case 'today': {
        const today = [...(readSchedule()[localDate()] ?? [])].sort((a, b) => a.time.localeCompare(b.time));
        await dialog.showMessageBox(window, { type: 'info', title: '오늘 일정',
          message: today.length ? `오늘 일정 ${today.length}개` : '오늘 등록된 일정이 없어요.',
          detail: today.map(({ time, title }) => `${time ? `${time}  ` : ''}${title}`).join('\n'), buttons: ['확인'] });
        break;
      }
      case 'quit': app.quit(); break;
    }
  } catch (error) {
    dialog.showErrorBox('데스크톱 펫', String(error));
  }
}
