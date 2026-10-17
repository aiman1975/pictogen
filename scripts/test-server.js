// Starts the web studio on a free port and checks the HTTP API and static file serving,
// including requests that used to crash the server (a directory path, a non-object body).
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = await new Promise((done) => {
  const s = createServer().listen(0, () => { const p = s.address().port; s.close(() => done(p)); });
});
const server = spawn(process.execPath, ['serve.js'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
let stderr = '';
server.stderr.on('data', (d) => { stderr += d; });
await new Promise((done, fail) => {
  server.stdout.on('data', (d) => { if (String(d).includes('running')) done(); });
  server.on('exit', (code) => fail(new Error(`server exited (${code}): ${stderr}`)));
});

const base = `http://localhost:${port}`;
let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓ PASS' : '✗ FAIL'}: ${msg}`); if (!ok) fails++; };
const post = (path, body) => fetch(base + path, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) });

try {
  check((await fetch(base + '/')).status === 200, 'GET / serves the studio');
  check((await fetch(base + '/audio')).status === 404, 'GET of a directory is 404');
  check((await fetch(base + '/audio/')).status === 404, 'GET of a directory with trailing slash is 404');
  check((await fetch(base + '/nope.html')).status === 404, 'GET of a missing file is 404');
  check((await fetch(base + '/')).status === 200, 'server still up after directory requests');

  const gen = await post('/api/generate', { text: '2 cats and 4 dogs', mode: 'scene' });
  const data = await gen.json();
  check(gen.status === 200 && data.svg.startsWith('<svg'), 'POST /api/generate returns an SVG');
  check(data.matches.map((m) => `${m.id}x${m.count}`).join() === 'catx2,dogx4', 'numerals become counts');

  check((await post('/api/generate', { text: 123, width: 'abc' })).status === 200, 'non-string text and bad width are tolerated');
  check((await post('/api/generate', 'null')).status === 200, 'a JSON null body falls back to defaults');
  check((await post('/api/generate', '{oops')).status === 400, 'malformed JSON is a 400');

  const big = await post('/api/generate', 'x'.repeat(2 * 1024 * 1024)).catch(() => null);
  check(!big || big.status === 413, 'oversized body is rejected');
  check((await fetch(base + '/')).status === 200, 'server still up after an oversized body');

  check((await fetch(`${base}/api/svg?text=apple&mode=card`)).headers.get('content-type').startsWith('image/svg+xml'), 'GET /api/svg serves SVG');
  check((await fetch(`${base}/api/icon?id=no_such_concept`)).status === 404, 'unknown icon is 404');
} finally {
  server.kill();
}

console.log(fails ? `\n${fails} server check(s) failed` : '\nServer test suite: ALL PASSED!');
process.exit(fails ? 1 : 0);
