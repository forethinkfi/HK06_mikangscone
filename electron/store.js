// 내 컴퓨터(userData 폴더)에 메모·설정·녹음 파일을 저장한다. API 키는 OS 키체인 기반 safeStorage로 암호화한다.
const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');

const dir = () => app.getPath('userData');
const file = (n) => path.join(dir(), n);
const audioDir = () => { const d = file('audio'); fs.mkdirSync(d, { recursive: true }); return d; };

function readJSON(n, fallback) {
  try { return JSON.parse(fs.readFileSync(file(n), 'utf8')); } catch { return fallback; }
}
function writeJSON(n, obj) {
  fs.mkdirSync(dir(), { recursive: true });
  const tmp = file(n + '.tmp');
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, file(n));
}

let keys = null;
function loadKeys() {
  if (keys) return keys;
  keys = {};
  try {
    const buf = fs.readFileSync(file('keys.bin'));
    const txt = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString('utf8');
    keys = JSON.parse(txt) || {};
  } catch { keys = {}; }
  return keys;
}
function setKey(name, value) {
  loadKeys();
  if (value) keys[name] = String(value).trim(); else delete keys[name];
  const txt = JSON.stringify(keys);
  fs.mkdirSync(dir(), { recursive: true });
  fs.writeFileSync(file('keys.bin'), safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(txt) : Buffer.from(txt, 'utf8'));
}
const getKey = (name) => loadKeys()[name] || process.env[name === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'] || '';
const keyStatus = () => ({ anthropic: !!getKey('anthropic'), openai: !!getKey('openai') });

const safeId = (id) => String(id).replace(/[^a-z0-9_-]/gi, '');
function saveAudio(id, buf, ext = 'webm') {
  const p = path.join(audioDir(), `${safeId(id)}.${ext}`);
  fs.writeFileSync(p, Buffer.from(buf));
  return p;
}
function findAudio(id) {
  const d = audioDir(), pre = safeId(id) + '.';
  const f = fs.readdirSync(d).find((x) => x.startsWith(pre));
  return f ? path.join(d, f) : null;
}
function deleteAudio(id) { const p = findAudio(id); if (p) fs.rmSync(p, { force: true }); }

module.exports = {
  dir, loadState: () => readJSON('data.json', null), saveState: (s) => writeJSON('data.json', s),
  getKey, setKey, keyStatus, saveAudio, findAudio, deleteAudio,
};
