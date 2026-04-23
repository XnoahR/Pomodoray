const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  setAlwaysOnTop: (flag) => ipcRenderer.send('window-always-on-top', flag),

  // Notes file system API
  notes: {
    list: () => ipcRenderer.invoke('notes:list'),
    read: (filename) => ipcRenderer.invoke('notes:read', filename),
    write: (filename, content) => ipcRenderer.invoke('notes:write', filename, content),
    delete: (filename) => ipcRenderer.invoke('notes:delete', filename),
    rename: (oldFilename, newFilename) => ipcRenderer.invoke('notes:rename', oldFilename, newFilename),
    getDir: () => ipcRenderer.invoke('notes:getDir'),
  },
});
