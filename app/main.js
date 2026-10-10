'use strict';
/* Fitme – desktop shell. Runs the same creator as the web version, with the GPU unlocked
   and the high quality mode (denser body and garments, 4K shadows) switched on by default. */
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('force_high_performance_gpu');
/* Linux + Wayland: Chromium's Wayland backend often cannot reach the GPU (no DRM render node -> CPU rendering, a few FPS).
   XWayland (X11) uses the normal GL driver. FITME_OZONE=wayland keeps the native backend. */
if (process.platform === 'linux' && (process.env.WAYLAND_DISPLAY || process.env.XDG_SESSION_TYPE === 'wayland') && process.env.FITME_OZONE !== 'wayland') {
  app.commandLine.appendSwitch('ozone-platform', 'x11');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#F3EBDD',
    title: 'Fitme',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });
  win.once('ready-to-show', () => win.show());
  /* shop links and other external pages open in the system browser */
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (/^https?:\/\//.test(url)) { e.preventDefault(); shell.openExternal(url); }
  });
  win.loadFile(path.join(__dirname, 'web', 'fitme.html'));
}

Menu.setApplicationMenu(null);
app.whenReady().then(() => {
  createWindow();
  /* what the GPU process ended up using: printed in the terminal, useful when the creator stutters */
  app.getGPUInfo('basic').then(info => {
    const st = app.getGPUFeatureStatus(), dev = (info.gpuDevice || []).map(d => d.vendorId.toString(16) + ':' + d.deviceId.toString(16) + (d.active ? '*' : '')).join(' ');
    console.log('[Fitme] GPU: webgl=' + st.webgl + ' webgl2=' + st.webgl2 + ' raster=' + st.gpu_compositing + ' devices=' + (dev || 'none') + ' gl=' + (info.auxAttributes && info.auxAttributes.glRenderer || '?'));
  }).catch(() => {});
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
