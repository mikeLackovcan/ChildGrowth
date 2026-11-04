#!/usr/bin/env node

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(process.cwd(), 'dist');
const port = Number(process.env.PORT || 8082);

const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

function resolveRequest(url) {
  const pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const candidates = [relative];
  if (!path.extname(relative)) candidates.push(`${relative}.html`, path.join(relative, 'index.html'));

  for (const candidate of candidates) {
    const file = path.resolve(root, candidate);
    if (file.startsWith(`${root}${path.sep}`) && fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}

http.createServer((request, response) => {
  const file = resolveRequest(request.url || '/');
  if (!file) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  response.writeHead(200, {
    'cache-control': 'no-store',
    'content-type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream',
  });
  fs.createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Questblox visual export: http://127.0.0.1:${port}`);
});
