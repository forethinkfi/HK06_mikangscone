// 내 컴퓨터(userData 폴더)에 메모와 설정을 저장한다. API 키는 OS 키체인 기반 safeStorage로 암호화한다.
const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');

const dir = () => app.getPath('userData');
const file = (n) => path.join(dir(), n);

function writeJSON(n, obj) {
  fs.mkdirSync(dir(), { recursive: true });
  const tmp = file(n + '.tmp');
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, file(n));
}

function readState(name) {
  try {
    const state = JSON.parse(fs.readFileSync(file(name), 'utf8'));
    if (!Array.isArray(state?.notes)) throw new SyntaxError('메모 목록이 없습니다.');
    return state;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
let primaryValid = false;
let writable = false;
function loadState() {
  writable = false;
  primaryValid = false;
  let damaged = false;
  let state;
  try { state = readState('data.json'); }
  catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    fs.copyFileSync(file('data.json'), file('data.damaged-' + require('crypto').randomUUID() + '.json'));
    damaged = true;
  }
  primaryValid = !!state;
  if (!state) {
    try { state = readState('data.bak.json'); }
    catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      fs.renameSync(file('data.bak.json'), file('backup.damaged-' + require('crypto').randomUUID() + '.json'));
      damaged = true;
    }
    if (state) state._recoveryNotice = '마지막 정상 백업에서 메모를 복구했어요.';
    else if (damaged) state = { notes: [], _recoveryNotice: '손상된 파일을 데이터 폴더에 보관했어요. 복구할 백업이 없어 빈 목록으로 열었어요.' };
  }
  writable = true;
  return state;
}
function saveState(state) {
  if (!writable || !Array.isArray(state?.notes)) throw new Error('메모 저장소를 확인해 주세요.');
  if (primaryValid) {
    fs.copyFileSync(file('data.json'), file('data.bak.tmp'));
    fs.renameSync(file('data.bak.tmp'), file('data.bak.json'));
  }
  writeJSON('data.json', state);
  if (!primaryValid && !fs.existsSync(file('data.bak.json'))) fs.copyFileSync(file('data.json'), file('data.bak.json'));
  primaryValid = true;
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
  dir, loadState, saveState,
  getKey, setKey, keyStatus,
};
