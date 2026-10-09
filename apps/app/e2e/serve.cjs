// Sobe a API (token + SQLite temporário), carrega os dados de demonstração e serve o app exportado em :8081.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const TOKEN = process.env.E2E_TOKEN || 'test-token-0123456789';
const root = path.resolve(__dirname, '../../..');
const dist = path.resolve(__dirname, '../dist');
const db = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'personutri-e2e-')), 'e2e.sqlite');

const api = spawn('node', ['dist/main'], {
  cwd: path.join(root, 'backend'),
  env: { ...process.env, API_TOKENS: TOKEN, DATABASE_PATH: db, PORT: '3001', FRONTEND_ORIGIN: 'http://localhost:8081', NODE_ENV: 'test' },
  stdio: 'inherit',
});
const stop = () => {
  api.kill();
  process.exit(0);
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);

async function waitApi() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch('http://localhost:3001/api/health');
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('API não subiu');
}

const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf' };

waitApi()
  .then(
    () =>
      new Promise((resolve, reject) => {
        const seed = spawn('node', ['scripts/seed-demo.mjs'], { cwd: path.join(root, 'backend'), env: { ...process.env, API_URL: 'http://localhost:3001/api', SEED_TOKEN: TOKEN }, stdio: 'inherit' });
        seed.on('exit', (c) => (c === 0 ? resolve() : reject(new Error(`seed saiu com ${c}`))));
      }),
  )
  .then(() => {
    http
      .createServer((req, res) => {
        const url = decodeURIComponent((req.url || '/').split('?')[0]);
        let file = path.join(dist, url);
        if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
        res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
      })
      .listen(8081, () => console.log('e2e: app em http://localhost:8081, API em http://localhost:3001'));
  })
  .catch((e) => {
    console.error(e);
    stop();
  });
