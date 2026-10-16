'use strict';
/* Fitme – desktop shell. Runs the same creator as the web version, with the GPU unlocked
   and the high quality mode (denser body and garments, 4K shadows) switched on by default. */
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const linux = process.platform === 'linux';
const hasRenderNode = () => { try { return fs.readdirSync('/dev/dri').some(f => f.startsWith('renderD')); } catch (e) { return false; } };
/* software mode (WebGL drawn by the CPU through SwiftShader):
   - Linux without a GPU render node (virtual machines such as Hyper-V / VirtualBox without 3D, no driver);
   - after the GPU process crashed (we relaunch with --fitme-soft, see below); FITME_SOFT=1 forces it */
const softWhy = !linux ? null : process.argv.includes('--fitme-soft') ? 'proces GPU się wywrócił przy poprzednim starcie'
  : process.env.FITME_SOFT === '1' ? 'FITME_SOFT=1' : (process.env.FITME_GPU_FORCE !== '1' && !hasRenderNode()) ? 'brak GPU (/dev/dri/renderD*)' : null;
/* forcing past Chromium's GPU blocklist helps on Windows; on Linux it crashed the GPU process (exit code 139). FITME_GPU_FORCE=1 brings it back */
if (!linux || process.env.FITME_GPU_FORCE === '1') {
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
}
if (process.platform === 'darwin') app.commandLine.appendSwitch('force_high_performance_gpu');
if (softWhy) {
  app.commandLine.appendSwitch('use-gl', 'angle');
  app.commandLine.appendSwitch('use-angle', 'swiftshader');
  /* in the packaged app the GPU sandbox stops SwiftShader's Vulkan from starting (WebGL off); the app only loads its own files */
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  console.log('[Fitme] Renderowanie programowe (SwiftShader): ' + softWhy + '.');
}
/* WebGL may fall back to SwiftShader if the GPU is lost while running (otherwise: no mannequin at all) */
if (linux) app.commandLine.appendSwitch('enable-unsafe-swiftshader');
/* Linux display backend: the system default (Wayland or X11). Forcing X11/XWayland gave an empty window or a crashing GPU
   process on two machines; FITME_OZONE=x11|wayland still picks one by hand */
if (linux && (process.env.FITME_OZONE === 'x11' || process.env.FITME_OZONE === 'wayland')) app.commandLine.appendSwitch('ozone-platform', process.env.FITME_OZONE);
/* the GPU process crashed (a driver Chromium cannot use): start again in software mode instead of showing an empty window */
let relaunching = false;
app.on('child-process-gone', (e, d) => {
  if (d.type !== 'GPU' || d.reason === 'clean-exit' || softWhy || relaunching || !linux) return;
  relaunching = true;
  console.log('[Fitme] Proces GPU się wywrócił (' + d.reason + ', kod ' + d.exitCode + ') - uruchamiam ponownie z renderowaniem programowym.');
  app.relaunch({ args: process.argv.slice(1).concat(['--fitme-soft']) });
  app.exit(0);
});
if (process.env.FITME_TEST_GPU_CRASH === '1') app.whenReady().then(() => setTimeout(() => { const w = new BrowserWindow({ show: false }); w.loadURL('chrome://gpucrash').catch(() => {}); }, 3000));

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
  /* software rendering can be slow to report the first frame: never leave only a taskbar icon */
  setTimeout(() => { if (!win.isDestroyed() && !win.isVisible()) win.show(); }, 4000);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:\/\/|mailto:)/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  /* linki do sklepów, dokumentów w sieci i adresy e-mail (mailto:) otwierają się w systemie, okno aplikacji zostaje */
  win.webContents.on('will-navigate', (e, url) => {
    if (/^(https?:\/\/|mailto:)/.test(url)) { e.preventDefault(); shell.openExternal(url); }
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
