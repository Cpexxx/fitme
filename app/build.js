'use strict';
/* Copies the creator into app/web for the desktop build:
   - three.js is bundled locally (works offline),
   - the page is flagged as the desktop app (high quality by default),
   - dev-only helpers are left out. */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(__dirname, 'web');
const VENDOR = path.join(WEB, 'vendor');
const CDN = 'https://cdn.jsdelivr.net/npm/three@0.147.0/';
const LIBS = [
  ['build/three.min.js', 'three.min.js'],
  ['examples/js/controls/OrbitControls.js', 'OrbitControls.js'],
  ['examples/js/environments/RoomEnvironment.js', 'RoomEnvironment.js']
];

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return resolve(get(res.headers.location));
      if (res.statusCode !== 200) return reject(new Error(url + ' -> HTTP ' + res.statusCode));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

(async () => {
  fs.mkdirSync(path.join(WEB, 'js'), { recursive: true });
  fs.mkdirSync(VENDOR, { recursive: true });
  for (const [src, name] of LIBS) {
    const dst = path.join(VENDOR, name);
    if (!fs.existsSync(dst)) { fs.writeFileSync(dst, await get(CDN + src)); console.log('pobrano', name); }
  }
  for (const f of fs.readdirSync(path.join(ROOT, 'js'))) {
    if (f.endsWith('.js')) fs.copyFileSync(path.join(ROOT, 'js', f), path.join(WEB, 'js', f));
  }
  let html = fs.readFileSync(path.join(ROOT, 'fitme.html'), 'utf8');
  for (const [src, name] of LIBS) html = html.split(CDN + src).join('vendor/' + name);
  html = html.replace('<head>', '<head>\n<script>window.FITME_APP=true;</script>');
  fs.writeFileSync(path.join(WEB, 'fitme.html'), html);
  console.log('web gotowe:', WEB);
})().catch(e => { console.error(e); process.exit(1); });
