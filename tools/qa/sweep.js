// Skan całego katalogu: buduje każdą pozycję (każdy typ, krój, długość, materiał, akcesorium, fryzurę, pozę, sylwetkę;
// obie płcie) i automatycznie sprawdza: wyjątki JS, NaN w geometrii, elementy poza postacią, brak warstwy ubrania,
// czas budowy. Opcjonalnie miniatury (full + back) do przeglądu wzrokowego.
// Użycie: node tools/qa/sweep.js <out-dir> [filtr-regexp] [--shots]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');

(async () => {
  const [outDir, filt, ...rest] = process.argv.slice(2);
  const shots = rest.includes('--shots') || filt === '--shots';
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  /* bez ekranu powitania i banera zgód (QA renderuje kreator) */
  await page.addInitScript(() => { try { localStorage.setItem('fitme.consent', JSON.stringify({ v: 1, prefs: false, at: new Date().toISOString() })); localStorage.setItem('fitme.welcomed', '1'); } catch (e) {} });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.hostname === 'cdn.jsdelivr.net') return route.fulfill({ path: path.join(ROOT, 'app/web/vendor', path.basename(u.pathname)), contentType: 'text/javascript' });
    if (u.hostname === 'fitme.local') { const p = path.join(ROOT, decodeURIComponent(u.pathname)); if (fs.existsSync(p)) return route.fulfill({ path: p }); return route.fulfill({ status: 404, body: '' }); }
    return route.abort();
  });
  await page.goto('http://fitme.local/fitme.html');
  await page.waitForFunction(() => typeof buildInto === 'function' && typeof INSPO !== 'undefined', null, { timeout: 60000 });
  const cases = await page.evaluate(() => {
    const C = [], add = (name, fn) => C.push([name, fn.toString()]);
    const keys = o => Object.keys(o).filter(k => k !== 'none');
    for (const g of ['m', 'f']) {
      const G = `s.gender='${g}';s.height=${g === 'f' ? 168 : 180};`;
      for (const t of keys(TOPS)) { const T = TOPS[t];
        for (const fit of Object.keys(TOP_FITS)) add(`${g}/top/${t}/${fit}`, `s=>{${G}s.top.type='${t}';s.top.fit='${fit}';}`);
        for (const sl of (T.sleeves || [])) add(`${g}/top/${t}/sleeve-${sl}`, `s=>{${G}s.top.type='${t}';s.top.sleeve='${sl}';}`);
        for (const nk of (T.necks || [])) add(`${g}/top/${t}/neck-${nk}`, `s=>{${G}s.top.type='${t}';s.top.neck='${nk}';}`);
        if (T.tuck) for (const tk of Object.keys(TUCKS)) add(`${g}/top/${t}/tuck-${tk}`, `s=>{${G}s.top.type='${t}';s.top.tuck='${tk}';}`);
      }
      for (const t of keys(OUTERS)) { const T = OUTERS[t];
        for (const fit of (T.fits || ['regular'])) for (const cl of Object.keys(CLOSES)) add(`${g}/outer/${t}/${fit}/${cl}`, `s=>{${G}s.outer.type='${t}';s.outer.fit='${fit}';s.outer.close='${cl}';}`);
        for (const m of (T.mats || [])) add(`${g}/outer/${t}/mat-${m}`, `s=>{${G}s.outer.type='${t}';s.outer.mat='${m}';}`);
      }
      for (const t of Object.keys(MID_ITEMS)) add(`${g}/mid/${t}`, `s=>{${G}s.mid.type='${t}';s.mid.src='${MID_ITEMS[t]}';s.outer.type='bomber';}`);
      for (const t of keys(BOTTOMS)) { const T = BOTTOMS[t];
        for (const fit of (T.fits || [])) add(`${g}/bottom/${t}/${fit}`, `s=>{${G}s.bottom.type='${t}';s.bottom.fit='${fit}';}`);
        for (const l of (T.lens || [])) add(`${g}/bottom/${t}/len-${l}`, `s=>{${G}s.bottom.type='${t}';s.bottom.length='${l}';}`);
        for (const r of Object.keys(RISES)) add(`${g}/bottom/${t}/rise-${r}`, `s=>{${G}s.bottom.type='${t}';s.bottom.rise='${r}';s.bottom.belt=true;s.top.tuck='in';}`);
        for (const m of (T.mats || [])) add(`${g}/bottom/${t}/mat-${m}`, `s=>{${G}s.bottom.type='${t}';s.bottom.mat='${m}';}`);
      }
      for (const t of keys(SHOES)) for (const so of Object.keys(SOCKS)) add(`${g}/shoes/${t}/socks-${so}`, `s=>{${G}s.shoes.type='${t}';s.shoes.socks='${so}';}`);
      const ACC = { cap: HATS, glasses: GLASSES, watch: WATCHES, bracelet: BRACELETS, ring: RINGS, chain: NECKLACES, earrings: EARRINGS, wallet: WALLETS, bag: BAGS, scarf: SCARVES, bandana: BANDANAS, headband: HEADBANDS, gloves: GLOVES, tie: TIES };
      for (const [k, tab] of Object.entries(ACC)) for (const t of keys(tab)) add(`${g}/acc/${k}/${t}`, `s=>{${G}s.acc.${k}.type='${t}';${k === 'tie' ? "s.top.type='shirt';" : ''}${k === 'wallet' ? "s.bottom.type='jeans';" : ''}}`);
      for (const h of keys(HAIR)) for (const tx of Object.keys(HAIR_TEX)) add(`${g}/hair/${h}/${tx}`, `s=>{${G}s.hair.style='${h}';s.hair.texture='${tx}';}`);
      for (const fr of keys(FRINGES)) add(`${g}/fringe/${fr}`, `s=>{${G}s.hair.style='bob';s.hair.fringe='${fr}';}`);
      for (const b of keys(BEARDS)) add(`${g}/beard/${b}`, `s=>{${G}s.hair.beard='${b}';}`);
      for (const p of Object.keys(POSES)) add(`${g}/pose/${p}`, `s=>{${G}s.pose='${p}';s.outer.type='overcoat';}`);
      for (const [b, B] of Object.entries(BODY_TYPES)) add(`${g}/body/${b}`, `s=>{${G}s.mus=${B.mus};s.fat=${B.fat};s.outer.type='trucker';s.bottom.type='chino';}`);
      for (const [k, [, lo, hi]] of Object.entries(FIG)) for (const v of [lo, hi]) add(`${g}/fig/${k}-${v}`, `s=>{${G}s.fig.${k}=${v};s.top.type='shirt';}`);
      for (const h of [150, 205]) add(`${g}/height-${h}`, `s=>{${G}s.height=${h};s.outer.type='puffer';}`);
      for (const sz of SIZES) add(`${g}/size-${sz}`, `s=>{${G}s.top.size='${sz}';s.outer.type='overcoat';s.outer.size='${sz}';}`);
      for (const p of keys(PATTERNS)) add(`${g}/pattern/${p}`, `s=>{${G}s.top.pattern='${p}';s.bottom.pattern='${p}';}`);
      for (const p of keys(PRINTS)) add(`${g}/print/${p}`, `s=>{${G}s.top.print='${p}';}`);
      for (const f of Object.keys(FINISHES)) add(`${g}/finish/${f}`, `s=>{${G}s.finish='${f}';}`);
      for (const u of keys(g === 'f' ? UNDER_F : UNDER_M)) for (const p of ['stand', 'walk']) add(`${g}/under/${u}/${p}`, `s=>{${G}s.under.bottom='${u}';s.top.type='none';s.bottom.type='none';s.pose='${p}';}`);
      if (g === 'f') for (const b of keys(BRAS)) for (const t of ['none', 'tee', 'cami', 'corset', 'tank']) add(`${g}/bra/${b}/${t}`, `s=>{${G}s.under.bra='${b}';s.top.type='${t}';}`);
      for (const sg of keys(SAGS)) for (const t of ['jeans', 'cargo', 'sweat', 'suit']) add(`${g}/sag/${sg}/${t}`, `s=>{${G}s.bottom.type='${t}';s.bottom.sag='${sg}';s.top.type='tank';s.bottom.belt=true;}`);
    }
    for (const f of INSPO) for (const p of Object.keys(POSES)) add(`inspo/${f.id}/${p}`, `s=>{Object.assign(s,clone(INSPO.find(x=>x.id==='${f.id}').state));s.pose='${p}';}`);
    return C;
  });
  const re = filt && filt !== '--shots' ? new RegExp(filt) : null;
  const todo = cases.filter(([n]) => !re || re.test(n));
  console.log('cases:', todo.length, 'of', cases.length);
  await page.evaluate(() => {
    const r = makeRenderer({ preserveDrawingBuffer: true }); r.setPixelRatio(1); const sc = new THREE.Scene(), g = new THREE.Group(); sc.add(g); setupScene(sc, r); applyOpts(sc, r, false);
    window.__R = { r, sc, g };
    window.__check = (name, src, shot) => {
      const { r, sc, g } = window.__R; let s = clone(DEFAULT); s.skin = 3; s.top.color = '#b9b4ac'; s.bottom.color = '#4a5f86'; s.outer.color = '#8a5a3a'; s.mid.color = '#5c7a5a'; const fn = eval('(' + src + ')'); const ret = fn(s); if (ret) s = ret; s = sanitize(s);
      const out = { name, issues: [] }; window.__layers = {};
      if (!window.__fin0) { window.__fin0 = finalize; finalize = function (G, W, free) { G.traverse(o => { if (o.isMesh && o.visible && o.userData.layer && o.userData.layer !== 'none') window.__layers[o.userData.layer] = (window.__layers[o.userData.layer] || 0) + 1; }); return window.__fin0(G, W, free); }; }
      const t0 = performance.now();
      try { buildInto(g, s, false); } catch (e) { out.issues.push('EXC ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]); }
      out.ms = Math.round(performance.now() - t0);
      const k = (s.height || 177) / 177; let meshes = 0, tris = 0;
      g.updateMatrixWorld(true);
      g.traverse(o => { if (!o.isMesh || !o.visible) return; meshes++; const p = o.geometry.attributes.position; if (!p) return; tris += (o.geometry.index ? o.geometry.index.count : p.count) / 3;
        const L = o.userData.layer;
        let nan = 0; for (let i = 0; i < p.array.length; i++) if (!isFinite(p.array[i])) { nan++; break; }
        if (nan) out.issues.push('NaN in mesh ' + (o.material && o.material.name || '') + ' layer=' + L);
        o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
        if (!nan && (bb.min.y < -0.08 * k || bb.max.y > 2.05 * k || Math.abs(bb.min.x) > 1.0 * k || Math.abs(bb.max.x) > 1.0 * k || Math.abs(bb.min.z) > 1.0 * k || Math.abs(bb.max.z) > 1.0 * k))
          out.issues.push('OUT-OF-BOUNDS layer=' + L + ' ctx=' + o.userData.ctx + ' bb=' + [bb.min.x, bb.min.y, bb.min.z, bb.max.x, bb.max.y, bb.max.z].map(v => v.toFixed(2)).join(','));
      });
      for (const L of ['top', 'mid', 'outer', 'bottom']) { const P = s[L]; if (P && P.type && P.type !== 'none' && !window.__layers[L] && !(L === 'mid' && P.src === 'none')) out.issues.push('MISSING layer ' + L + ' (' + P.type + ')'); }
      out.meshes = meshes; out.tris = Math.round(tris);
      if (shot) { r.setSize(200, 360, false); const cv = document.createElement('canvas'); cv.width = 400; cv.height = 360; const cx = cv.getContext('2d');
        [[0, 1.0, 5.4], [0, 1.0, -5.4]].forEach(([x, y, z], i) => { const cam = new THREE.PerspectiveCamera(26, 200 / 360, 0.05, 60); cam.position.set(x * k, y * k, z * k); cam.lookAt(0, 0.9 * k, 0); r.shadowMap.needsUpdate = true; r.render(sc, cam); cx.drawImage(r.domElement, i * 200, 0); });
        out.png = cv.toDataURL('image/png'); }
      return out;
    };
  });
  const rows = [];
  for (const [name, src] of todo) {
    const before = errs.length;
    let res;
    try { res = await page.evaluate(([n, s, sh]) => window.__check(n, s, sh), [name, src, shots]); }
    catch (e) { res = { name, issues: ['HARNESS ' + e.message.split('\n')[0]], ms: -1 }; }
    const e = errs.slice(before).filter(x => !/ERR_FAILED/.test(x));
    for (const x of e) res.issues.push('CONSOLE ' + x.slice(0, 200));
    if (res.ms > 6000) res.issues.push('SLOW ' + res.ms + 'ms');
    if (res.png) { const f = name.replace(/[^a-z0-9.-]+/gi, '_') + '.png'; fs.mkdirSync(path.join(outDir, 'img'), { recursive: true }); fs.writeFileSync(path.join(outDir, 'img', f), Buffer.from(res.png.split(',')[1], 'base64')); delete res.png; }
    rows.push(res); if (rows.length % 25 === 0) console.log('.. ' + rows.length + '/' + todo.length);
    if (res.issues.length) console.log('!!', name, res.issues.join(' | '));
  }
  fs.writeFileSync(path.join(outDir, 'sweep.json'), JSON.stringify(rows, null, 1));
  const bad = rows.filter(r => r.issues.length), ms = rows.map(r => r.ms).filter(x => x >= 0).sort((a, b) => a - b);
  console.log(`done: ${rows.length} cases, ${bad.length} with issues; build ms median ${ms[ms.length >> 1]} max ${ms[ms.length - 1]}`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
