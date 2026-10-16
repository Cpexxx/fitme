'use strict';
/* Lokalny stos zgodny z Supabase do testów kont i społeczności (bez Dockera):
   Postgres 16 + GoTrue (supabase/auth) + PostgREST + bramka HTTP (/auth/v1, /rest/v1, pliki strony) + skrzynka SMTP.
   Użycie:  FITME_BIN=<katalog z binarkami auth i postgrest> node tools/cloud/stack.js [--reset]
   - binarki: https://github.com/supabase/auth/releases (auth-v2.164.0-x86.tar.gz, z katalogiem migrations/)
              https://github.com/PostgREST/postgrest/releases (postgrest-v12.2.3-linux-static-x64.tar.xz)
   - strona:  http://127.0.0.1:54321/fitme.html (js/config.js jest podmieniany na adres i klucz tego stosu)
   - poczta:  GET http://127.0.0.1:54321/__mail (JSON z przechwyconymi mailami), DELETE czyści
   --reset   kasuje bazę i zakłada ją od nowa (role, schemat auth, supabase/schema.sql). */
const fs = require('fs'), path = require('path'), http = require('http'), net = require('net'), crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const BIN = process.env.FITME_BIN || '/tmp/claude-0/bin';
const DIR = process.env.FITME_STACK || '/var/tmp/fitme-stack';
const PG = '/usr/lib/postgresql/16/bin';
const P = { pg: 54322, rest: 3001, auth: 9999, smtp: 2525, gw: 54321 };
const SECRET = 'fitme-local-dev-jwt-secret-0123456789abcdef';
const GW = 'http://127.0.0.1:' + P.gw;

const b64u = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const jwt = p => { const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' })), b = b64u(JSON.stringify(p));
  return h + '.' + b + '.' + b64u(crypto.createHmac('sha256', SECRET).update(h + '.' + b).digest()); };
const ANON = jwt({ role: 'anon', iss: 'supabase', iat: 1700000000, exp: 2000000000 });
const SERVICE = jwt({ role: 'service_role', iss: 'supabase', iat: 1700000000, exp: 2000000000 });

const asPg = (cmd, args) => execFileSync('runuser', ['-u', 'postgres', '--', cmd, ...args], { stdio: 'pipe' }).toString();
const psql = file => asPg(PG + '/psql', ['-h', '127.0.0.1', '-p', String(P.pg), '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-f', file]);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitHttp(url, tries = 80) { for (let i = 0; i < tries; i++) { try { await new Promise((res, rej) => http.get(url, r => { r.resume(); res(); }).on('error', rej)); return; } catch (e) { await sleep(250); } } throw new Error('nie wstało: ' + url); }
const kids = [];
function run(name, cmd, args, env) {
  const log = fs.openSync(path.join(DIR, name + '.log'), 'a');
  const k = spawn(cmd, args, { env: Object.assign({}, process.env, env), stdio: ['ignore', log, log] });
  k.on('exit', c => console.log('[stack] ' + name + ' zakończył się: ' + c)); kids.push(k); return k;
}
process.on('SIGINT', () => { kids.forEach(k => k.kill()); try { asPg(PG + '/pg_ctl', ['-D', DIR + '/pg', 'stop', '-m', 'fast']); } catch (e) {} process.exit(0); });

