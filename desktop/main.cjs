const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('node:path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 380,
    backgroundColor: '#120d22',
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs') },
  })

  // Dev: load the Vite server. Packaged/local: load the built PWA from dist/.
  if (process.env.ELECTRON_START_URL) win.loadURL(process.env.ELECTRON_START_URL)
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  // Open external links in the user's browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
}

ipcMain.on('set-always-on-top', (event, on) => {
  BrowserWindow.fromWebContents(event.sender)?.setAlwaysOnTop(Boolean(on), 'floating')
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
