const http = require('http');

function req(opts, body) {
  return new Promise((resolve) => {
    const r = http.request(
      { hostname: opts.host, port: opts.port, path: opts.path, method: opts.method || 'GET', timeout: 5000, headers: opts.headers || {} },
      (res) => {
        let b = '';
        res.on('data', (d) => (b += d));
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body: b.slice(0, 700) })
        );
      }
    );
    r.on('error', (e) => resolve({ error: e.message }));
    r.on('timeout', () => {
      r.destroy();
      resolve({ error: 'timeout' });
    });
    if (body) r.write(body);
    r.end();
  });
}

(async () => {
  for (const host of ['127.0.0.1', 'localhost']) {
    console.log('---', host, ':8080/api/health');
    console.log(await req({ host, port: 8080, path: '/api/health' }));
  }
  const loginBody = JSON.stringify({ phone: '+998000000000', password: 'x' });
  console.log('--- login from Origin localhost:3000');
  console.log(
    await req(
      {
        host: 'localhost',
        port: 8080,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:3000',
          'Content-Length': Buffer.byteLength(loginBody),
        },
      },
      loginBody
    )
  );
})();
