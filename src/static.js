'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const { sendText, sendHtml } = require('./http');

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

const NOT_FOUND_HTML =
  '<h1>404 &mdash; Not found</h1><p><a href="/">Back to the landing page</a></p>';

function contentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

/**
 * Serve files from a directory for GET/HEAD requests.
 *
 * Anything else (POST to a page, a traversal attempt, a missing file) is
 * answered here rather than delegated, since this is the last middleware.
 */
function createStaticHandler({ publicDir }) {
  const root = path.resolve(publicDir);

  return async function serveStatic(ctx, next) {
    if (ctx.method !== 'GET' && ctx.method !== 'HEAD') {
      sendText(ctx.res, 405, '405 Method Not Allowed', { Allow: 'GET, HEAD' });
      return;
    }

    let decoded;
    try {
      decoded = decodeURIComponent(ctx.pathname);
    } catch (err) {
      sendText(ctx.res, 400, '400 Bad Request');
      return;
    }

    const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
    const filePath = path.resolve(root, relative);

    // Reject anything resolving outside the public directory. Comparing against
    // `root + sep` avoids the classic "/public-secrets" prefix bypass.
    if (filePath !== root && !filePath.startsWith(root + path.sep)) {
      sendText(ctx.res, 403, '403 Forbidden');
      return;
    }

    let data;
    try {
      const stats = await fsp.stat(filePath);
      if (stats.isDirectory()) {
        data = await fsp.readFile(path.join(filePath, 'index.html'));
      } else {
        data = await fsp.readFile(filePath);
      }
    } catch (err) {
      sendHtml(ctx.res, 404, NOT_FOUND_HTML);
      return;
    }

    ctx.res.writeHead(200, {
      'Content-Type': contentType(filePath),
      'Content-Length': data.length,
    });
    ctx.res.end(ctx.method === 'HEAD' ? undefined : data);
  };
}

module.exports = { createStaticHandler, contentType, MIME_TYPES };