/* ---------- skrzynka SMTP (przechwytuje maile GoTrue) ---------- */
const MAIL = [];
function decodeQP(s) { return s.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/gi, (m, h) => String.fromCharCode(parseInt(h, 16))); }
net.createServer(sock => {
  let buf = '', data = false, msg = { to: [] };
  const say = l => sock.write(l + '\r\n');
  say('220 fitme-smtp');
  sock.on('data', d => {
    buf += d.toString('latin1');
    let i;
    while ((i = buf.indexOf('\r\n')) >= 0 || (data && buf.includes('\r\n.\r\n'))) {
      if (data) { const e = buf.indexOf('\r\n.\r\n'); if (e < 0) return; let raw = buf.slice(0, e); buf = buf.slice(e + 5); data = false;
        const sep = raw.indexOf('\r\n\r\n'), head = raw.slice(0, sep), body = raw.slice(sep + 4);
        msg.subject = (head.match(/^Subject: (.*)$/mi) || [])[1] || '';
        msg.body = /quoted-printable/i.test(head) ? decodeQP(body) : /Content-Transfer-Encoding: base64/i.test(head) ? Buffer.from(body, 'base64').toString() : body;
        msg.links = [...new Set((msg.body.match(/https?:\/\/[^"'\s<>]+/g) || []).map(u => u.replace(/&amp;/g, '&')))];
        msg.at = Date.now(); MAIL.push(msg); msg = { to: [] }; say('250 OK'); continue; }
      const line = buf.slice(0, i); buf = buf.slice(i + 2); const cmd = line.slice(0, 4).toUpperCase();
      if (cmd === 'EHLO' || cmd === 'HELO') say('250 fitme-smtp');
      else if (cmd === 'MAIL') { msg.from = line; say('250 OK'); }
      else if (cmd === 'RCPT') { msg.to.push((line.match(/<(.*)>/) || [])[1]); say('250 OK'); }
      else if (cmd === 'DATA') { data = true; say('354 go'); }
      else if (cmd === 'QUIT') { say('221 bye'); sock.end(); }
      else say('250 OK');
    }
  });
  sock.on('error', () => {});
}).listen(P.smtp, '127.0.0.1');

/* ---------- bramka: /auth/v1 -> GoTrue, /rest/v1 -> PostgREST, reszta = pliki repo ---------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };
function proxy(req, res, port, strip) {
  const opts = { host: '127.0.0.1', port, method: req.method, path: req.url.slice(strip.length) || '/', headers: Object.assign({}, req.headers, { host: '127.0.0.1:' + port }) };
  const up = http.request(opts, r => { res.writeHead(r.statusCode, Object.assign({}, r.headers, cors(req))); r.pipe(res); });
  up.on('error', e => { res.writeHead(502); res.end(String(e)); }); req.pipe(up);
}
function cors(req) { return { 'access-control-allow-origin': req.headers.origin || '*', 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, prefer, range, accept-profile, content-profile, x-supabase-api-version', 'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS', 'access-control-expose-headers': 'content-range, x-total-count' }; }
http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors(req)); return res.end(); }
  if (req.url.startsWith('/auth/v1')) return proxy(req, res, P.auth, '/auth/v1');
  if (req.url.startsWith('/rest/v1')) return proxy(req, res, P.rest, '/rest/v1');
  if (req.url.startsWith('/__mail')) { if (req.method === 'DELETE') MAIL.length = 0; res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(MAIL)); }
  if (req.url.startsWith('/__keys')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ url: GW, anon: ANON, service: SERVICE })); }
  let p = decodeURIComponent(req.url.split(/[?#]/)[0]); if (p === '/') p = '/fitme.html';
  const f = path.join(ROOT, path.normalize(p).replace(/^(\.\.[\/\\])+/, ''));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
  let body = fs.readFileSync(f);
  if (p === '/js/config.js') body = Buffer.from(body.toString().replace(/url:\s*'[^']*'/, "url:'" + GW + "'").replace(/anonKey:\s*'[^']*'/, "anonKey:'" + ANON + "'"));
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(body);
}).listen(P.gw, '127.0.0.1');

(async () => {
  const reset = process.argv.includes('--reset');
  fs.mkdirSync(DIR, { recursive: true }); fs.chmodSync(DIR, 0o777);
  if (reset) { try { asPg(PG + '/pg_ctl', ['-D', DIR + '/pg', 'stop', '-m', 'immediate']); } catch (e) {} fs.rmSync(DIR + '/pg', { recursive: true, force: true }); }
  const fresh = !fs.existsSync(DIR + '/pg/PG_VERSION');
  if (fresh) { fs.mkdirSync(DIR + '/pg', { recursive: true }); execFileSync('chown', ['postgres:postgres', DIR + '/pg']);
    asPg(PG + '/initdb', ['-D', DIR + '/pg', '-A', 'trust', '-U', 'postgres', '--locale=C.UTF-8', '-E', 'UTF8']); }
  try { asPg(PG + '/pg_ctl', ['-D', DIR + '/pg', '-o', '-p ' + P.pg + ' -k /tmp -c listen_addresses=127.0.0.1', '-l', DIR + '/pg.log', '-w', 'start']); } catch (e) { console.log('[stack] postgres: ' + e.message.split('\n')[0]); }
  if (fresh) psql(path.join(__dirname, 'init.sql'));
  const AUTH_ENV = {
    GOTRUE_API_HOST: '127.0.0.1', PORT: String(P.auth), API_EXTERNAL_URL: GW + '/auth/v1',
    GOTRUE_DB_DRIVER: 'postgres', DATABASE_URL: 'postgres://supabase_auth_admin:dev@127.0.0.1:' + P.pg + '/postgres?sslmode=disable', GOTRUE_DB_NAMESPACE: 'auth',
    GOTRUE_DB_MIGRATIONS_PATH: BIN + '/migrations',
    GOTRUE_SITE_URL: GW + '/fitme.html', GOTRUE_URI_ALLOW_LIST: GW + '/**',
    GOTRUE_JWT_SECRET: SECRET, GOTRUE_JWT_EXP: '3600', GOTRUE_JWT_AUD: 'authenticated', GOTRUE_JWT_DEFAULT_GROUP_NAME: 'authenticated', GOTRUE_JWT_ADMIN_ROLES: 'service_role',
    GOTRUE_DISABLE_SIGNUP: 'false', GOTRUE_EXTERNAL_EMAIL_ENABLED: 'true', GOTRUE_MAILER_AUTOCONFIRM: 'false', GOTRUE_PASSWORD_MIN_LENGTH: '8',
    GOTRUE_SMTP_HOST: '127.0.0.1', GOTRUE_SMTP_PORT: String(P.smtp), GOTRUE_SMTP_USER: 'x', GOTRUE_SMTP_PASS: 'x', GOTRUE_SMTP_ADMIN_EMAIL: 'noreply@fitme.test', GOTRUE_SMTP_SENDER_NAME: 'Fitme',
    GOTRUE_MAILER_URLPATHS_INVITE: '/auth/v1/verify', GOTRUE_MAILER_URLPATHS_CONFIRMATION: '/auth/v1/verify', GOTRUE_MAILER_URLPATHS_RECOVERY: '/auth/v1/verify', GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE: '/auth/v1/verify',
    GOTRUE_RATE_LIMIT_EMAIL_SENT: '1000', GOTRUE_RATE_LIMIT_HEADER: '', GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION: 'false',
    GOTRUE_LOG_LEVEL: 'info'
  };
  execFileSync(BIN + '/auth', ['migrate'], { env: Object.assign({}, process.env, AUTH_ENV), stdio: 'pipe' });
  run('auth', BIN + '/auth', ['serve'], AUTH_ENV);
  await waitHttp('http://127.0.0.1:' + P.auth + '/health');
  if (fresh || reset || process.argv.includes('--schema')) { psql(path.join(ROOT, 'supabase/schema.sql')); console.log('[stack] schemat wgrany'); }
  run('rest', BIN + '/postgrest', [], {
    PGRST_DB_URI: 'postgres://authenticator:dev@127.0.0.1:' + P.pg + '/postgres', PGRST_DB_SCHEMAS: 'public', PGRST_DB_ANON_ROLE: 'anon',
    PGRST_JWT_SECRET: SECRET, PGRST_SERVER_PORT: String(P.rest), PGRST_SERVER_HOST: '127.0.0.1', PGRST_DB_CHANNEL_ENABLED: 'true'
  });
  await waitHttp('http://127.0.0.1:' + P.rest + '/');
  fs.writeFileSync(DIR + '/keys.json', JSON.stringify({ url: GW, anon: ANON, service: SERVICE }, null, 1));
  console.log('[stack] gotowe: ' + GW + '/fitme.html  (klucze: ' + DIR + '/keys.json)');
})().catch(e => { console.error(e); process.exit(1); });
