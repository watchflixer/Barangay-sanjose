import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { classifyAgent, clientIp, noteRequest, onRequest } from '../functions/_middleware.js';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const request = (path = '/', ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0', ip = '203.0.113.10') =>
  new Request(`https://hazardsync.example${path}`, { headers: { 'User-Agent': ua, 'CF-Connecting-IP': ip } });

const context = (req, env = {}) => ({
  request: req,
  env,
  next: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }),
});

test('classifyAgent separates declared AI crawlers, scanners and browsers', () => {
  assert.equal(classifyAgent('Mozilla/5.0 Chrome/131.0'), 'allow');
  assert.equal(classifyAgent('GPTBot/1.2 (+https://openai.com/gptbot)'), 'bot');
  assert.equal(classifyAgent('Mozilla/5.0 (compatible; ClaudeBot/1.0)'), 'bot');
  assert.equal(classifyAgent('CCBot/2.0 (https://commoncrawl.org/faq/)'), 'bot');
  assert.equal(classifyAgent('HeadlessChrome/131.0'), 'bot');
  assert.equal(classifyAgent('python-requests/2.31.0'), 'bot');
  assert.equal(classifyAgent('sqlmap/1.7'), 'scanner');
  assert.equal(classifyAgent(''), 'empty');
});

test('a browser request passes through and receives the anti-index headers', async () => {
  const response = await onRequest(context(request('/')));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '<html>app</html>');
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(response.headers.get('X-Frame-Options'), 'SAMEORIGIN');
  assert.equal(response.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
  assert.match(response.headers.get('Permissions-Policy'), /camera=\(\)/);
  // The document itself is untouched.
  assert.equal(response.headers.get('Content-Type'), 'text/html');
});

test('declared AI crawlers and headless scrapers are refused at the edge', async () => {
  for (const ua of [
    'GPTBot/1.2',
    'Mozilla/5.0 (compatible; ClaudeBot/1.0)',
    'PerplexityBot/1.0',
    'Scrapy/2.11',
    'HeadlessChrome/131.0',
  ]) {
    const response = await onRequest(context(request('/', ua, '198.51.100.77')));
    assert.equal(response.status, 403, `${ua} must be blocked`);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    // The refusal must not hint at what would work.
    assert.ok(!JSON.stringify(await response.json()).toLowerCase().includes('cloudflare'));
  }
});

test('generic HTTP clients are blocked by default but can be allowed back', () => {
  // The "AI agent runs curl and parses the HTML" pattern is the common case.
  assert.equal(classifyAgent('curl/8.5.0'), 'bot');
  assert.equal(classifyAgent('python-requests/2.31.0'), 'bot');
  assert.equal(classifyAgent('Wget/1.21'), 'bot');
  // A deployment that needs uptime monitoring or smoke tests can opt out.
  assert.equal(classifyAgent('curl/8.5.0', { allowHttpClients: true }), 'allow');
  assert.equal(classifyAgent('python-requests/2.31.0', { allowHttpClients: true }), 'allow');
  // Opting out never unblocks declared AI crawlers or scanners.
  assert.equal(classifyAgent('GPTBot/1.2', { allowHttpClients: true }), 'bot');
  assert.equal(classifyAgent('sqlmap/1.7', { allowHttpClients: true }), 'scanner');
});

test('SHIELD_DISABLED=1 is an emergency off switch', async () => {
  const response = await onRequest({
    request: request('/', 'GPTBot/1.2', '198.51.100.61'),
    env: { SHIELD_DISABLED: '1' },
    next: async () => new Response('app'),
  });
  assert.equal(response.status, 200);
});

test('SHIELD_ALLOW_HTTP_CLIENTS=1 admits curl without weakening the AI block', async () => {
  const allowed = await onRequest({
    request: request('/robots.txt', 'curl/8.5.0', '198.51.100.62'),
    env: { SHIELD_ALLOW_HTTP_CLIENTS: '1' },
    next: async () => new Response('User-agent: *', { headers: { 'Content-Type': 'text/plain' } }),
  });
  assert.equal(allowed.status, 200);
  assert.equal(await allowed.text(), 'User-agent: *');

  const stillBlocked = await onRequest({
    request: request('/', 'GPTBot/1.2', '198.51.100.63'),
    env: { SHIELD_ALLOW_HTTP_CLIENTS: '1' },
    next: async () => new Response('app'),
  });
  assert.equal(stillBlocked.status, 403);
});

test('vulnerability scanners are refused too', async () => {
  const response = await onRequest(context(request('/', 'sqlmap/1.7', '198.51.100.78')));
  assert.equal(response.status, 403);
});

test('a request budget stops a client that walks the whole site', async () => {
  const ip = '198.51.100.200';
  let last;
  for (let i = 0; i < 95; i += 1) {
    last = await onRequest({
      request: request('/', 'Mozilla/5.0 Chrome/131.0', ip),
      next: async () => new Response('ok'),
    });
  }
  assert.equal(last!.status, 429);
  assert.equal(last!.headers.get('Retry-After'), '60');
});

test('noteRequest counts per IP and resets its window', () => {
  const first = noteRequest('192.0.2.1', 2);
  const second = noteRequest('192.0.2.1', 2);
  const third = noteRequest('192.0.2.1', 2);
  assert.deepEqual([first.allowed, second.allowed, third.allowed], [true, true, false]);
  // A different IP has its own budget.
  assert.equal(noteRequest('192.0.2.2', 2).allowed, true);
});

test('admin routes keep working for the app even with an unusual UA', async () => {
  for (const path of ['/api/admin/login', '/api/admin/session', '/api/admin/rpc', '/api/admin/logout']) {
    const response = await onRequest({
      request: request(path, 'node-18', '198.51.100.90'),
      next: async () => new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } }),
    });
    assert.equal(response.status, 200, `${path} must not be blocked by the bot filter`);
    // Headers still apply.
    assert.ok(response.headers.get('X-Robots-Tag'));
  }
});

test('clientIp prefers the Cloudflare header and falls back safely', () => {
  assert.equal(clientIp(request('/', 'Mozilla/5.0 Chrome/131.0', '203.0.113.9')), '203.0.113.9');
  assert.equal(
    clientIp(new Request('https://x', { headers: { 'X-Forwarded-For': '1.2.3.4, 5.6.7.8' } })),
    '1.2.3.4',
  );
  assert.equal(clientIp(new Request('https://x')), 'unknown');
});
