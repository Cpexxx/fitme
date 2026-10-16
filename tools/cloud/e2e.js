'use strict';
/* Test całego scenariusza kont w przeglądarce na lokalnym stosie (tools/cloud/stack.js):
   powitanie i zgody, rejestracja z mailem, zapis i publikacja fitu, druga osoba: polubienie, komentarz, obserwowanie,
   powiadomienia, konto prywatne i prośba, profil, zgłoszenie, blokada, ustawienia, eksport, reset hasła, usunięcie konta.
   Użycie: node tools/cloud/e2e.js <katalog na zrzuty>   (stos musi działać) */
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const OUT = process.argv[2] || '/tmp/fitme-e2e'; fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:54321';
const getJSON = (u, m = 'GET') => new Promise((res, rej) => { const r = http.request(u, { method: m }, x => { let b = ''; x.on('data', d => b += d); x.on('end', () => res(JSON.parse(b || 'null'))); }); r.on('error', rej); r.end(); });
const stamp = Date.now().toString(36).slice(-4);
const fails = [], log = [];
let errs = [];
const expect = (c, m) => { if (!c) throw new Error(m); };

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  async function open(name, vp = { width: 1440, height: 900 }) {
    const ctx = await browser.newContext({ viewport: vp, acceptDownloads: true });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(name + ': ' + m.text()); });
    page.on('response', r => { if (r.status() >= 400) errs.push(name + ': HTTP ' + r.status() + ' ' + r.url().replace(BASE, '')); });
    page.on('pageerror', e => errs.push(name + ' pageerror: ' + e.message));
    page.on('dialog', d => d.accept());
    page.ctx = ctx; page.who = name; return page;
  }
  const ready = p => p.waitForFunction(() => typeof root !== 'undefined' && root && root.children.length > 0 && typeof Account !== 'undefined', null, { timeout: 90000 });
  const fc = (p, sel) => p.click(sel, { force: true, timeout: 30000 });
  const shot = (p, n) => p.screenshot({ path: path.join(OUT, n + '.png') });
  const wait = (p, fn, arg, t = 20000) => p.waitForFunction(fn, arg, { timeout: t });
  const toastHas = (p, re) => wait(p, r => new RegExp(r).test(document.querySelector('#toast').textContent), re.source);
  async function step(name, fn) { const e0 = errs.length; try { await fn(); log.push('✓ ' + name); } catch (e) { fails.push(name + ': ' + e.message.split('\n')[0]); log.push('✗ ' + name); } if (errs.length > e0) { fails.push(name + ' -> konsola: ' + errs.slice(e0).join(' | ').slice(0, 400)); } }
  async function mailLink(email, kind) {
    for (let i = 0; i < 40; i++) { const m = (await getJSON(BASE + '/__mail')).filter(x => x.to.includes(email)).pop(); if (m) { const l = m.links.find(u => u.includes('/verify') && (!kind || u.includes('type=' + kind))); if (l) return l; } await new Promise(r => setTimeout(r, 250)); }
    throw new Error('brak maila do ' + email);
  }
  async function signupUI(p, user, email, opts = {}) {
    await p.evaluate(() => Account.auth('signup'));
    await p.fill('#auEmail', email); await p.fill('#auPw', 'Haslo-Mocne-2026!'); await p.fill('#auUser', user);
    await wait(p, () => /wolna/.test(document.querySelector('.uname + .fhint, .fld .fhint.ok') ? document.querySelector('.fhint.ok')?.textContent || '' : ''), null).catch(() => {});
    if (opts.shot) await shot(p, opts.shot);
    await p.check('#auAge', { force: true }); await p.check('#auTos', { force: true });
    await fc(p, '#authBody form button[type=submit]');
    await wait(p, () => /Sprawdź skrzynkę/.test(document.querySelector('#authBody').textContent));
    if (opts.shot2) await shot(p, opts.shot2);
    const link = await mailLink(email, 'signup');
    await p.goto(link); await ready(p);
    await wait(p, u => Social.profile && Social.profile.username === u, user);
  }

  await getJSON(BASE + '/__mail', 'DELETE');
  const A = await open('A'), userA = 'ola.' + stamp, mailA = 'ola.' + stamp + '@fitme.test';
  const B = await open('B'), userB = 'kuba_' + stamp, mailB = 'kuba.' + stamp + '@fitme.test';

  await step('powitanie i baner zgód', async () => {
    await A.goto(BASE + '/fitme.html'); await ready(A); await A.waitForTimeout(1500);
    expect(await A.isVisible('#welcome'), 'brak ekranu powitania'); expect(await A.isVisible('#cookie'), 'brak banera');
    await shot(A, '01-powitanie');
    await fc(A, '#ckYes'); expect(!(await A.isVisible('#cookie')), 'baner nie znika');
    expect(await A.evaluate(() => prefsAllowed()), 'zgoda nie zapisana');
  });
  await step('dokumenty z ekranu powitania', async () => {
    await fc(A, '.wlinks [data-legal="privacy"]'); await wait(A, () => document.querySelector('#dlgLegal').open);
    expect(/Administrator danych/.test(await A.textContent('#legalBody')), 'brak treści polityki'); await shot(A, '02-polityka');
    await fc(A, '#legalTabs .chip:nth-child(3)'); expect(/fitme.auth/.test(await A.textContent('#legalBody')), 'brak tabeli cookies');
    await A.keyboard.press('Escape');
  });
  await step('rejestracja A (UI + mail)', async () => {
    await fc(A, '#wSignup'); expect(!(await A.isVisible('#welcome')), 'powitanie nie znika');
    await A.evaluate(() => document.querySelector('#dlgAuth').close());
    await signupUI(A, userA, mailA, { shot: '03-rejestracja', shot2: '04-sprawdz-skrzynke' });
    await A.waitForTimeout(800);
    expect(await A.isVisible('#hdrMe'), 'brak awatara w nagłówku'); expect(!(await A.isVisible('#welcome')), 'powitanie po zalogowaniu');
    await shot(A, '05-zalogowana');
  });
  await step('nazwa zajęta przy rejestracji', async () => {
    await B.goto(BASE + '/fitme.html'); await ready(B); await fc(B, '#ckNo'); await fc(B, '#wSignup');
    await B.fill('#auUser', userA); await wait(B, () => /zajęta/.test(document.querySelector('.fhint.bad')?.textContent || ''));
    await B.fill('#auUser', 'Admin'); await wait(B, () => document.querySelector('#auUser').value === 'admin' && /zajęta|zastrzeż/.test(document.querySelector('.fhint.bad')?.textContent || ''));
    await B.evaluate(() => document.querySelector('#dlgAuth').close());
  });
  await step('rejestracja B', async () => { await signupUI(B, userB, mailB); });

  await step('A: zapis publicznego fitu na koncie', async () => {
    await A.evaluate(() => { randomize(); }); await A.waitForTimeout(2500);
    await fc(A, '#btnSave'); await wait(A, () => document.querySelector('#dlgSave').open && document.querySelector('#saveDesc'));
    await A.fill('#saveName', 'Jesienny spacer'); await A.fill('#saveDesc', 'Ciepło, ale bez przesady.');
    await shot(A, '06-zapis-fitu');
    await fc(A, '#saveOk'); await toastHas(A, /Opublikowano/);
    const n = await A.evaluate(async () => (await Social.listFits({ owner: Social.uid })).length); expect(n === 1, 'fit nie zapisany: ' + n);
    await A.evaluate(() => { randomize(); }); await A.waitForTimeout(2000);
    await fc(A, '#btnSave'); await wait(A, () => document.querySelector('#saveDesc')); await A.fill('#saveName', 'Tylko dla mnie');
    await A.click('#saveCloud .chips:nth-of-type(2) .chip:nth-child(3)', { force: true }).catch(() => {});
    await A.evaluate(() => { const c = [...document.querySelectorAll('#saveCloud .chip')].find(x => x.textContent === 'Tylko ja'); c.click(); });
    await fc(A, '#saveOk'); await toastHas(A, /Zapisano na koncie/);
  });
  await step('B: Najnowsze, polubienie, szczegóły, komentarz, obserwowanie', async () => {
    await fc(B, '[data-page="explore"] >> visible=true'); await B.waitForTimeout(400);
    await B.evaluate(() => { [...document.querySelectorAll('#exTabs button')].find(b => b.textContent === 'Najnowsze').click(); });
    await wait(B, () => document.querySelectorAll('#exploreGrid .card').length >= 1);
    const names = await B.evaluate(() => [...document.querySelectorAll('#exploreGrid .card strong')].map(x => x.textContent));
    expect(names.includes('Jesienny spacer'), 'brak publicznego fitu'); expect(!names.includes('Tylko dla mnie'), 'widać prywatny fit!');
    await B.waitForTimeout(600); await shot(B, '07-najnowsze');
    await B.evaluate(() => { const c = [...document.querySelectorAll('#exploreGrid .card')].find(c => c.querySelector('strong').textContent === 'Jesienny spacer'); c.querySelector('.heart').click(); });
    await B.waitForTimeout(700);
    await B.evaluate(() => { const c = [...document.querySelectorAll('#exploreGrid .card')].find(c => c.querySelector('strong').textContent === 'Jesienny spacer'); c.querySelector('.open').click(); });
    await wait(B, () => document.querySelector('#dlgFit').open && document.querySelector('.fd-name'));
    await B.fill('.fd-form textarea', 'Świetne zestawienie kolorów!'); await fc(B, '.fd-form button[type=submit]');
    await wait(B, () => /Świetne zestawienie/.test(document.querySelector('.fd-com').textContent));
    await B.evaluate(() => { [...document.querySelectorAll('.fd-author .pill')].find(b => /Obserwuj/.test(b.textContent)).click(); });
    await wait(B, () => [...document.querySelectorAll('.fd-author .pill')].some(b => b.textContent === 'Obserwujesz'));
    expect(/#f\//.test(await B.evaluate(() => location.hash)), 'brak adresu fitu');
    await B.waitForTimeout(400); await shot(B, '08-szczegoly-fitu');
    await B.keyboard.press('Escape');
  });
  await step('A: powiadomienia', async () => {
    await A.evaluate(() => Account.pollUnread()); await wait(A, () => document.querySelector('#hdrBell .badge'));
    await fc(A, '#hdrBell'); await wait(A, () => document.querySelectorAll('.npop .nitem').length >= 3);
    const t = await A.textContent('.npop'); expect(/polubił/.test(t) && /skomentował/.test(t) && /obserwować/.test(t), 'brak powiadomień: ' + t.slice(0, 200));
    await A.waitForTimeout(400); await shot(A, '09-powiadomienia');
    await A.keyboard.press('Escape');
  });
  await step('A: konto prywatne, B: prośba, A: akceptacja', async () => {
    await A.evaluate(() => Account.showAccount('privacy')); await wait(A, () => document.querySelector('.asec h2')?.textContent === 'Prywatność');
    await A.evaluate(() => { const s = document.querySelector('.switch[aria-label="Konto prywatne"]'); s.click(); });
    await wait(A, () => Social.profile.is_private === true);
    await B.evaluate(u => Account.showProfile(u), userA); await wait(B, () => document.querySelector('.prof h1'));
    await B.evaluate(() => { [...document.querySelectorAll('.pacts .pill')].find(b => b.textContent === 'Obserwujesz').click(); });
    await wait(B, () => document.querySelector('#dlgAsk').open); await fc(B, '#askBody .pill.ink');
    await wait(B, () => document.querySelector('.lockbox'), null).catch(() => {});
    await B.evaluate(u => Account.showProfile(u), userA); await wait(B, () => document.querySelector('.lockbox'));
    await shot(B, '10-profil-prywatny');
    await B.evaluate(() => { [...document.querySelectorAll('.pacts .pill')].find(b => /Obserwuj/.test(b.textContent)).click(); });
    await wait(B, () => [...document.querySelectorAll('.pacts .pill')].some(b => b.textContent === 'Wysłano prośbę'));
    await A.evaluate(() => Account.showAccount('privacy')); await wait(A, () => [...document.querySelectorAll('.alist .pill.ink')].some(b => b.textContent === 'Zatwierdź'));
    await shot(A, '11-ustawienia-prywatnosc');
    await A.evaluate(() => [...document.querySelectorAll('.alist .pill.ink')].find(b => b.textContent === 'Zatwierdź').click()); await toastHas(A, /Zatwierdzono/);
    await B.evaluate(u => Account.showProfile(u), userA); await wait(B, () => document.querySelectorAll('#profWrap .card').length === 1);
  });
  await step('A: edycja profilu ze zdjęciem', async () => {
    await A.evaluate(() => Account.showAccount('profile')); await wait(A, () => document.querySelector('#avFile'));
    const png = Buffer.from((await A.evaluate(() => { const c = document.createElement('canvas'); c.width = 300; c.height = 200; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 300, 200); gr.addColorStop(0, '#c9a55e'); gr.addColorStop(1, '#5a3d8a'); g.fillStyle = gr; g.fillRect(0, 0, 300, 200); g.fillStyle = '#fff'; g.beginPath(); g.arc(150, 90, 45, 0, 7); g.fill(); return c.toDataURL('image/png'); })).split(',')[1], 'base64');
    await A.setInputFiles('#avFile', { name: 'a.png', mimeType: 'image/png', buffer: png });
    await wait(A, () => document.querySelector('.avedit .ava img'));
    await A.fill('.aform textarea', 'Kocham warstwy i ziemiste kolory.'); await A.fill('.aform input[type=url]', 'https://example.com/ola');
    await fc(A, '.aform button[type=submit]'); await toastHas(A, /Zapisano profil/);
    expect(await A.evaluate(() => /^data:image\/jpeg/.test(Social.profile.avatar)), 'awatar nie zapisany');
    await A.evaluate(() => Account.showProfile(Social.profile.username)); await wait(A, () => document.querySelectorAll('#profWrap .card').length === 2);
    await A.waitForTimeout(600); await shot(A, '12-moj-profil');
  });
  await step('B: zgłoszenie fitu', async () => {
    const id = await A.evaluate(async () => (await Social.listFits({ owner: Social.uid })).find(f => f.visibility === 'public').id);
    await B.evaluate(id => Account.report('fit', id, 'fit „Jesienny spacer”'), id); await wait(B, () => document.querySelector('#dlgReport').open);
    await fc(B, '#repBody input[value=spam]'); await B.check('#repBody .chk input', { force: true }); await shot(B, '13-zgloszenie');
    await fc(B, '#repBody button[type=submit]'); await toastHas(B, /Zgłoszenie zostało wysłane/);
  });
  await step('Zachowane: na koncie i polubione', async () => {
    await fc(B, '[data-page="mine"] >> visible=true'); await B.evaluate(() => { Account.mineView = 'liked'; renderMine(); });
    await wait(B, () => [...document.querySelectorAll('#mineGrid .card strong')].some(x => x.textContent === 'Jesienny spacer'));
    await B.evaluate(() => { Account.mineView = 'history'; renderMine(); });
  });
  await step('A: blokada B', async () => {
    await A.evaluate(u => Account.showProfile(u), userB); await wait(A, () => document.querySelector('.prof h1'));
    await A.evaluate(async u => { const p = await Social.profileBy('username', u); Account.block(p); }, userB); await wait(A, () => document.querySelector('#dlgAsk').open);
    await fc(A, '#askBody .pill.ink'); await toastHas(A, /Zablokowano/);
    const seen = await B.evaluate(async u => !!(await Social.profileBy('username', u)), userA); expect(!seen, 'zablokowany nadal widzi profil');
    await A.evaluate(async u => { const p = await Social.profileBy('username', u); await Social.unblock(p.id); }, userB);
  });
  await step('A: aktywność, dane, eksport', async () => {
    await A.evaluate(() => Account.showAccount('activity')); await wait(A, () => /Logowanie/.test(document.querySelector('.asec').textContent) && /Założenie konta/.test(document.querySelector('.asec').textContent));
    await A.waitForTimeout(300); await shot(A, '14-aktywnosc');
    await A.evaluate(() => Account.showAccount('data')); await wait(A, () => /Regulamin/.test(document.querySelector('.alist').textContent));
    const [dl] = await Promise.all([A.waitForEvent('download'), A.evaluate(() => [...document.querySelectorAll('.asec .pill')].find(b => b.textContent === 'Pobierz').click())]);
    const f = path.join(OUT, 'eksport.json'); await dl.saveAs(f); const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    expect(j.account.email === mailA && j.fits.length === 2 && j.consents.length === 3 && j.comments.length === 0, 'eksport niepełny');
    await shot(A, '15-twoje-dane');
  });
  await step('B: reset hasła mailem', async () => {
    await B.evaluate(() => Account.signOut()); await wait(B, () => !Social.user);
    await B.evaluate(() => Account.auth('login')); await fc(B, '#authBody .txtbtn'); await wait(B, () => /Nie pamiętasz hasła/.test(document.querySelector('#authTitle').textContent));
    await B.fill('#auEmail', mailB); await fc(B, '#authBody button[type=submit]'); await wait(B, () => /wysłaliśmy na nie link/.test(document.querySelector('#authBody').textContent));
    const link = await mailLink(mailB, 'recovery'); await B.goto(link); await ready(B);
    await wait(B, () => document.querySelector('#dlgAuth').open && /Ustaw nowe hasło/.test(document.querySelector('#authTitle').textContent));
    await shot(B, '16-nowe-haslo');
    await B.fill('#auPw', 'Nowe-Haslo-2026!'); await B.fill('#auPw2', 'Nowe-Haslo-2026!'); await fc(B, '#authBody button[type=submit]'); await toastHas(B, /Nowe hasło/);
    await B.evaluate(() => Account.signOut()); await wait(B, () => !Social.user);
    await B.evaluate(() => Account.auth('login')); await B.fill('#auEmail', mailB); await B.fill('#auPw', 'Haslo-Mocne-2026!'); await fc(B, '#authBody button[type=submit]');
    await wait(B, () => /Nieprawidłowy/.test(document.querySelector('#authBody .err').textContent)); await shot(B, '17-zle-haslo');
    errs = errs.filter(e => !/HTTP 400 \/auth\/v1\/token\?grant_type=password/.test(e));
    await B.fill('#auPw', 'Nowe-Haslo-2026!'); await fc(B, '#authBody button[type=submit]'); await wait(B, () => !!Social.user);
  });
  await step('B: usunięcie konta', async () => {
    await B.evaluate(() => Account.showAccount('data')); await wait(B, () => document.querySelector('.danger-zone'));
    await fc(B, '.danger-zone .pill'); await wait(B, () => document.querySelector('#dlgAsk').open);
    await B.fill('#askBody input[type=text]', userB); await B.fill('#delPw', 'Nowe-Haslo-2026!'); await shot(B, '18-usun-konto');
    await fc(B, '#askBody .pill.ink'); await toastHas(B, /Konto zostało usunięte/);
    const gone = await A.evaluate(async u => !(await Social.profileBy('username', u)), userB); expect(gone, 'profil nadal istnieje');
  });
  await step('telefon: powitanie, profil, szczegóły', async () => {
    const M = await open('M', { width: 390, height: 844 });
    await M.goto(BASE + '/fitme.html'); await ready(M); await M.waitForTimeout(1200); await shot(M, '19-telefon-powitanie');
    expect(await M.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'poziomy scroll na telefonie');
    await fc(M, '#ckNo'); await fc(M, '#wGuest');
    await M.evaluate(u => Account.showProfile(u), userA); await wait(M, () => document.querySelector('.prof h1')); await M.waitForTimeout(500); await shot(M, '20-telefon-profil-prywatny');
    await A.evaluate(() => Social.updateProfile({ is_private: false }));
    const id = await A.evaluate(async () => (await Social.listFits({ owner: Social.uid })).find(f => f.visibility === 'public').id);
    await M.evaluate(id => Account.openFit(id), id); await wait(M, () => document.querySelector('.fd-name')); await M.waitForTimeout(500); await shot(M, '21-telefon-fit');
    expect(/Zaloguj się, żeby komentować/.test(await M.textContent('#fitBody')), 'gość: brak informacji o logowaniu');
    await M.ctx.close();
  });
  await step('ustawienia zgód', async () => {
    await A.evaluate(() => Consent.settings()); await wait(A, () => document.querySelector('#dlgCookies').open); await shot(A, '22-zgody');
    await A.evaluate(() => { document.querySelector('#ckBody .switch:not([disabled])').click(); [...document.querySelectorAll('#ckBody .pill')].find(b => b.textContent === 'Zapisz wybór').click(); });
    expect(await A.evaluate(() => !prefsAllowed() && localStorage.getItem('fitme.theme') === null), 'wycofanie zgody nie usuwa preferencji');
  });

  await browser.close();
  console.log(log.join('\n'));
  console.log(fails.length ? '\n✗ ' + fails.length + ' problemów:\n' + fails.join('\n') : '\n✓ wszystko działa');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
