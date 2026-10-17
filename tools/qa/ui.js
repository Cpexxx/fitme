// Test interfejsu: klika funkcje aplikacji jak użytkownik i sprawdza wyniki + błędy konsoli.
// Użycie: node tools/qa/ui.js <out-dir>
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');

(async () => {
  const outDir = process.argv[2] || 'ui-out';
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 1480, height: 920 } });
  const page = await ctx.newPage();
  /* bez ekranu powitania i banera zgód (QA renderuje kreator) */
  await page.addInitScript(() => { try { localStorage.setItem('fitme.consent', JSON.stringify({ v: 1, prefs: false, at: new Date().toISOString() })); localStorage.setItem('fitme.welcomed', '1'); } catch (e) {} });
  const errs = [], fails = [], log = [];
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('dialog', d => d.accept());
  await page.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.hostname === 'cdn.jsdelivr.net') return route.fulfill({ path: path.join(ROOT, 'app/web/vendor', path.basename(u.pathname)), contentType: 'text/javascript' });
    if (u.hostname === 'fitme.local') { const p = path.join(ROOT, decodeURIComponent(u.pathname)); if (fs.existsSync(p)) return route.fulfill({ path: p }); return route.fulfill({ status: 404, body: '' }); }
    return route.abort();
  });
  const settle = async (ms = 400) => { await page.waitForTimeout(ms); await page.waitForFunction(() => !pending, null, { timeout: 60000 }).catch(() => {}); await page.waitForTimeout(150); };
  const step = async (name, fn) => { const e0 = errs.length; try { await fn(); } catch (e) { const at = ' (ui.js ' + (e.stack || '').split('\n').filter(l => l.includes('ui.js:')).map(l => l.replace(/.*ui\.js:(\d+).*/, '$1')).join('<') + ')'; fails.push(name + ': ' + e.message.split('\n')[0] + at); } const e = errs.slice(e0); if (e.length) fails.push(name + ' -> console: ' + e.join(' | ').slice(0, 300)); log.push((e.length ? 'ERR ' : 'ok  ') + name); };
  const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
  const shot = n => page.screenshot({ path: path.join(outDir, n + '.png') });
  const S = () => page.evaluate(() => JSON.parse(JSON.stringify(S)));
  /* without a GPU a frame takes ~1 s and Playwright's 'stable element' check times out: click without it */
  const fc = (sel, o) => page.click(sel, Object.assign({ force: true, timeout: 60000 }, o || {}));

  await page.goto('http://fitme.local/fitme.html');
  await page.waitForFunction(() => typeof buildInto === 'function' && root && root.children.length > 0, null, { timeout: 90000 });
  await settle(1500); await shot('00-start');

  await step('zakładki', async () => {
    for (const p of ['explore', 'mine', 'creator']) { await fc(`[data-page="${p}"] >> visible=true`); await settle(); expect(await page.evaluate(q => !document.querySelector('#pg-' + q).hidden, p), 'strona ' + p + ' niewidoczna'); }
  });
  await step('losuj x6', async () => {
    const seen = new Set();
    for (let i = 0; i < 6; i++) { await fc('#btnRandom'); await settle(); const s = await S(); seen.add(s.top.type + s.bottom.type); }
    expect(seen.size > 1, 'Losuj daje ciągle to samo');
    await shot('01-random');
  });
  await step('losuj nie zostawia starych akcesoriów', async () => {
    await page.evaluate(() => { S.acc.bandana.type = 'tri'; S.acc.gloves.type = 'knit'; S.acc.headband.type = 'full'; update(); }); await settle();
    let kept = 0; for (let i = 0; i < 5; i++) { await fc('#btnRandom'); await settle(200); const s = await S(); if (s.acc.bandana.type === 'tri' && s.acc.gloves.type === 'knit' && s.acc.headband.type === 'full') kept++; }
    expect(kept < 5, 'bandana/rękawiczki/chusta z poprzedniego stroju zostają po każdym losowaniu');
  });
  await step('wyczyść + cofnij', async () => {
    const before = await S(); await fc('#btnClear'); await settle();
    const s = await S(); expect(['top', 'bottom', 'outer', 'shoes'].every(k => s[k].type === 'none'), 'Wyczyść nie zdjął ubrań');
    await fc('#toast button'); await settle(); const s2 = await S(); expect(s2.top.type === before.top.type && s2.bottom.type === before.bottom.type, 'Cofnij nie przywrócił stroju');
  });
  await step('zapisz fit', async () => {
    const n0 = await page.evaluate(() => load(KEY).length);
    await fc('#btnSave'); await page.fill('#saveName', 'Test QA'); await fc('#saveOk'); await settle();
    const n1 = await page.evaluate(() => load(KEY).length); expect(n1 === n0 + 1, 'zapis nie dodał fitu');
    const thumb = await page.evaluate(() => load(KEY).slice(-1)[0].thumb || ''); expect(thumb.startsWith('data:image'), 'zapisany fit bez miniatury');
    expect((await page.textContent('.savedCount')).trim() === String(n1), 'licznik Zachowane nie zaktualizowany');
  });
  await step('zachowane: otwórz i usuń', async () => {
    await fc('[data-page="mine"] >> visible=true'); await settle();
    const cards = await page.$$('#mineGrid .card'); expect(cards.length >= 1, 'brak karty zapisanego fitu');
    const st0 = await S(); await fc('#mineGrid .card .cta .dark'); await settle();
    expect(await page.evaluate(() => page === 'creator'), 'Otwórz nie wrócił do kreatora');
    await fc('[data-page="mine"] >> visible=true'); await settle();
    const n0 = await page.evaluate(() => load(KEY).length); await fc('#mineGrid .card .cta button:not(.dark)'); await settle();
    expect(await page.evaluate(() => load(KEY).length) === n0 - 1, 'Usuń nie usunął fitu');
    await fc('[data-page="creator"] >> visible=true'); await settle();
  });
  await step('udostępnij: kod w obie strony', async () => {
    await page.evaluate(() => { S.acc.watch.type = 'diver'; S.hair.style = 'wolf'; S.pose = 'walk'; S.outer.type = 'overcoat'; S.outer.mat = ''; S.outer.fit = 'regular'; S.outer.size = 'XL'; S.outer.close = 'closed'; S.bottom.w = 32; update(); }); await settle();
    const before = await S(); await fc('#btnShare'); const code = await page.inputValue('#codeOut'); expect(code.startsWith('FIT3.'), 'kod nie zaczyna się od FIT3');
    await fc('#dlgShare [data-close]'); await fc('#btnRandom'); await settle();
    await fc('#btnShare'); await page.fill('#codeIn', code); await fc('#codeLoad'); await settle();
    const after = await S(); const diff = Object.keys(before).filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
    expect(!diff.length, 'stan po wczytaniu kodu różni się w: ' + diff.join(',') + ' ' + diff.map(k => JSON.stringify(before[k]).slice(0, 120) + ' vs ' + JSON.stringify(after[k]).slice(0, 120)).join(' ; '));
  });
  await step('udostępnij: zły kod', async () => {
    await fc('#btnShare'); await page.fill('#codeIn', 'FIT3.zzz'); await fc('#codeLoad'); await page.waitForTimeout(200);
    expect((await page.textContent('#codeErr')).length > 5, 'brak komunikatu o złym kodzie'); await fc('#dlgShare [data-close]');
    await fc('#btnShare'); await page.fill('#codeIn', '  '); await fc('#codeLoad'); await page.waitForTimeout(200);
    expect((await page.textContent('#codeErr')).length > 5, 'brak komunikatu dla pustego kodu'); await fc('#dlgShare [data-close]');
  });
  await step('kod z zewnątrz z błędnymi wartościami', async () => {
    const r = await page.evaluate(() => { const bad = { v: 5, gender: 'x', height: 9999, mus: 'abc', top: { type: 'zzz', color: 'red' }, bottom: { type: 'jeans', w: 999, fit: 'nope' }, acc: { watch: { type: 'diver', hand: 'X' }, bag: 5 }, fig: { chest: 99 } };
      const s = decode(encode(bad)); return { h: s.height, top: s.top.type, w: s.bottom.w, fit: s.bottom.fit, chest: s.fig.chest, hand: s.acc.watch.hand }; });
    expect(r.h === 205 && r.top === 'tee' && r.w === 'auto' && r.chest <= 1.25 && r.hand === 'L', 'sanitize przepuścił złe dane: ' + JSON.stringify(r));
  });
  await step('opcje: wszystkie przełączniki', async () => {
    await fc('#btnOpts'); await page.waitForTimeout(200);
    const sw = await page.$$('#optsBody input.switch'); for (const s of sw) { await s.click({ force: true }); await page.waitForTimeout(80); await s.click({ force: true }); await page.waitForTimeout(80); }
    const ch = await page.$$('#optsBody .chip'); let n = 0;
    for (let i = 0; i < ch.length; i++) { const all = await page.$$('#optsBody .chip'); const t = await all[i].textContent(); if (/Wydajność|Standard|Wysoka/.test(t)) continue; await all[i].click({ force: true }); n++; await page.waitForTimeout(80); }
    await fc('#optsReset'); await page.waitForTimeout(200); await page.keyboard.press('Escape');
    expect(sw.length >= 4 && n >= 5, 'za mało kontrolek w opcjach ' + sw.length + '/' + n);
  });
  await step('tła i widoki', async () => {
    for (const b of await page.$$('#backdrops button')) { await b.click({ force: true }); await page.waitForTimeout(60); }
    for (const b of await page.$$('#views [data-focus]')) { await b.click({ force: true }); await page.waitForTimeout(450); }
    await fc('#btnSpin'); await page.waitForTimeout(500); await fc('#btnSpin');
  });
  await step('motyw ciemny/jasny', async () => {
    await page.evaluate(() => setTheme('dark')); await page.waitForTimeout(200); await shot('02-dark'); await page.evaluate(() => setTheme('light'));
  });
  await step('lewy panel: każdy slot i każdy dział katalogu', async () => {
    for (const d of await page.$$eval('#accL .dept button', bs => bs.map(b => b.textContent))) {
      await fc(`#accL .dept button:has-text("${d}")`); await page.waitForTimeout(150);
      const heads = await page.$$('#accL .acc .acc-head'); for (let i = 5; i < heads.length; i++) { const h = (await page.$$('#accL .acc .acc-head'))[i]; await h.click({ force: true }); await page.waitForTimeout(80);
        const chips = await page.$$('#accL .acc.open .chip'); if (chips.length) { await chips[chips.length - 1].click({ force: true }); await settle(300); } }
    }
    for (let i = 0; i < 5; i++) { const h = (await page.$$('#accL .acc .acc-head'))[i]; await h.click({ force: true }); await page.waitForTimeout(100); const subs = await page.$$('#accL .acc.open .sub-head'); for (const s of subs.slice(0, 6)) { await s.click({ force: true }); await page.waitForTimeout(40); } }
    await shot('03-left');
  });
  await step('prawy panel: akcesoria, każda grupa i każdy typ', async () => {
    await fc('[data-rtab="acc"]'); await page.waitForTimeout(100);
    const groups = await page.$$eval('#accR .dept button', bs => bs.map(b => b.textContent));
    for (const g of groups) { await fc(`#accR .dept button:has-text("${g}")`); await page.waitForTimeout(80); }
    await fc('#accR .dept button:has-text("Wszystkie")');
    const n = (await page.$$('#accR .acc')).length;
    for (let i = 0; i < n; i++) { const h = (await page.$$('#accR .acc .acc-head'))[i]; await h.click({ force: true }); await page.waitForTimeout(80);
      const sh = await page.$('#accR .acc.open .sub-head'); if (sh) { await sh.click({ force: true }); await page.waitForTimeout(60); }
      const chips = await page.$$('#accR .acc.open .sub.open .chip'); if (chips.length > 1) { await chips[1].click({ force: true }); await settle(300); } }
    await shot('04-acc');
  });
  await step('prawy panel: manekin (poza, sylwetka, płeć, skóra, fryzura)', async () => {
    await fc('[data-rtab="body"]'); await page.waitForTimeout(150);
    const heads = await page.$$('#accR .acc .acc-head'); expect(heads.length >= 4, 'brak sekcji manekina');
    /* the panel is drawn again after a click: open a section only when it is closed, look its chips up again every time
       (forced clicks on stale handles landed on other headers and toggled them) */
    const openAcc = async name => { if (!(await page.$(`#accR .acc.open .acc-head:has-text("${name}")`))) await page.click(`#accR .acc-head:has-text("${name}")`); await page.waitForSelector(`#accR .acc.open .acc-head:has-text("${name}")`); await page.waitForTimeout(350); };
    await openAcc('Poza'); const np = (await page.$$('#accR .acc.open .chip')).length;
    for (let i = 0; i < np; i++) { await openAcc('Poza'); await (await page.$$('#accR .acc.open .chip'))[i].click({ force: true }); await settle(300); }
    await openAcc('Sylwetka');
    const nb = (await page.$$('#accR .acc.open .chips[aria-label="Typ sylwetki"] .chip')).length;
    for (let i = 0; i < nb; i++) { await openAcc('Sylwetka'); await (await page.$$('#accR .acc.open .chips[aria-label="Typ sylwetki"] .chip'))[i].click({ force: true }); await settle(300); }
    await openAcc('Sylwetka');
    /* the 'Wersja' sub keeps its open state between runs: open it only when closed (toggling closed it picked another sub's chip) */
    if (!(await page.$('#accR .acc.open .sub.open .chips[aria-label="Wersja"]'))) { const sh = await page.$('#accR .sub:has(.chips[aria-label="Wersja"]) .sub-head'); if (sh) { await sh.click(); await page.waitForSelector('#accR .acc.open .sub.open .chips[aria-label="Wersja"]'); } }
    /* (a forced click while the sub is still unfolding lands on nothing: a plain click waits until the chip is visible and still) */
    const g = await page.$$('#accR .acc.open .sub.open .chips[aria-label="Wersja"] .chip'); if (g.length) { await g[g.length - 1].click(); await settle(600); }
    const s = await S(); expect(s.gender === 'f' && s.height === 168, 'zmiana na kobietę nie ustawiła wzrostu 168 (jest ' + s.gender + ' ' + s.height + ')');
    await shot('05-body');
  });
  await step('społeczność: szukaj, filtry, polub, weź element', async () => {
    await fc('[data-page="explore"] >> visible=true'); await settle();
    const n0 = (await page.$$('#exploreGrid .card')).length; expect(n0 === 18, 'kart w Społeczności: ' + n0);
    /* (the search is debounced and the thumbnails render on the main thread: wait for the result, not a fixed time) */
    const nCards = () => page.evaluate(() => document.querySelectorAll('#exploreGrid .card').length);
    await page.fill('#q', 'trencz'); await page.waitForFunction(n => document.querySelectorAll('#exploreGrid .card').length < n, n0, { timeout: 30000 }).catch(() => {});
    const n1 = await nCards(); expect(n1 >= 1 && n1 < n0, 'wyszukiwanie "trencz" daje ' + n1);
    await page.fill('#q', 'qqqqqq'); await page.waitForSelector('#exploreGrid .empty', { timeout: 30000 }).catch(() => {}); expect(await page.$('#exploreGrid .empty'), 'brak komunikatu "nic nie pasuje"');
    await page.fill('#q', ''); await page.waitForFunction(n => document.querySelectorAll('#exploreGrid .card').length === n, n0, { timeout: 30000 }).catch(() => {});
    /* the filter rows are drawn again after every click: locators find the chip again each time */
    for (let i = 1; i < 5; i++) { await page.locator('#fStyle .chip').nth(i).click({ force: true }); await page.waitForTimeout(150); }
    await page.locator('#fStyle .chip').first().click({ force: true });
    const ns = await page.locator('#fSeason .chip').count(); for (let i = 0; i < ns; i++) { await page.locator('#fSeason .chip').nth(i).click({ force: true }); await page.waitForTimeout(150); }
    await page.locator('#fSeason .chip').first().click({ force: true }); await page.waitForTimeout(200);
    await fc('#exploreGrid .card .heart'); await page.waitForTimeout(150); expect(await page.evaluate(() => load(LIKES).length) === 1, 'polubienie nie zapisane');
    await fc('#exploreGrid .card .cta button:not(.dark)'); await page.waitForTimeout(100);
    const tk = page.locator('#exploreGrid .card .take.on button'); expect(await tk.count() > 0, 'brak przycisków "Weź element"'); await tk.first().click({ force: true }); await settle();
    expect(await page.evaluate(() => page === 'creator'), '"Weź element" nie przeszedł do kreatora');
    await fc('[data-page="mine"] >> visible=true'); await settle(); await fc('#mineTabs button:has-text("Polubione")'); await settle(); expect((await page.$$('#mineGrid .card')).length === 1, 'polubiony fit nie widać w Zachowane');
    await page.waitForTimeout(3000); await shot('06-liked');
  });
  await step('miniatury w Społeczności generują się', async () => {
    await fc('[data-page="explore"] >> visible=true'); /* (the previous step may leave a search / filter on: wait for every visible card, not a fixed 18) */
    await page.waitForFunction(() => document.querySelectorAll('#exploreGrid .card').length > 0 && !document.querySelector('#exploreGrid .ph'), null, { timeout: 240000 });
    expect(!(await page.$('#exploreGrid .ph')), 'zostały karty bez miniatury'); await shot('07-explore');
  });
  await step('menu (hamburger)', async () => {
    await fc('#burger'); await page.waitForTimeout(300); expect(await page.evaluate(() => !document.querySelector('#menu').hidden), 'menu się nie otworzyło');
    await page.keyboard.press('Escape'); await page.waitForTimeout(400); expect(await page.evaluate(() => document.querySelector('#menu').hidden), 'Escape nie zamknął menu');
    await fc('#burger'); await page.waitForTimeout(300); await fc('#mRandom'); await settle(); expect(await page.evaluate(() => page === 'creator'), 'Losuj z menu nie wrócił do kreatora');
  });
  await step('przeładowanie zachowuje dane', async () => {
    const likes = await page.evaluate(() => load(LIKES).length); await page.reload();
    await page.waitForFunction(() => typeof buildInto === 'function' && root && root.children.length > 0, null, { timeout: 90000 }); await settle(800);
    expect(await page.evaluate(() => load(LIKES).length) === likes, 'polubienia zniknęły po przeładowaniu');
  });
  await step('mały ekran (telefon)', async () => {
    await page.setViewportSize({ width: 390, height: 844 }); await settle(800); await shot('08-mobile');
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); expect(ov <= 2, 'poziomy scroll na telefonie: ' + ov + 'px');
    await page.setViewportSize({ width: 1480, height: 920 }); await settle();
  });
  fs.writeFileSync(path.join(outDir, 'ui-report.txt'), log.join('\n') + '\n\nFAILS:\n' + fails.join('\n'));
  console.log(log.join('\n')); console.log('\nFAILS (' + fails.length + '):\n' + fails.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
