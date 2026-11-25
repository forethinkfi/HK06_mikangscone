// 렌더러(화면)에서 쓸 수 있는 기능만 골라서 열어준다.
const { contextBridge, ipcRenderer } = require('electron');

const on = (ch) => (fn) => { const h = (_e, ...a) => fn(...a); ipcRenderer.on(ch, h); return () => ipcRenderer.removeListener(ch, h); };

contextBridge.exposeInMainWorld('api', {
  loadState: () => ipcRenderer.invoke('state:load'),
  saveState: (s) => ipcRenderer.invoke('state:save', s),
  setInteractive: (b) => ipcRenderer.send('win:interactive', b),
  focus: () => ipcRenderer.send('win:focus'),
  release: () => ipcRenderer.send('win:release'),
  info: () => ipcRenderer.invoke('app:info'),
  openData: () => ipcRenderer.send('app:openData'),
  quit: () => ipcRenderer.send('app:quit'),
  applySettings: (s) => ipcRenderer.send('settings:apply', s),
  notify: (o) => ipcRenderer.send('notify', o),
  keyStatus: () => ipcRenderer.invoke('keys:status'),
  setKey: (name, value) => ipcRenderer.invoke('keys:set', name, value),
  testKey: (name) => ipcRenderer.invoke('keys:test', name),
  organize: (payload) => ipcRenderer.invoke('ai:organize', payload),
  saveAudio: (id, buf, ext) => ipcRenderer.invoke('audio:save', id, buf, ext),
  readAudio: (id) => ipcRenderer.invoke('audio:read', id),
  deleteAudio: (id) => ipcRenderer.invoke('audio:delete', id),
  transcribe: (id) => ipcRenderer.invoke('audio:transcribe', id),
  askMic: () => ipcRenderer.invoke('mic:ask'),
  onCursor: on('cursor'),
  onForeground: on('fg'),
  onDisplay: on('display'),
  onCommand: on('cmd'),
  onOpenNote: on('open-note'),
  onBlur: on('win-blur'),
});
