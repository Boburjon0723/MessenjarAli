require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { URL } = require('url');
const http = require('http');
const { Client } = require('pg');

function mask(u) {
  try {
    const x = new URL(u.replace(/^postgresql:/, 'http:'));
    return {
      host: x.hostname,
      port: x.port || '5432',
      db: x.pathname.replace('/', ''),
      user: x.username,
      sslmode: x.searchParams.get('sslmode'),
      hasPassword: Boolean(x.password),
    };
  } catch (e) {
    return { parseError: e.message };
  }
}

function ping(path) {
  return new Promise((resolve) => {
    const req = http.get({ hostname: '127.0.0.1', port: 4000, path, timeout: 4000 }, (res) => {
      let b = '';
      res.on('data', (d) => (b += d));
      res.on('end', () => resolve({ status: res.statusCode, body: b.slice(0, 600) }));
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'timeout' });
    });
  });
}

function postJson(path, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 4000,
        path,
        method: 'POST',
        timeout: 8000,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => {
        let b = '';
        res.on('data', (d) => (b += d));
        res.on('end', () => resolve({ status: res.statusCode, body: b.slice(0, 800) }));
      }
    );
    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'timeout' });
    });
    req.write(data);
    req.end();
  });
}

(async () => {
  const raw = process.env.DATABASE_URL || '';
  console.log('NODE_ENV=', process.env.NODE_ENV || '(unset)');
  console.log('DATABASE_URL set=', Boolean(raw), 'len=', raw.length);
  console.log('PG_SSL_REJECT_UNAUTHORIZED=', process.env.PG_SSL_REJECT_UNAUTHORIZED || '(unset)');
  console.log('JWT_SECRET set=', Boolean(process.env.JWT_SECRET), 'len=', (process.env.JWT_SECRET || '').length);
  console.log('JWT_REFRESH_SECRET set=', Boolean(process.env.JWT_REFRESH_SECRET));
  console.log('CORS_ORIGINS=', process.env.CORS_ORIGINS || '(unset)');
  if (!raw) {
    console.log('NO DATABASE_URL');
    process.exit(1);
  }
  console.log('db target=', JSON.stringify(mask(raw)));

  const isLocal = /localhost|127\.0\.0\.1/i.test(raw);
  const ssl = isLocal ? false : { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED === 'true' };
  console.log('client ssl=', JSON.stringify(ssl));

  const client = new Client({ connectionString: raw, ssl, connectionTimeoutMillis: 12000 });
  try {
    await client.connect();
    const r = await client.query('SELECT now() AS now, current_database() AS db, current_user AS usr');
    console.log('PG CONNECT OK', r.rows[0]);
    const u = await client.query('SELECT COUNT(*)::int AS n FROM users');
    console.log('users count=', u.rows[0].n);
    const sample = await client.query(
      'SELECT phone, role, is_active FROM users ORDER BY created_at DESC NULLS LAST LIMIT 5'
    );
    console.log('sample users=', sample.rows);
  } catch (e) {
    console.log('PG CONNECT FAIL');
    console.log('code=', e.code);
    console.log('message=', e.message);
  } finally {
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }

  console.log('health=', await ping('/api/health'));
  console.log('ping=', await ping('/api/ping'));
  console.log(
    'login empty=',
    await postJson('/api/auth/login', { phone: '', password: '' })
  );
})();
