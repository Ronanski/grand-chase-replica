const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('gcDesktop', {
  setAlwaysOnTop: (on) => ipcRenderer.send('set-always-on-top', on),
})
