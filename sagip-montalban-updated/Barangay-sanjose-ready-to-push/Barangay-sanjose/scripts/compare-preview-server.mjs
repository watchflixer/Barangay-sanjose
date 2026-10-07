/**
 * Side-by-side (Pixel 7 + Desktop) preview server.
 *
 * Serves the SAME `dist/` build as `npm run preview`, but makes
 * `compare.html` the index, so opening the bare host shows both viewports
 * at once. Handy for preview panes that can only open a port's root URL.
 *
 * Usage:
 *   npm run preview:compare            # dist on port 4174
 *   node scripts/compare-preview-server.mjs <root> <port>
 *
 * The app itself is still at /index.html on this same origin, so the
 * iframes in compare.html resolve without any cross-origin setup.
 */
import {createReadStream, promises as fs} from 'node:fs';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.argv[2] || path.join(HERE, '..', 'dist'));
const PORT = Number(process.argv[3] || process.env.PORT || 4174);
const INDEX = 'compare.html';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
    const rel = pathname === '/' ? INDEX : pathname.replace(/^\/+/, '');

    // Never serve anything outside ROOT.
    let file = path.resolve(ROOT, rel);
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
      res.writeHead(403, {'Content-Type': 'text/plain'}).end('Forbidden');
      return;
    }

    let stat = await fs.stat(file).catch(() => null);
    if (stat?.isDirectory()) {
      file = path.join(file, 'index.html');
      stat = await fs.stat(file).catch(() => null);
    }
    if (!stat?.isFile()) {
      res.writeHead(404, {'Content-Type': 'text/plain'}).end('Not found: ' + pathname);
      return;
    }

    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-store',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(file).pipe(res);
  } catch (err) {
    res.writeHead(500, {'Content-Type': 'text/plain'}).end('Server error: ' + err.message);
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`  ➜  Pixel 7 + Desktop:  http://0.0.0.0:${PORT}/`);
  console.log(`  ➜  Serving:            ${ROOT} (index = ${INDEX})`);
});
