// Render QA: headless Chromium (SwiftShader WebGL) + Playwright, bez serwera i bez CDN.
// Użycie: node tools/qa/render.js <spec.js> <out-dir>
//   spec.js eksportuje: { W, H, shots: [{ name, state: s => {...mutacja...} | 'inspo:<id>', cams: ['full','side',...], post?: g => {...} }] }
//   post: wywoływane po zbudowaniu figury (np. ukrycie części meshy do diagnostyki)
// Każdy shot daje <out-dir>/<name>.png (kamery obok siebie) + raport błędów konsoli.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const VENDOR = { 'three.min.js': 'three.min.js', 'OrbitControls.js': 'OrbitControls.js', 'RoomEnvironment.js': 'RoomEnvironment.js' };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.css': 'text/css' };

(async () => {
  const [specPath, outDir] = process.argv.slice(2);
  const spec = require(path.resolve(specPath));
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  /* bez ekranu powitania i banera zgód (QA renderuje kreator) */
  await page.addInitScript(() => { try { localStorage.setItem('fitme.consent', JSON.stringify({ v: 1, prefs: false, at: new Date().toISOString() })); localStorage.setItem('fitme.welcomed', '1'); } catch (e) {} });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.hostname === 'cdn.jsdelivr.net') {
      const f = VENDOR[path.basename(u.pathname)];
      if (f) return route.fulfill({ path: path.join(ROOT, 'app/web/vendor', f), contentType: 'text/javascript' });
    }
    if (u.hostname === 'fitme.local') {
      const p = path.join(ROOT, decodeURIComponent(u.pathname));
      if (p.startsWith(ROOT) && fs.existsSync(p)) return route.fulfill({ path: p, contentType: MIME[path.extname(p)] || 'application/octet-stream' });
      return route.fulfill({ status: 404, body: '' });
    }
    return route.abort();
  });
  await page.goto('http://fitme.local/fitme.html');
  await page.waitForFunction(() => typeof buildInto === 'function' && typeof INSPO !== 'undefined', null, { timeout: 60000 });
  await page.evaluate(() => {
    const CAMS = { full: [0, 1.0, 5.4, 0.9], side: [5.4, 1.0, 0, 0.9], back: [0, 1.0, -5.4, 0.9], q: [3.6, 1.1, 3.9, 0.9],
      upper: [0, 1.4, 2.0, 1.32], upperq: [1.3, 1.45, 1.6, 1.32], uside: [2.0, 1.4, 0, 1.32], legs: [0.6, 0.55, 2.3, 0.5], head: [0.5, 1.65, 1.0, 1.58], feet: [0.7, 0.25, 1.3, 0.1] };
    window.__render = (state, cams, W, H, post) => {
      if (!window.__R) { const r = makeRenderer({ preserveDrawingBuffer: true }); r.setPixelRatio(1); const sc = new THREE.Scene(); const g = new THREE.Group(); sc.add(g); setupScene(sc, r); applyOpts(sc, r, false); window.__R = { r, sc, g }; }
      const { r, sc, g } = window.__R; r.setSize(W, H, false);
      const t0 = performance.now(); buildInto(g, state, false); const ms = performance.now() - t0;
      if (post) post(g);
      r.shadowMap.needsUpdate = true;
      const out = document.createElement('canvas'); out.width = W * cams.length; out.height = H; const cx = out.getContext('2d');
      const k = (state.height || 177) / 177;
      // Kamera: nazwa z CAMS albo własna tablica [x, y, z, tx, ty, tz, fov] (zbliżenia; współrzędne skalowane wzrostem).
      cams.forEach((c, i) => { const custom = Array.isArray(c); const [x, y, z, a, b, d] = custom ? c : CAMS[c]; const tx = custom ? a : 0, ty = custom ? b : a, tz = custom ? d : 0;
        const cam = new THREE.PerspectiveCamera(custom ? (c[6] || 20) : c === 'full' || c === 'side' || c === 'back' || c === 'q' ? 26 : 30, W / H, custom ? 0.02 : 0.05, 60);
        cam.position.set(x * k, y * k, z * k); cam.lookAt(tx * k, ty * k, tz * k); r.shadowMap.needsUpdate = true; r.render(sc, cam); cx.drawImage(r.domElement, i * W, 0); });
      return { url: out.toDataURL('image/png'), ms };
    };
    window.__state = (fn, inspo) => { let s = clone(inspo ? INSPO.find(f => f.id === inspo).state : DEFAULT); if (fn) { const r = fn(s); if (r) s = r; } return sanitize(s); };
  });
  const report = [];
  for (const sh of spec.shots) {
    const before = errs.length;
    const res = await page.evaluate(([fnSrc, inspo, cams, W, H, postSrc]) => {
      const fn = fnSrc ? eval('(' + fnSrc + ')') : null, post = postSrc ? eval('(' + postSrc + ')') : null;
      return window.__render(window.__state(fn, inspo), cams, W, H, post);
    }, [sh.state ? sh.state.toString() : null, sh.inspo || null, sh.cams || ['full', 'side', 'back'], spec.W || 360, spec.H || 640, sh.post ? sh.post.toString() : null]);
    fs.writeFileSync(path.join(outDir, sh.name + '.png'), Buffer.from(res.url.split(',')[1], 'base64'));
    const e = errs.slice(before);
    report.push(`${sh.name}: ${Math.round(res.ms)} ms${e.length ? '  ERR: ' + e.join(' | ') : ''}`);
    console.log(report[report.length - 1]);
  }
  fs.writeFileSync(path.join(outDir, 'report.txt'), report.join('\n') + '\n\nALL: ' + errs.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
