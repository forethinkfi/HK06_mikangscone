// The only bridge between the page and the main process. No keys pass through here.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  setOpen: (open) => ipcRenderer.invoke('window:set-open', open),
  initialOpen: () => ipcRenderer.invoke('window:initial-open'),
  setPassthrough: (through) => ipcRenderer.send('window:passthrough', !!through),
  onRequestOpen: (cb) => {
    const h = () => cb();
    ipcRenderer.on('window:request-open', h);
    return () => ipcRenderer.removeListener('window:request-open', h);
  },
  // sticky-note windows
  openNote: (id) => ipcRenderer.invoke('note:open', id),
  closeNote: (forget) => ipcRenderer.invoke('note:close', !!forget),
  forgetNote: (id) => ipcRenderer.invoke('note:forget', id),
  resizeNote: (width, height) => ipcRenderer.send('note:resize', width, height),
  ensureNoteTall: () => ipcRenderer.invoke('note:ensure-tall'),
  noteBounds: () => ipcRenderer.invoke('note:bounds'),
  aiStatus: () => ipcRenderer.invoke('ai:status'),
  organize: (memo) => ipcRenderer.invoke('ai:organize', memo),
  syncAlarms: (list) => ipcRenderer.invoke('alarms:sync', list),
  testAlarm: () => ipcRenderer.invoke('alarms:test'),
});
