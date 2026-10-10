'use strict';
/* Fitme – desktop shell. Runs the same creator as the web version, with the GPU unlocked
   and the high quality mode (denser body and garments, 4K shadows) switched on by default. */
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

/* forcing past Chromium's GPU blocklist helps on Windows; on Linux it makes the GPU process crash on drivers Chromium
   rejects for a reason (exit code 139 three times -> GPU switched off for good). FITME_GPU_FORCE=1 brings it back. */
if (process.platform !== 'linux' || process.env.FITME_GPU_FORCE === '1') {
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
}
app.commandLine.appendSwitch('force_high_performance_gpu');
/* Linux without a GPU render node (virtual machines such as Hyper-V / VirtualBox without 3D, no driver): the GPU process
   would crash or WebGL would be blocklisted (no mannequin at all). Go straight to SwiftShader (WebGL on the CPU) instead. */
const hasRenderNode = () => { try { return fs.readdirSync('/dev/dri').some(f => f.startsWith('renderD')); } catch (e) { return false; } };
if (process.platform === 'linux' && process.env.FITME_GPU_FORCE !== '1' && !hasRenderNode()) {
  app.commandLine.appendSwitch('use-gl', 'angle');
  app.commandLine.appendSwitch('use-angle', 'swiftshader');
  app.commandLine.appendSwitch('enable-unsafe-swiftshader');
  /* in the packaged app the GPU sandbox stops SwiftShader's Vulkan from starting (WebGL off); the app only loads its own files */
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  console.log('[Fitme] Brak GPU (/dev/dri/renderD*): renderowanie programowe SwiftShader.');
}
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
  /* after start: did the page get WebGL, on which renderer, in which quality (printed in the terminal) */
  win.webContents.once('did-finish-load', () => setTimeout(() => {
    win.webContents.executeJavaScript("JSON.stringify({webgl:typeof glOK!=='undefined'?glOK:null,renderer:typeof GL_INFO!=='undefined'?GL_INFO.name:null,software:typeof GL_INFO!=='undefined'?GL_INFO.soft:null,quality:typeof QUALITY!=='undefined'?QUALITY:null})")
      .then(r => console.log('[Fitme] WebGL: ' + r)).catch(e => console.log('[Fitme] WebGL: ? ' + e.message));
  }, 4000));
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
