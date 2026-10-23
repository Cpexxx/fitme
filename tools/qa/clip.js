// Detektor przenikania i prześwitów: buduje stroje i szuka „technicznych” błędów, których nie widać w liczbach:
//  - prześwit: niższa warstwa (skóra, bielizna, spodnie, koszula...) widoczna wewnątrz wyższej, tuż przed nią
//    (przebija ją: skóra przez spodnie, koszula przez kurtkę, ciało przez but),
//  - przecięcie: dwa sztywne elementy (czapka, okulary, kolczyki, ciało...) przenikają się (ich powierzchnie mijają się
//    o mniej niż 2 mm na wielu pikselach).
// Metoda: bufor identyfikatorów z głębokością (każda warstwa osobnym kodem) z 8 kierunków, osobno pokrycie każdej
// warstwy; skupiska błędnych pikseli raportowane z miejscem na ciele, obrazki z zaznaczeniem do przeglądu.
// Użycie: node tools/qa/clip.js <out-dir> [zestaw] [--png]
//   zestaw: 'random:N[:seed]' (losowe stroje jak przycisk Losuj, obie płcie), 'bodies' (każda sylwetka × typowe stroje),
//           'acc' (czapki × okulary × fryzury), 'all' (wszystko), albo plik .js eksportujący listę stanów [{name,state}]
// Wynik: <out-dir>/clip.json, przy --png obrazki przypadków z błędami. Kod wyjścia 1, gdy są błędy.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');

(async () => {
  const [outDir, set = 'all', ...rest] = process.argv.slice(2);
  const png = rest.includes('--png') || set === '--png';
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await page.addInitScript(() => { try { localStorage.setItem('fitme.consent', JSON.stringify({ v: 1, prefs: false, at: new Date().toISOString() })); localStorage.setItem('fitme.welcomed', '1'); } catch (e) {} });
  const errs = [];
  if (process.env.QA_DEBUG) { page.on('console', m => console.log('  [page] ' + m.text())); await page.addInitScript(() => { window.QA_DEBUG = 1; }); }
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.hostname === 'cdn.jsdelivr.net') return route.fulfill({ path: path.join(ROOT, 'app/web/vendor', path.basename(u.pathname)), contentType: 'text/javascript' });
    if (u.hostname === 'fitme.local') { const p = path.join(ROOT, decodeURIComponent(u.pathname)); if (fs.existsSync(p)) return route.fulfill({ path: p }); return route.fulfill({ status: 404, body: '' }); }
    return route.abort();
  });
  await page.goto('http://fitme.local/fitme.html');
  await page.waitForFunction(() => typeof buildInto === 'function' && typeof INSPO !== 'undefined', null, { timeout: 60000 });
  await page.evaluate(installQA);

  /* ---------- cases ---------- */
  let cases = [];
  const sets = set === 'all' ? ['random:40', 'bodies', 'acc'] : [set];
  for (const s of sets) {
    if (s.startsWith('random')) { const [, n = '24', seed = '1'] = s.split(':'); cases.push(...await page.evaluate(([n, seed]) => qaRandomCases(+n, +seed), [n, seed])); }
    else if (s === 'bodies') cases.push(...await page.evaluate(() => qaBodyCases()));
    else if (s === 'acc') cases.push(...await page.evaluate(() => qaAccCases()));
    else if (s.endsWith('.js')) cases.push(...require(path.resolve(s)).map(c => ({ name: c.name, state: c.state })));
  }
  /* QA_ONLY=<regexp>: only the cases whose name matches (re-check one finding) */
  if (process.env.QA_ONLY) { const re = new RegExp(process.env.QA_ONLY); cases.splice(0, cases.length, ...cases.filter(c => re.test(c.name))); }
  console.log('cases:', cases.length);
  const report = [];let bad = 0;
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];let r;
    try { r = await page.evaluate(([st, want]) => qaScan(st, want), [c.state, png]); }
    catch (e) { r = { error: e.message.split('\n')[0], issues: [] }; }
    const issues = r.issues || [];if (r.error) issues.push({ kind: 'błąd', what: r.error });
    report.push({ name: c.name, issues, ms: r.ms, state: issues.length ? c.state : undefined });
    if (issues.length) {
      bad++;console.log('✗ ' + c.name + ': ' + issues.map(x => x.kind + ' ' + x.what + (x.px ? ' (' + x.px + ' px, ' + x.where + ')' : '')).join('; '));
      if (png && r.png) fs.writeFileSync(path.join(outDir, c.name.replace(/[^a-z0-9._-]+/gi, '_') + '.png'), Buffer.from(r.png.split(',')[1], 'base64'));
    } else if ((i + 1) % 10 === 0) console.log('.. ' + (i + 1) + '/' + cases.length);
  }
  fs.writeFileSync(path.join(outDir, 'clip.json'), JSON.stringify({ cases: report, pageErrors: errs }, null, 1));
  console.log('done: ' + cases.length + ' cases, ' + bad + ' with issues' + (errs.length ? '; page errors: ' + errs.length : ''));
  await browser.close();
  process.exit(bad ? 1 : 0);
})();

