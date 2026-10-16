'use strict';
/* Testy schematu supabase/schema.sql na lokalnym stosie (tools/cloud/stack.js): rejestracja z potwierdzeniem e-mail,
   Row Level Security, liczniki, powiadomienia, konta prywatne, blokowanie, zgłoszenia, historia, usuwanie konta.
   Użycie: NODE_PATH=<katalog z node_modules/@supabase/supabase-js> node tools/cloud/test-db.js */
const { createClient } = require('@supabase/supabase-js');
const http = require('http');
const KEYS = require(process.env.FITME_KEYS || '/var/tmp/fitme-stack/keys.json');
const URL = KEYS.url, ANON = KEYS.anon;
const mk = () => createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const getJSON = (u, m = 'GET') => new Promise((res, rej) => { const r = http.request(u, { method: m }, x => { let b = ''; x.on('data', d => b += d); x.on('end', () => res(JSON.parse(b || 'null'))); }); r.on('error', rej); r.end(); });
const visit = u => new Promise((res, rej) => http.get(u, x => { x.resume(); res({ status: x.statusCode, location: x.headers.location || '' }); }).on('error', rej));
let fails = 0, passes = 0;
function ok(cond, name, extra) { if (cond) passes++; else { fails++; console.log('  ✗ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra).slice(0, 300) : '')); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const stamp = Date.now().toString(36).slice(-5);
const PW = 'Haslo-test-123';
const STATE = { gender: 'm', top: { type: 'tee' } };

async function signup(name, extra = {}) {
  const c = mk(), email = name + '.' + stamp + '@fitme.test';
  const r = await c.auth.signUp({ email, password: PW, options: { data: Object.assign({ username: name + stamp, display_name: name, terms_version: '2026-10-16', privacy_version: '2026-10-16', age_confirmed: true }, extra) } });
  return { c, email, r, username: name + stamp };
}
async function confirm(email) {
  for (let i = 0; i < 20; i++) { const m = (await getJSON(URL + '/__mail')).filter(x => x.to.includes(email)).pop();
    if (m) { const link = m.links.find(l => l.includes('/verify')); return { mail: m, res: await visit(link) }; } await sleep(200); }
  return null;
}
async function account(name, extra) {
  const s = await signup(name, extra); const cf = await confirm(s.email);
  ok(cf && /access_token=/.test(cf.res.location), name + ': link potwierdzający loguje (przekierowanie z tokenem)', cf && cf.res);
  const { data, error } = await s.c.auth.signInWithPassword({ email: s.email, password: PW });
  ok(!error, name + ': logowanie po potwierdzeniu', error);
  s.id = data.user.id; return s;
}

(async () => {
  await getJSON(URL + '/__mail', 'DELETE');
  const anon = mk();
  console.log('• rejestracja i potwierdzenie');
  ok(await anon.rpc('username_available', { name: 'anna' + stamp }).then(r => r.data === true), 'nazwa wolna');
  ok(await anon.rpc('username_available', { name: 'admin' }).then(r => r.data === false), 'nazwa zastrzeżona = zajęta');
  ok(await anon.rpc('username_available', { name: 'a..b' }).then(r => r.data === false), 'nazwa z ".." niepoprawna');
  ok(await anon.rpc('username_available', { name: 'Ab' }).then(r => r.data === false), 'za krótka nazwa');
  const pre = await signup('anna');
  ok(!pre.r.error && !pre.r.data.session, 'rejestracja bez sesji (czeka na e-mail)', pre.r.error);
  const early = await pre.c.auth.signInWithPassword({ email: pre.email, password: PW });
  ok(!!early.error, 'niepotwierdzone konto nie może się zalogować');
  ok(await anon.rpc('username_available', { name: 'anna' + stamp }).then(r => r.data === false), 'nazwa zarezerwowana od rejestracji');
  const hiddenP = await anon.from('profiles').select('id').eq('username', 'anna' + stamp);
  ok(hiddenP.data && hiddenP.data.length === 0, 'niepotwierdzony profil niewidoczny', hiddenP);
  const dup = await mk().auth.signUp({ email: 'dup.' + stamp + '@fitme.test', password: PW, options: { data: { username: 'anna' + stamp } } });
  ok(!!dup.error, 'druga rejestracja z tą samą nazwą odrzucona', dup.error && dup.error.message);
  const cf = await confirm(pre.email);
  ok(cf && /access_token=/.test(cf.res.location), 'link potwierdzający', cf && cf.res);
  await pre.c.auth.signInWithPassword({ email: pre.email, password: PW });
  const A = pre; A.id = (await A.c.auth.getUser()).data.user.id;
  const B = await account('bartek'), C = await account('celina'), D = await account('dawid');

  console.log('• profil, zgody, historia konta');
  const pa = await A.c.from('profiles').select('*').eq('id', A.id).single();
  ok(pa.data && pa.data.username === 'anna' + stamp && pa.data.display_name === 'anna' && pa.data.confirmed, 'profil z rejestracji', pa);
  const cons = await A.c.from('consents').select('doc,version');
  ok(cons.data && cons.data.length === 3, 'zapisane 3 zgody (regulamin, prywatność, wiek)', cons);
  const ev = await A.c.from('account_events').select('kind');
  ok(ev.data && ev.data.some(e => e.kind === 'created') && ev.data.some(e => e.kind === 'sign_in'), 'historia konta: założenie i logowanie', ev.data);
  ok((await B.c.from('consents').select('*').eq('user_id', A.id)).data.length === 0, 'cudze zgody niewidoczne');
  ok((await B.c.from('account_events').select('*').eq('user_id', A.id)).data.length === 0, 'cudza historia konta niewidoczna');
  ok((await B.c.from('user_settings').select('*').eq('id', A.id)).data.length === 0, 'cudze ustawienia niewidoczne');
  let r = await A.c.from('profiles').update({ followers_count: 999 }).eq('id', A.id);
  ok(!!r.error, 'licznik obserwujących nie do zmiany z aplikacji', r.error && r.error.message);
  r = await B.c.from('profiles').update({ bio: 'hack' }).eq('id', A.id).select();
  ok(!r.error && r.data.length === 0, 'cudzego profilu nie da się zmienić', r);
  r = await A.c.from('profiles').update({ bio: 'Lubię oversize', website: 'https://example.com' }).eq('id', A.id).select();
  ok(!r.error && r.data[0].bio === 'Lubię oversize', 'edycja własnego profilu', r.error);
  r = await A.c.from('profiles').update({ website: 'javascript:alert(1)' }).eq('id', A.id);
  ok(!!r.error, 'link javascript: odrzucony');
  r = await A.c.from('profiles').update({ avatar: 'data:text/html;base64,PHNjcmlwdD4=' }).eq('id', A.id);
  ok(!!r.error, 'awatar nie-obrazek odrzucony');
  r = await A.c.from('profiles').update({ username: 'support' }).eq('id', A.id);
  ok(!!r.error, 'zmiana na zastrzeżoną nazwę odrzucona');
  r = await A.c.from('profiles').update({ username: 'Anna.Nowa' + stamp }).eq('id', A.id).select('username');
  ok(!r.error && r.data[0].username === 'anna.nowa' + stamp, 'zmiana nazwy (małe litery)', r);
  ok((await A.c.from('account_events').select('kind').eq('kind', 'username_changed')).data.length === 1, 'zmiana nazwy w historii konta');
  r = await A.c.from('user_settings').update({ prefs: { theme: 'dark', opts: { fps: true } } }).eq('id', A.id).select();
  ok(!r.error && r.data[0].prefs.theme === 'dark', 'zapis preferencji na koncie', r.error);

  console.log('• fity i widoczność');
  const ins = async (cl, name, visibility) => { const x = await cl.from('fits').insert({ name, state: STATE, visibility, tags: ['streetwear'] }).select().single(); ok(!x.error, 'dodanie fitu ' + name, x.error); return x.data; };
  const fPub = await ins(A.c, 'Publiczny', 'public'), fFol = await ins(A.c, 'Dla obserwujących', 'followers'), fPriv = await ins(A.c, 'Tylko ja', 'private');
  ok(fPub.owner === A.id && fPub.likes_count === 0, 'właściciel ustawiony przez bazę');
  r = await A.c.from('fits').insert({ name: 'X', state: STATE, likes_count: 50 });
  ok(!!r.error, 'nie da się ustawić polubień przy dodawaniu');
  r = await B.c.from('fits').insert({ name: 'Podszywka', state: STATE, owner: A.id });
  ok(!!r.error, 'nie da się dodać fitu jako ktoś inny');
  ok((await A.c.from('profiles').select('fits_count').eq('id', A.id).single()).data.fits_count === 2, 'licznik fitów bez prywatnych');
  const seen = async cl => (await cl.from('fits').select('name').eq('owner', A.id)).data.map(x => x.name).sort().join('|');
  ok(await seen(anon) === 'Publiczny', 'gość widzi tylko publiczny', await seen(anon));
  ok(await seen(B.c) === 'Publiczny', 'obcy widzi tylko publiczny');
  ok(await seen(A.c) === 'Dla obserwujących|Publiczny|Tylko ja', 'właściciel widzi wszystkie');
  r = await B.c.from('fits').update({ name: 'zmienione' }).eq('id', fPub.id).select();
  ok(r.data && r.data.length === 0, 'cudzego fitu nie da się zmienić');
  r = await B.c.from('fits').delete().eq('id', fPub.id).select();
  ok(r.data && r.data.length === 0, 'cudzego fitu nie da się usunąć');
  r = await A.c.from('fits').insert({ name: 'Za duży', state: { x: 'a'.repeat(40000) } });
  ok(!!r.error, 'za duży stan odrzucony');

  console.log('• obserwowanie, polubienia, powiadomienia');
  r = await B.c.from('follows').insert({ followee: A.id }).select().single();
  ok(!r.error && r.data.status === 'accepted', 'obserwowanie publicznego konta od razu', r);
  ok(await seen(B.c) === 'Dla obserwujących|Publiczny', 'obserwujący widzi fit dla obserwujących');
  ok((await A.c.from('profiles').select('followers_count').eq('id', A.id).single()).data.followers_count === 1, 'licznik obserwujących');
  ok((await B.c.from('profiles').select('following_count').eq('id', B.id).single()).data.following_count === 1, 'licznik obserwowanych');
  let n = await A.c.from('notifications').select('kind,actor');
  ok(n.data.some(x => x.kind === 'follow' && x.actor === B.id), 'powiadomienie o obserwowaniu', n.data);
  ok((await B.c.from('notifications').select('*').eq('user_id', A.id)).data.length === 0, 'cudze powiadomienia niewidoczne');
  r = await B.c.from('likes').insert({ fit_id: fPub.id });
  ok(!r.error, 'polubienie', r.error);
  ok((await anon.from('fits').select('likes_count').eq('id', fPub.id).single()).data.likes_count === 1, 'licznik polubień');
  r = await B.c.from('likes').insert({ fit_id: fPriv.id });
  ok(!!r.error, 'nie da się polubić niewidocznego fitu');
  ok((await A.c.from('notifications').select('kind').eq('kind', 'like')).data.length === 1, 'powiadomienie o polubieniu');
  await B.c.from('likes').delete().eq('fit_id', fPub.id);
  ok((await anon.from('fits').select('likes_count').eq('id', fPub.id).single()).data.likes_count === 0, 'cofnięcie polubienia');
  ok((await A.c.from('notifications').select('kind').eq('kind', 'like')).data.length === 0, 'powiadomienie o polubieniu znika po cofnięciu');
  r = await A.c.from('notifications').update({ read_at: new Date().toISOString(), kind: 'like' }).eq('user_id', A.id).select();
  ok(!!r.error, 'nie da się zmienić rodzaju powiadomienia');
  r = await A.c.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', A.id).select();
  ok(!r.error && r.data.every(x => x.read_at), 'oznaczanie powiadomień jako przeczytane', r.error);
  const feed = await B.c.rpc('feed_following', { lim: 10 }).select('name,owner:profiles!fits_owner_fkey(username)');
  ok(!feed.error && feed.data.length === 2 && feed.data[0].owner.username, 'kanał obserwowanych z profilem autora', feed);

  console.log('• komentarze');
  r = await B.c.from('comments').insert({ fit_id: fPub.id, body: '  Świetny fit!  ' }).select().single();
  ok(!r.error && r.data.body === 'Świetny fit!', 'komentarz', r.error);
  const cm = r.data;
  ok((await anon.from('fits').select('comments_count').eq('id', fPub.id).single()).data.comments_count === 1, 'licznik komentarzy');
  ok((await A.c.from('notifications').select('kind').eq('kind', 'comment')).data.length === 1, 'powiadomienie o komentarzu');
  ok((await anon.from('comments').select('body').eq('fit_id', fPub.id)).data.length === 1, 'gość widzi komentarze publicznego fitu');
  ok((await anon.from('comments').select('body').eq('fit_id', fFol.id)).data.length === 0, 'gość nie widzi komentarzy niewidocznego fitu');
  r = await C.c.from('comments').insert({ fit_id: fPriv.id, body: 'x' });
  ok(!!r.error, 'nie da się komentować niewidocznego fitu');
  await A.c.from('profiles').update({ comments: 'followers' }).eq('id', A.id);
  r = await C.c.from('comments').insert({ fit_id: fPub.id, body: 'obcy' });
  ok(!!r.error, 'komentarze tylko dla obserwujących: obcy odrzucony');
  r = await B.c.from('comments').insert({ fit_id: fPub.id, body: 'obserwujący' });
  ok(!r.error, 'komentarze tylko dla obserwujących: obserwujący może', r.error);
  await A.c.from('profiles').update({ comments: 'none' }).eq('id', A.id);
  r = await B.c.from('comments').insert({ fit_id: fPub.id, body: 'nie' });
  ok(!!r.error, 'komentarze wyłączone');
  r = await A.c.from('comments').insert({ fit_id: fPub.id, body: 'autor zawsze może' });
  ok(!r.error, 'autor komentuje swój fit mimo wyłączenia', r.error);
  await A.c.from('profiles').update({ comments: 'all' }).eq('id', A.id);
  r = await C.c.from('comments').delete().eq('id', cm.id).select();
  ok(r.data.length === 0, 'obcy nie usunie cudzego komentarza');
  r = await A.c.from('comments').delete().eq('id', cm.id).select();
  ok(r.data.length === 1, 'autor fitu usuwa komentarz pod swoim fitem');
  r = await C.c.from('comments').insert({ fit_id: fPub.id, body: '<img src=x onerror=alert(1)>' }).select().single();
  ok(!r.error && r.data.body.includes('<img'), 'HTML w komentarzu zapisany jako tekst (aplikacja go nie interpretuje)');

  console.log('• konto prywatne');
  await C.c.from('profiles').update({ is_private: true }).eq('id', C.id);
  const fC = await ins(C.c, 'Celina publiczny', 'public');
  ok((await anon.from('fits').select('id').eq('id', fC.id)).data.length === 0, 'fit konta prywatnego niewidoczny dla gościa');
  ok((await anon.from('profiles').select('username,is_private').eq('id', C.id)).data.length === 1, 'profil prywatny widoczny (nazwa, zdjęcie)');
  r = await A.c.from('follows').insert({ followee: C.id }).select().single();
  ok(!r.error && r.data.status === 'pending', 'prośba o obserwowanie', r);
  ok((await A.c.from('fits').select('id').eq('id', fC.id)).data.length === 0, 'oczekująca prośba nic nie odsłania');
  ok((await C.c.from('notifications').select('kind').eq('kind', 'follow_request')).data.length === 1, 'powiadomienie o prośbie');
  ok((await C.c.from('profiles').select('followers_count').eq('id', C.id).single()).data.followers_count === 0, 'prośba nie liczy się jako obserwujący');
  r = await A.c.from('follows').update({ status: 'accepted' }).eq('follower', A.id).eq('followee', C.id).select();
  ok(r.data && r.data.length === 0, 'proszący nie zaakceptuje sam siebie');
  r = await C.c.from('follows').update({ status: 'accepted' }).eq('follower', A.id).eq('followee', C.id).select();
  ok(!r.error && r.data.length === 1, 'akceptacja prośby', r.error);
  ok((await A.c.from('fits').select('id').eq('id', fC.id)).data.length === 1, 'po akceptacji widać fity');
  ok((await A.c.from('notifications').select('kind').eq('kind', 'follow_accept')).data.length === 1, 'powiadomienie o akceptacji');
  ok((await C.c.from('notifications').select('kind').eq('kind', 'follow_request')).data.length === 0, 'prośba znika z powiadomień po akceptacji');
  r = await D.c.from('follows').insert({ followee: C.id });
  ok((await anon.from('follows').select('*').eq('followee', C.id)).data.length === 0, 'lista obserwujących konta prywatnego ukryta');
  await C.c.from('profiles').update({ is_private: false }).eq('id', C.id);
  ok((await D.c.from('follows').select('status').eq('follower', D.id).eq('followee', C.id).single()).data.status === 'accepted', 'konto publiczne: oczekujące prośby zaakceptowane');
  r = await C.c.from('follows').delete().eq('follower', D.id).eq('followee', C.id).select();
  ok(r.data.length === 1, 'usunięcie obserwującego');

  console.log('• blokowanie');
  r = await A.c.from('blocks').insert({ blocked: B.id });
  ok(!r.error, 'zablokowanie', r.error);
  ok((await B.c.from('follows').select('*').eq('follower', B.id).eq('followee', A.id)).data.length === 0, 'blokada zrywa obserwowanie');
  ok((await B.c.from('profiles').select('id').eq('id', A.id)).data.length === 0, 'zablokowany nie widzi profilu');
  ok((await A.c.from('blocks').select('p:profiles!blocks_blocked_fkey(username)')).data[0].p.username === B.username, 'blokujący widzi listę zablokowanych z nazwami');
  ok((await B.c.from('fits').select('id').eq('owner', A.id)).data.length === 0, 'zablokowany nie widzi fitów');
  r = await B.c.from('follows').insert({ followee: A.id });
  ok(!!r.error, 'zablokowany nie może obserwować');
  ok((await B.c.from('blocks').select('*')).data.length === 0, 'zablokowany nie widzi, kto go zablokował');
  ok((await A.c.from('comments').select('id').eq('user_id', B.id)).data.length === 0, 'komentarze zablokowanego ukryte');
  await A.c.from('blocks').delete().eq('blocked', B.id);
  ok((await B.c.from('profiles').select('id').eq('id', A.id)).data.length === 1, 'odblokowanie');

  console.log('• zgłoszenia (DSA)');
  r = await anon.from('reports').insert({ target_type: 'fit', target_id: fPub.id, reason: 'spam', details: 'test', good_faith: true, reporter_email: 'ktos@example.com' });
  ok(!r.error, 'zgłoszenie bez konta z e-mailem', r.error);
  r = await anon.from('reports').insert({ target_type: 'fit', target_id: fPub.id, reason: 'spam', good_faith: true });
  ok(!!r.error, 'zgłoszenie bez konta bez e-maila odrzucone');
  r = await B.c.from('reports').insert({ target_type: 'comment', target_id: fPub.id, reason: 'hate', good_faith: false });
  ok(!!r.error, 'zgłoszenie bez oświadczenia o dobrej wierze odrzucone');
  r = await B.c.from('reports').insert({ target_type: 'profile', target_id: C.id, reason: 'impersonation', details: 'podszywa się', good_faith: true });
  ok(!r.error, 'zgłoszenie z konta', r.error);
  ok((await B.c.from('reports').select('*')).data.length === 1 && (await C.c.from('reports').select('*')).data.length === 0, 'zgłoszenia widzi tylko zgłaszający');
  r = await B.c.from('reports').insert({ target_type: 'profile', target_id: C.id, reason: 'spam', good_faith: true, status: 'resolved' });
  ok(!!r.error, 'zgłaszający nie ustawi statusu');

  console.log('• historia oglądania');
  r = await B.c.from('history').upsert({ ref: fPub.id, name: 'Publiczny' }, { onConflict: 'user_id,ref' });
  ok(!r.error, 'zapis historii', r.error);
  await sleep(20);
  r = await B.c.from('history').upsert({ ref: fPub.id, name: 'Publiczny' }, { onConflict: 'user_id,ref' });
  ok(!r.error && (await B.c.from('history').select('*')).data.length === 1, 'ponowne obejrzenie nie dubluje', r.error);
  await B.c.from('user_settings').update({ history_on: false }).eq('id', B.id);
  await B.c.from('history').upsert({ ref: 'inspo-1', name: 'X' }, { onConflict: 'user_id,ref' });
  ok((await B.c.from('history').select('*')).data.length === 1, 'wyłączona historia nic nie zapisuje');
  ok((await A.c.from('history').select('*').eq('user_id', B.id)).data.length === 0, 'cudza historia niewidoczna');

  console.log('• limit nadużyć');
  let limited = false;
  for (let i = 0; i < 45 && !limited; i++) { const x = await D.c.from('comments').insert({ fit_id: fPub.id, body: 'spam ' + i }); if (x.error) limited = /Za dużo/.test(x.error.message); }
  ok(limited, 'po 40 komentarzach na godzinę blokada');

  console.log('• reset hasła');
  await getJSON(URL + '/__mail', 'DELETE');
  r = await anon.auth.resetPasswordForEmail(B.email, { redirectTo: URL + '/fitme.html' });
  ok(!r.error, 'wysłanie maila z resetem', r.error);
  await sleep(300);
  const rm = (await getJSON(URL + '/__mail')).find(x => x.to.includes(B.email));
  const rv = rm && await visit(rm.links.find(l => l.includes('/verify')));
  ok(rv && /type=recovery/.test(rv.location) && /access_token=/.test(rv.location), 'link resetu loguje w trybie recovery', rv);

  console.log('• usunięcie konta (RODO art. 17)');
  r = await anon.rpc('delete_my_account');
  ok(!!r.error, 'gość nie może wywołać usuwania');
  r = await B.c.rpc('delete_my_account');
  ok(!r.error, 'usunięcie konta', r.error);
  ok((await A.c.from('profiles').select('id').eq('id', B.id)).data.length === 0, 'profil usunięty');
  ok((await A.c.from('comments').select('id').eq('user_id', B.id)).data.length === 0, 'komentarze usunięte');
  ok((await A.c.from('profiles').select('followers_count').eq('id', A.id).single()).data.followers_count === 0, 'liczniki poprawione po usunięciu');
  const relog = await mk().auth.signInWithPassword({ email: B.email, password: PW });
  ok(!!relog.error, 'nie da się zalogować na usunięte konto');

  console.log('\n' + (fails ? '✗ ' + fails + ' błędów, ' : '✓ ') + passes + ' testów przeszło');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
