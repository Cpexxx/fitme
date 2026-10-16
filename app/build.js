'use strict';
/* Copies the creator into app/web for the desktop build:
   - three.js, supabase-js and the fonts are bundled locally from vendor/ (works offline, no third-party CDN),
   - the page is flagged as the desktop app (high quality by default),
   - dev-only helpers are left out. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(__dirname, 'web');
const VENDOR = path.join(WEB, 'vendor');
/* three.js, supabase-js i czcionki leżą w repo (vendor/): strona i aplikacja nie pobierają niczego z CDN */
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const a = path.join(src, f), b = path.join(dst, f);
    if (fs.statSync(a).isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
  }
}

(async () => {
  fs.mkdirSync(path.join(WEB, 'js'), { recursive: true });
  copyDir(path.join(ROOT, 'vendor'), VENDOR);
  for (const f of fs.readdirSync(path.join(ROOT, 'js'))) {
    if (f.endsWith('.js')) fs.copyFileSync(path.join(ROOT, 'js', f), path.join(WEB, 'js', f));
  }
  let html = fs.readFileSync(path.join(ROOT, 'fitme.html'), 'utf8');
  html = html.replace('<head>', '<head>\n<script>window.FITME_APP=true;</script>');
  fs.writeFileSync(path.join(WEB, 'fitme.html'), html);
  fs.copyFileSync(path.join(ROOT, 'legal.html'), path.join(WEB, 'legal.html'));
  console.log('web gotowe:', WEB);
})().catch(e => { console.error(e); process.exit(1); });
