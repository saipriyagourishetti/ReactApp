'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { UserStore } = require('./userStore');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DEFAULT_PORT = Number(process.env.PORT) || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const store = new UserStore([
  { name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' },
]);

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req, limit = 1e5) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > limit) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.join(PUBLIC_DIR, relative);

  // Prevent path traversal outside of the public directory.
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 &mdash; Not found</h1><p><a href="/">Back to the landing page</a></p>');
      return;
    }
    const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': data.length });
    res.end(data);
  });
}

async function handleSignup(req, res) {
  let data;
  try {
    const raw = await readBody(req);
    data = JSON.parse(raw || '{}');
  } catch (err) {
    sendJson(res, 400, { error: 'Invalid JSON payload.' });
    return;
  }

  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const role = ['user', 'editor', 'admin'].includes(data.role) ? data.role : 'user';

  if (name.length < 2) {
    sendJson(res, 400, { error: 'Please provide a name with at least 2 characters.', field: 'name' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    sendJson(res, 400, { error: 'Please provide a valid email address.', field: 'email' });
    return;
  }
  if (store.findByEmail(email)) {
    sendJson(res, 409, { error: 'An account with this email already exists.', field: 'email' });
    return;
  }

  try {
    const user = store.create({ name, email, role });
    sendJson(res, 201, { user });
  } catch (err) {
    sendJson(res, 400, { error: err.message });
  }
}

function createServer() {
  return http.createServer((req, res) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (pathname === '/api/signup') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        sendJson(res, 405, { error: 'Method not allowed. Use POST.' });
        return;
      }
      handleSignup(req, res);
      return;
    }

    if (pathname === '/api/users' && req.method === 'GET') {
      sendJson(res, 200, { count: store.size, users: store.list() });
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('405 Method Not Allowed');
      return;
    }

    serveStatic(req, res, pathname);
  });
}

function start(port = DEFAULT_PORT) {
  const server = createServer();
  server.listen(port, () => {
    console.log('=== Dummy Project Web ===');
    console.log(`Landing page : http://localhost:${port}/`);
    console.log(`Signup page  : http://localhost:${port}/signup.html`);
    console.log(`Users API    : http://localhost:${port}/api/users`);
    console.log('\nPress Ctrl+C to stop.');
  });
  return server;
}

if (require.main === module) {
  start();
}

module.exports = { createServer, start, store };
