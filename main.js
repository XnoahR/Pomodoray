const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Notes directory — stored in userData so it persists
const NOTES_DIR = path.join(app.getPath('userData'), 'notes');

function ensureNotesDir() {
  if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 780,
    minWidth: 500,
    minHeight: 700,
    frame: false,
    transparent: true,
    resizable: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  ensureNotesDir();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Window controls
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());
ipcMain.on('window-always-on-top', (_, flag) => mainWindow?.setAlwaysOnTop(flag));

// ─── Notes File System IPC ───

// List all .md files with metadata
ipcMain.handle('notes:list', async () => {
  ensureNotesDir();
  const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith('.md'));
  return files.map(filename => {
    const filepath = path.join(NOTES_DIR, filename);
    const stat = fs.statSync(filepath);
    return {
      filename,
      name: filename.replace(/\.md$/, ''),
      modifiedAt: stat.mtimeMs,
      size: stat.size,
    };
  }).sort((a, b) => b.modifiedAt - a.modifiedAt);
});

// Read a single .md file
ipcMain.handle('notes:read', async (_, filename) => {
  const filepath = path.join(NOTES_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  return fs.readFileSync(filepath, 'utf-8');
});

// Write/save a .md file
ipcMain.handle('notes:write', async (_, filename, content) => {
  ensureNotesDir();
  const filepath = path.join(NOTES_DIR, filename);
  fs.writeFileSync(filepath, content, 'utf-8');
  return true;
});

// Delete a .md file
ipcMain.handle('notes:delete', async (_, filename) => {
  const filepath = path.join(NOTES_DIR, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
  return true;
});

// Rename a .md file
ipcMain.handle('notes:rename', async (_, oldFilename, newFilename) => {
  const oldPath = path.join(NOTES_DIR, oldFilename);
  const newPath = path.join(NOTES_DIR, newFilename);
  if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
    fs.renameSync(oldPath, newPath);
    return true;
  }
  return false;
});

// Get notes directory path (for display)
ipcMain.handle('notes:getDir', async () => NOTES_DIR);
