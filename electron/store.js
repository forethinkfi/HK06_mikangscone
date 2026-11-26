// 내 컴퓨터(userData 폴더)에 메모와 설정을 저장한다. API 키는 OS 키체인 기반 safeStorage로 암호화한다.
const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');

const dir = () => app.getPath('userData');
const file = (n) => path.join(dir(), n);

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
  const slot = name;
  if (value) keys[slot] = String(value).trim(); else delete keys[slot];
  const txt = JSON.stringify(keys);
  fs.mkdirSync(dir(), { recursive: true });
  fs.writeFileSync(file('keys.bin'), safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(txt) : Buffer.from(txt, 'utf8'));
}
const getKey = name => loadKeys()[name] || (name === 'anthropic' ? process.env.ANTHROPIC_API_KEY : '') || '';
const keyStatus = () => ({ kma: !!getKey('kma'), openai: !!getKey('openai'), anthropic: !!getKey('anthropic'), hosted: !!getKey('hosted') });

module.exports = {
  dir, loadState: () => readJSON('data.json', null), saveState: (s) => writeJSON('data.json', s),
  getKey, setKey, keyStatus,
};