/* ===================== in the page ===================== */
function installQA() {
  /* tag what each accessory builder adds (they are global functions: wrap them) */
  const tagWrap = (fn, tag) => { const orig = window[fn]; if (typeof orig !== 'function') return; window[fn] = function (G, ...a) { const n = G.children.length; const r = orig.call(this, G, ...a); for (const o of G.children.slice(n)) o.traverse(q => { if (!q.userData.qa) q.userData.qa = tag; }); return r; }; };
  for (const [fn, tag] of [['buildHat', 'hat'], ['buildGlasses', 'glasses'], ['buildEarrings', 'earrings'], ['buildWatch', 'wrist'], ['buildBracelets', 'wrist'], ['buildRings', 'hand'], ['buildGloves', 'hand'], ['buildHeadband', 'headband'], ['buildBandana', 'neckacc'], ['buildNecklace', 'neckacc'], ['buildHair', 'hair']]) tagWrap(fn, tag);

  /* finalize, bucketed by material and tag (the real one merges by material only: the layers would mix) */
  /* finalize, bucketed by tag and body part (the real one merges by material only: the layers would mix). Every piece is
     split into its arm part (sleeves, the arms) and the rest: an arm resting against the side of a shirt is not skin
     through the shirt, skin through the sleeve is */
  window.qaFinalize = function (G, W) {
    G.updateMatrixWorld(true);const buckets = new Map(), Wr = BC.core.W, yNeck = BC.shY + 0.02;
    /* (a shoe's heel tab stands free behind the ankle: the leg in front of it is not a foot through the shoe; the band of
       skin carrying the leg into a closed shoe sits inside its collar by design) */
    G.traverse(o => { if (!o.isMesh || !o.visible || o.userData.tab || o.userData.innerAnkle) return; const src = o.geometry, g = prepGeo(src, o.matrixWorld); if (o.userData.ctx === 'cloth' && typeof conformGeo === 'function') conformGeo(g, src.userData.axis, o.userData.stiff || 0);
      const tag = qaTag(o), p = g.attributes.position, n = p.count, reg = src.userData.reg, aw = src.userData.armw, ax = src.userData.axis;
      const part = i => { const y = p.getY(i);
        if (tag === 'body') { if (y > yNeck && Math.abs(p.getX(i)) < 0.2) return 'head'; if (aw && aw[i] > 0.5 && y < Wr.y + 0.03) return 'hand'; }
        const arm = reg && reg.length === n ? (reg[i] === 1 || reg[i] === 2) : aw && aw.length === n ? aw[i] > 0.5 : ax === 'armL' || ax === 'armR';
        return arm ? tag + ':arm' : tag; };
      const ix = g.index.array, by = {};
      for (let t = 0; t < ix.length; t += 3) { const k = part(ix[t]); (by[k] || (by[k] = [])).push(ix[t], ix[t + 1], ix[t + 2]); }
      for (const [k, list] of Object.entries(by)) { const gg = g.clone(); gg.setIndex(list); let b = buckets.get(k); if (!b) buckets.set(k, b = []); b.push(gg); }
      g.dispose(); });
    const out = new THREE.Group();
    /* (where each source piece starts in the merged geometry: a crease is only looked for within one piece - a pocket lying
       on the trouser shell is not a fold of it) */
    for (const [tag, list] of buckets) { const starts = []; let o = 0; for (const gg of list) { starts.push(o); o += gg.attributes.position.count; }
      const g = mergeGeos(list); warpGeo(g, W); const m = new THREE.Mesh(g); m.userData.qa = tag; m.userData.pieces = starts; out.add(m); }
    return out;
  };
  window.qaTag = function (o) {
    const u = o.userData;
    if (u.qaBody) return u.qaBody;
    if (u.qa) return u.qa;
    if (u.isHair || u.ctx === 'hair') return 'hair';
    if (u.under) return 'under';
    if (u.scarf) return 'scarf';
    if (u.hood) return 'hood';
    let p = o; while (p) { if (p.userData && p.userData.bagGroup) return 'bag'; p = p.parent; }
    if (['bottom', 'top', 'mid', 'outer'].includes(u.layer)) return u.layer;
    return 'other';
  };
  /* layering order (lower number = worn under): a lower layer seen inside an upper one, just in front of it, pokes through */
  window.qaRanks = st => ({ body: 0, under: 1, bottom: 2, top: st.top.tuck === 'in' ? 1.5 : 3, mid: 4, outer: 5, shoes: 2.2 });
  const IDS = ['none', 'body', 'hand', 'head', 'under', 'bottom', 'top', 'mid', 'outer', 'shoes', 'hat', 'glasses', 'hair', 'scarf', 'hood', 'bag', 'earrings', 'wrist', 'headband', 'neckacc', 'other'];
  window.QA_IDS = IDS;

  const VS = 'varying float vz;varying vec3 vw;void main(){vec4 w=modelMatrix*vec4(position,1.0);vw=w.xyz;vec4 v=viewMatrix*w;vz=-v.z;gl_Position=projectionMatrix*v;}';
  const FS = 'uniform float id;varying float vz;varying vec3 vw;void main(){gl_FragColor=vec4(id,vz,vw.y,1.0);}';
  const matFor = id => new THREE.ShaderMaterial({ uniforms: { id: { value: id } }, vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide });

  window.qaBuild = function (st) {
    S = sanitize(st); S.pose = 'stand';
    setupBody(); LAYERS = []; PANTS = null;
    const G = new THREE.Group(), GS = new THREE.Group();
    runBuilders(G, GS);
    /* the body (the head and the hands are split off in qaFinalize: nothing covers them / they may be in front of a coat) */
    G.traverse(o => { if (o.isMesh && o.material === skinMat() && !o.userData.under) o.userData.qaBody = 'body'; });
    GS.traverse(o => { if (o.isMesh && o.material === skinMat()) o.userData.qaBody = 'body'; });
    buildShells(G, GS);
    const body = qaFinalize(G, WARP); body.position.y = LIFT;
    const feet = qaFinalize(GS, null); feet.traverse(o => { if (o.isMesh && !/^(body|hand|head)/.test(o.userData.qa)) o.userData.qa = 'shoes'; });
    const root = new THREE.Group(); root.add(body, feet); root.scale.set(BC.sxz, BC.sy, BC.sxz); root.updateMatrixWorld(true);
    return root;
  };

  let R = null, RT = null;
  const W0 = 300, H0 = 600;
  window.qaScan = function (st, wantPng) {
    const t0 = performance.now();
    const root = qaBuild(st);st = S;const ranks = qaRanks(st);
    if (!R) { R = new THREE.WebGLRenderer({ antialias: false }); R.setSize(W0, H0, false); RT = new THREE.WebGLRenderTarget(W0, H0, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }); }
    R.setClearColor(0x000000, 0);
    const scene = new THREE.Scene(); scene.add(root);
    const meshes = []; root.traverse(o => { if (o.isMesh) meshes.push(o); });
    const idOf = t => { const [b, p] = t.split(':'); return Math.max(1, IDS.indexOf(b)) + (p ? 100 : 0); }, tagOf = v => { v = Math.round(v); return v >= 100 ? IDS[v - 100] + ':arm' : IDS[v]; };
    const H = BC.sy * 1.0, cam = new THREE.PerspectiveCamera(24, W0 / H0, 0.3, 20);
    const views = []; for (let k = 0; k < 8; k++) views.push(k / 8 * Math.PI * 2);
    const buf = new Float32Array(W0 * H0 * 4), passFor = (want) => {
      for (const m of meshes) { const t = m.userData.qa; m.visible = want == null || want.has(t); m.material = matFor(idOf(t)); }
      R.setRenderTarget(RT); R.clear(); R.render(scene, cam); R.readRenderTargetPixels(RT, 0, 0, W0, H0, buf); R.setRenderTarget(null); return buf.slice();
    };
    const layerTags = ['under', 'bottom', 'top', 'mid', 'outer', 'shoes'].flatMap(t => [t, t + ':arm']).filter(t => meshes.some(m => m.userData.qa === t));
    const rigid = ['hat', 'glasses', 'earrings', 'head', 'headband'].filter(t => meshes.some(m => m.userData.qa === t));
    const issues = [], marks = [];
    const camY = 0.95 * H;
    for (const ang of views) {
      cam.position.set(Math.sin(ang) * 5.2, camY, Math.cos(ang) * 5.2); cam.lookAt(0, camY, 0); cam.updateMatrixWorld(true);
      const A = passFor(null);
      /* prześwit: lower layer visible inside an upper layer's coverage, just in front of it */
      const SH0 = (typeof SHOES !== 'undefined' && SHOES[st.shoes.type]) || {}, shoeOpen = !!(SH0.open || SH0.low || SH0.clog);
      for (const L of layerTags) {
        const C = passFor(new Set([L])), [LB, LP] = L.split(':'), rL = ranks[LB], viol = new Uint8Array(W0 * H0);
        /* (the same part only: arm against sleeve, trunk / legs against the rest) */
        const lowerOK = tt => { if (!tt) return false; const [t, p] = tt.split(':'); if (p !== LP) return false;
          /* (open shoes, sandals, loafers, clogs show the foot by design) */
          return LB === 'shoes' ? t === 'body' && !shoeOpen : (t in ranks && ranks[t] < rL && !(LB === 'top' && st.top.tuck === 'front' && t === 'bottom') && !(t === 'top' && st.top.tuck === 'front' && LB === 'bottom')); };
        let n = 0;
        for (let y = 2; y < H0 - 2; y++) for (let x = 2; x < W0 - 2; x++) {
          const i = y * W0 + x; if (C[i * 4] < 0.5) continue;
          /* inside the coverage (2 px from its edge: no silhouette noise) */
          if (C[(i - 2) * 4] < 0.5 || C[(i + 2) * 4] < 0.5 || C[(i - 2 * W0) * 4] < 0.5 || C[(i + 2 * W0) * 4] < 0.5) continue;
          const vis = tagOf(A[i * 4]); if (!lowerOK(vis)) continue;
          const d = C[i * 4 + 1] - A[i * 4 + 1]; if (d > 0.0004 && d < 0.04) { viol[i] = 1; n++; }
        }
        if (n >= 6) for (const cl of clusters(viol, W0, H0, A)) if (cl.px >= 6) { issues.push({ kind: 'prześwit', what: cl.tag + ' przez ' + L, px: cl.px, where: whereY(cl.y), view: Math.round(ang * 180 / Math.PI) }); marks.push({ ang, box: cl.box, col: '#ff2a2a' }); }
      }
      /* przecięcie: two rigid pieces whose surfaces cross (depth within 2 mm over a run of pixels) */
      for (let a = 0; a < rigid.length; a++) for (let b = a + 1; b < rigid.length; b++) {
        const P = rigid[a], Q = rigid[b]; if (P === 'head' && (Q === 'headband')) continue;
        const CP = passFor(new Set([P])), CQ = passFor(new Set([Q])), viol = new Uint8Array(W0 * H0); let n = 0;
        /* the two surfaces cross where the one in front changes between neighbouring pixels while they are close (< 5 mm);
           a long run of such pixels is a line where one cuts through the other (a brim through a frame) */
        const D = new Float32Array(W0 * H0).fill(NaN);
        for (let i = 0; i < W0 * H0; i++) { if (CP[i * 4] < 0.5 || CQ[i * 4] < 0.5) continue; const vis = tagOf(A[i * 4]); if (vis !== P && vis !== Q) continue; D[i] = CP[i * 4 + 1] - CQ[i * 4 + 1]; }
        for (let y = 1; y < H0 - 1; y++) for (let x = 1; x < W0 - 1; x++) { const i = y * W0 + x, d = D[i]; if (!(Math.abs(d) < 0.005)) continue;
          for (const j of [i + 1, i - 1, i + W0, i - W0]) { const e = D[j]; if (Math.abs(e) < 0.005 && e * d < 0) { viol[i] = 1; n++; break; } } }
        if (n >= 5) for (const cl of clusters(viol, W0, H0, A)) if (cl.px >= 5) { issues.push({ kind: 'przecięcie', what: P + ' × ' + Q, px: cl.px, where: whereY(cl.y), view: Math.round(ang * 180 / Math.PI) }); marks.push({ ang, box: cl.box, col: '#2a7bff' }); }
      }
    }
    /* załamanie: the skin is one smooth surface: a sharp crease in it (faces meeting at more than ~40 degrees over a run
       of edges: a hooked groove under the chin, a fold at the knee, a seam where two pieces meet) is a modelling error */
    /* (not the hands and arms, the armpit fold, the crotch, the cleft of the seat or the poles of the mesh at the nipples and
       the navel: those are folds for real) */
    for (const m of meshes) { const t = m.userData.qa, cloth = ['top', 'mid', 'outer', 'bottom'].includes(t); if (t !== 'body' && t !== 'head' && !cloth) continue;
      /* on clothes only folds back on themselves (spikes, torn flaps): hems, collars and pleats fold for real */
      const lim = cloth ? 135 : 60;
      const g = m.geometry, p = g.attributes.position, ix = g.index ? g.index.array : null; if (!ix) continue;
      const pcs = m.userData.pieces || [0], pc = i => { let lo = 0, hi = pcs.length - 1; while (lo < hi) { const md = (lo + hi + 1) >> 1; if (pcs[md] <= i) lo = md; else hi = md - 1; } return lo; };
      const key = i => pc(i) + ':' + Math.round(p.getX(i) * 2e4) + ',' + Math.round(p.getY(i) * 2e4) + ',' + Math.round(p.getZ(i) * 2e4), fn = [], edges = new Map(), v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
      for (let f = 0; f < ix.length / 3; f++) { for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(p, ix[f * 3 + k]); const n = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])); const area = n.length(); fn.push(area > 1e-12 ? n.divideScalar(area) : null);
        const ks = [key(ix[f * 3]), key(ix[f * 3 + 1]), key(ix[f * 3 + 2])]; for (let k = 0; k < 3; k++) { const a = ks[k], b = ks[(k + 1) % 3], e = a < b ? a + '|' + b : b + '|' + a; const L = edges.get(e); if (L) L.push(f); else edges.set(e, [f, ix[f * 3 + k]]); } }
      /* real folds of the body: the armpit, the crotch, the cleft of the seat, the poles of the mesh (nipples, navel) */
      const anat = vi => { const x = p.getX(vi), y = p.getY(vi), z = p.getZ(vi);
        /* (also the midline: the spine's groove, the cleft between strong pecs; and the toes of bare feet) */
        return Math.abs(x) < 0.015 || y < 0.14 || (Math.abs(x) > BC.shX * 0.75 && y > BC.shY - 0.16 && y < BC.shY + 0.07) || (Math.abs(x) < 0.03 && y > 0.85 && y < 1.05)
          || (BC.core.spots || []).some(sp => Math.hypot(x - sp[0], z - sp[2]) < sp[3] * 1.3 && Math.abs(y - sp[1]) < 0.06); };
      /* (clothes: not within two rings of a free edge - the turned hems, collars and lapels fold there by design) */
      let nearEdge = null; if (cloth) { const adj = new Map(), add = (a, b) => { let s = adj.get(a); if (!s) adj.set(a, s = new Set()); s.add(b); }; let ring = new Set();
        for (const [e, L] of edges) { const [a, b] = e.split('|'); add(a, b); add(b, a); if (L.length === 2) { ring.add(a); ring.add(b); } }
        nearEdge = new Set(ring); for (let k = 0; k < 2; k++) { const nx = new Set(); for (const a of ring) for (const b of adj.get(a) || []) if (!nearEdge.has(b)) { nearEdge.add(b); nx.add(b); } ring = nx; } }
      const bad = []; for (const [e, L] of edges) { if (L.length !== 3) continue; const [f0, vi, f1] = L; const a = fn[f0], b = fn[f1]; if (!a || !b) continue;
        /* (clothes: the fabric itself; details - pockets, loops, labels, rivets - are small closed shapes, their edges fold by design) */
        if (cloth) { const k = pc(vi); if ((pcs[k + 1] || p.count) - pcs[k] < 1500) continue; const [ka, kb] = e.split('|'); if (nearEdge.has(ka) || nearEdge.has(kb)) continue; }
        if (a.dot(b) < Math.cos(lim * Math.PI / 180) && (cloth || !anat(vi))) { bad.push(p.getY(vi) * BC.sy); if (window.QA_DEBUG) console.log('crease', t, pc(vi) + '/' + ((pcs[pc(vi) + 1] || p.count) - pcs[pc(vi)]), p.getX(vi).toFixed(3), p.getY(vi).toFixed(3), p.getZ(vi).toFixed(3)); } }
      if (bad.length >= 6) { const byZone = {}; for (const y of bad) { const w = whereY(y); byZone[w] = (byZone[w] || 0) + 1; } for (const [w, nE] of Object.entries(byZone)) if (nE >= 6) issues.push({ kind: 'załamanie', what: 'ostra krawędź na ' + t, px: nE, where: w }); } }
    /* one issue per (kind, what, place): the same spot seen from several sides is one problem */
    const seen = new Map(); for (const it of issues) { const k = it.kind + it.what + it.where; const e = seen.get(k); if (!e || it.px > e.px) seen.set(k, it); }
    const out = { issues: [...seen.values()], ms: Math.round(performance.now() - t0) };
    if (wantPng && out.issues.length) out.png = qaPicture(root, marks, cam, camY);
    root.traverse(o => { if (o.isMesh) { o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); } });
    return out;
  };
  function whereY(y) { const s = BC.sy; y /= s; return y > 1.5 ? 'głowa/szyja' : y > 1.25 ? 'klatka/barki' : y > 1.0 ? 'brzuch/talia' : y > 0.75 ? 'biodra/uda' : y > 0.4 ? 'kolana' : y > 0.12 ? 'łydki' : 'stopy'; }
  function clusters(viol, w, h, A) {const tagOf = v => { v = Math.round(v); return v >= 100 ? IDS[v - 100] + ':arm' : IDS[v]; };
    const lab = new Int32Array(w * h).fill(-1), out = [];
    for (let i = 0; i < w * h; i++) { if (!viol[i] || lab[i] >= 0) continue; const st = [i], c = { px: 0, ys: 0, box: [w, h, 0, 0], tags: {} }; lab[i] = out.length;
      while (st.length) { const j = st.pop(), x = j % w, y = (j / w) | 0; c.px++; c.ys += A[j * 4 + 2]; c.box = [Math.min(c.box[0], x), Math.min(c.box[1], y), Math.max(c.box[2], x), Math.max(c.box[3], y)]; const t = tagOf(A[j * 4]); c.tags[t] = (c.tags[t] || 0) + 1;
        for (const k of [j - 1, j + 1, j - w, j + w, j - w - 1, j - w + 1, j + w - 1, j + w + 1]) if (k >= 0 && k < w * h && viol[k] && lab[k] < 0) { lab[k] = lab[i]; st.push(k); } }
      c.y = c.ys / c.px; c.tag = Object.entries(c.tags).sort((a, b) => b[1] - a[1])[0][0]; out.push(c); }
    return out;
  }
  /* a shaded picture of every view that has a problem, the problem boxed */
  function qaPicture(root, marks, cam, camY) {
    const angs = [...new Set(marks.map(m => m.ang))].slice(0, 4), cv = document.createElement('canvas'); cv.width = W0 * angs.length; cv.height = H0; const ctx = cv.getContext('2d');
    const sc = new THREE.Scene(); sc.background = new THREE.Color(0x2b2b2b); sc.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.9)); const dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(2, 3, 2); sc.add(dl);
    const pal = { body: 0xd9b8a0, hand: 0xd9b8a0, head: 0xd9b8a0, under: 0xf0f0f0, bottom: 0x4a6a9a, top: 0xe8e2d0, mid: 0x7a8a5a, outer: 0x8a5a4a, shoes: 0x333333, hat: 0xc04080, glasses: 0x30c0c0, hair: 0x5a3a20, scarf: 0xb0a040, bag: 0x6a4a2a };
    root.traverse(o => { if (o.isMesh) { o.visible = true; o.material = new THREE.MeshLambertMaterial({ color: pal[o.userData.qa.split(':')[0]] || 0x888888, side: THREE.DoubleSide }); } });
    sc.add(root);
    angs.forEach((ang, k) => { cam.position.set(Math.sin(ang) * 5.2, camY, Math.cos(ang) * 5.2); cam.lookAt(0, camY, 0); R.setRenderTarget(null); R.render(sc, cam); ctx.drawImage(R.domElement, k * W0, 0, W0, H0);
      ctx.lineWidth = 2; for (const m of marks) if (m.ang === ang) { ctx.strokeStyle = m.col; const [x0, y0, x1, y1] = m.box; ctx.strokeRect(k * W0 + x0 - 4, H0 - y1 - 4, x1 - x0 + 8, y1 - y0 + 8); } });
    sc.remove(root);
    return cv.toDataURL('image/png');
  }

  /* ---------- case sets ---------- */
  window.qaRandomCases = function (n, seed) {
    const out = [];
    for (let i = 0; i < n; i++) { let x = (seed * 7919 + i * 104729) % 2147483647; const R0 = Math.random; Math.random = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
      try { S = sanitize(clone(DEFAULT)); S.gender = i % 2 ? 'f' : 'm'; if (S.gender === 'f') { S.height = 168; S.hair = clone(FEMALE_HAIR); S.under.bottom = 'brief'; S.under.bra = 'tshirt'; }
        const bt = Object.keys(BODY_TYPES)[i % Object.keys(BODY_TYPES).length]; S.mus = BODY_TYPES[bt].mus; S.fat = BODY_TYPES[bt].fat; randomize(); } finally { Math.random = R0; }
      out.push({ name: 'rnd-' + seed + '-' + i, state: clone(S) }); }
    return out;
  };
  window.qaBodyCases = function () {
    const out = [], outfits = { tee_jeans: s => { s.top.type = 'tee'; s.bottom.type = 'jeans'; }, flare_cord: s => { s.top.type = 'tee'; s.bottom.type = 'cord'; s.bottom.fit = 'flared'; },
      shirt_chino: s => { s.top.type = 'shirt'; s.top.tuck = 'in'; s.bottom.type = 'chino'; s.bottom.fit = 'slim'; }, coat: s => { s.top.type = 'turtle'; s.outer.type = 'overcoat'; s.bottom.type = 'suit'; },
      hoodie_cargo: s => { s.top.type = 'hoodie'; s.bottom.type = 'cargo'; s.bottom.fit = 'baggy'; }, nude: s => { s.top.type = 'none'; s.bottom.type = 'none'; },
      leggings: s => { s.top.type = 'tank'; s.bottom.type = 'leggings'; }, skirt: s => { s.top.type = 'blouse'; s.bottom.type = 'skirt'; } };
    for (const g of ['m', 'f']) for (const bt of Object.keys(BODY_TYPES)) for (const [k, f] of Object.entries(outfits)) {
      if (g === 'm' && (k === 'skirt' || k === 'leggings')) continue;
      const s = sanitize(clone(DEFAULT)); s.gender = g; if (g === 'f') { s.height = 168; s.under.bottom = 'brief'; s.under.bra = 'tshirt'; } s.mus = BODY_TYPES[bt].mus; s.fat = BODY_TYPES[bt].fat; s.outer.type = 'none'; s.hair.style = 'buzz'; f(s);
      out.push({ name: `body-${g}-${bt}-${k}`, state: sanitize(s) }); }
    return out;
  };
  window.qaAccCases = function () {
    const out = [];
    for (const g of ['m', 'f']) for (const cap of Object.keys(HATS)) for (const gl of ['none', ...Object.keys(GLASSES).filter(k => k !== 'none')]) {
      if (cap === 'none' && gl === 'none') continue;
      const s = sanitize(clone(DEFAULT)); s.gender = g; if (g === 'f') { s.height = 168; s.hair = clone(FEMALE_HAIR); } s.acc.cap.type = cap; s.acc.glasses.type = gl; s.acc.earrings.type = g === 'f' ? 'hoopL' : 'none';
      out.push({ name: `acc-${g}-${cap}-${gl}`, state: sanitize(s) }); }
    return out;
  };
}
