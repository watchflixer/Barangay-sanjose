import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  COOKIE_NAME,
  callAdminRpc,
  createSessionToken,
  parseCookie,
  readAdminConfig,
  safeEqual,
  verifySessionToken,
} from '../functions/_lib/admin.js';
import { onRequestPost as loginPost } from '../functions/api/admin/login.js';
import { onRequestPost as rpcPost } from '../functions/api/admin/rpc.js';
import { onRequestPost as logoutPost } from '../functions/api/admin/logout.js';
import { onRequestGet as sessionGet } from '../functions/api/admin/session.js';

const ENV = {
  ADMIN_EMAIL: 'Admin@Example.com',
  ADMIN_PASSWORD: 'correct horse battery staple',
  SESSION_SECRET: 'x'.repeat(48),
};
const IP = '203.0.113.7';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const post = (url: string, body: unknown, cookie?: string, ip = IP) =>
  new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': ip,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });

const cookieFrom = (response: Response) => (response.headers.get('Set-Cookie') ?? '').split(';')[0];

test('safeEqual compares without early exit and never throws on mismatched lengths', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcdef'), false);
  assert.equal(safeEqual('', ''), true);
  assert.equal(safeEqual(null, ''), true);
});

test('session tokens are signed, opaque, expire, and reject tampering', async () => {
  const secret = ENV.SESSION_SECRET;
  const { token, expiresAt } = await createSessionToken(secret, 60_000);
  // The token must not contain the credential or the email.
  assert.ok(!token.includes('Example'));
  assert.ok(!token.includes('horse'));
  assert.equal(await verifySessionToken(secret, token), expiresAt);
  // A different secret (i.e. a forged cookie) is rejected.
  assert.equal(await verifySessionToken('y'.repeat(48), token), null);
  // A tampered expiry is rejected: the HMAC covers it.
  const [version, expiry, signature] = token.split('.');
  assert.equal(await verifySessionToken(secret, `${version}.${Number(expiry) + 1}.${signature}`), null);
  // An expired token is rejected.
  const short = await createSessionToken(secret, -1);
  assert.equal(await verifySessionToken(secret, short.token), null);
  assert.equal(await verifySessionToken(secret, 'garbage'), null);
});

test('config fails closed when a secret is missing or too short', () => {
  assert.equal(readAdminConfig({}).configured, false);
  assert.equal(readAdminConfig({ ADMIN_EMAIL: 'a@b.c', ADMIN_PASSWORD: 'x' }).configured, false);
  assert.equal(
    readAdminConfig({ ADMIN_EMAIL: 'a@b.c', ADMIN_PASSWORD: 'x', SESSION_SECRET: 'short' }).configured,
    false,
  );
  const ok = readAdminConfig({ ...ENV, ADMIN_EMAIL: '  Admin@Example.COM ' });
  assert.equal(ok.configured, true);
  // Email is normalised so casing/spacing can never lock the admin out.
  assert.equal(ok.email, 'admin@example.com');
});

test('login: rejects wrong credentials, rate-limits, then issues an HttpOnly cookie', async () => {
  const ip = '198.51.100.9';
  // Wrong email and wrong password are indistinguishable to the caller.
  for (const body of [
    { email: 'intruder@example.com', password: ENV.ADMIN_PASSWORD },
    { email: ENV.ADMIN_EMAIL, password: 'wrong' },
  ]) {
    const response = await loginPost({ request: post('https://x/api/admin/login', body, undefined, ip), env: ENV });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('Set-Cookie'), null);
    const payload = await response.json();
    assert.match(payload.error, /doesn’t match/);
  }

  // Four more failures trip the brake (the two above already counted).
  let last;
  for (let i = 0; i < 4; i += 1) {
    last = await loginPost({
      request: post('https://x/api/admin/login', { email: 'a@b.c', password: 'nope' }, undefined, ip),
      env: ENV,
    });
  }
  assert.equal(last!.status, 429);
  assert.ok(Number(last!.headers.get('Retry-After')) > 0);

  // A correct login from a fresh IP still works and sets a hardened cookie.
  const response = await loginPost({
    request: post('https://x/api/admin/login', { email: '  ADMIN@example.com ', password: ENV.ADMIN_PASSWORD }),
    env: ENV,
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('Set-Cookie') ?? '';
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, new RegExp(`^${COOKIE_NAME}=`));
  // The response body never carries the credential.
  assert.ok(!JSON.stringify(await response.json()).includes(ENV.ADMIN_PASSWORD));
});

test('login is closed on a deployment without secrets', async () => {
  const response = await loginPost({
    request: post('https://x/api/admin/login', { email: 'a@b.c', password: 'x' }),
    env: {},
  });
  assert.equal(response.status, 503);
});

test('rpc proxy requires a session, refuses admin_login, and injects the credential', async () => {
  const noCookie = await rpcPost({ request: post('https://x/api/admin/rpc', { rpc: 'admin_bundle' }), env: ENV });
  assert.equal(noCookie.status, 401);

  const { token } = await createSessionToken(ENV.SESSION_SECRET, 60_000);
  const cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}`;

  // Login through the proxy is impossible by design.
  const forbidden = await rpcPost({
    request: post('https://x/api/admin/rpc', { rpc: 'admin_login' }, cookie),
    env: ENV,
  });
  assert.equal(forbidden.status, 403);

  // A valid session reaches Supabase with a server-built credential, and a
  // client-supplied p_password is discarded.
  let seen: { url: string; body: Record<string, unknown> } | null = null;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    seen = { url: String(url), body: JSON.parse(String(init.body)) };
    return Response.json([]);
  }) as typeof fetch;

  const ok = await rpcPost({
    request: post(
      'https://x/api/admin/rpc',
      { rpc: 'admin_bundle', args: { p_password: 'attacker-supplied', p_id: 'hz-1' } },
      cookie,
    ),
    env: ENV,
  });
  assert.equal(ok.status, 200);
  assert.ok(seen);
  assert.match(seen!.url, /\/rest\/v1\/rpc\/admin_bundle$/);
  assert.equal(seen!.body.p_password, 'admin@example.com:correct horse battery staple');
  assert.equal(seen!.body.p_id, 'hz-1');
  // The attacker value never survives.
  assert.ok(!JSON.stringify(seen!.body).includes('attacker-supplied'));
  assert.deepEqual(await ok.json(), { ok: true, data: [], expiresAt: await verifySessionToken(ENV.SESSION_SECRET, token) });
});

test('session endpoint reports proxy state without leaking the credential', async () => {
  const anonymous = await sessionGet({
    request: new Request('https://x/api/admin/session'),
    env: ENV,
  });
  const body = await anonymous.json();
  assert.deepEqual(body, { proxy: true, authenticated: false, expiresAt: null });

  const { token, expiresAt } = await createSessionToken(ENV.SESSION_SECRET, 60_000);
  const signedIn = await sessionGet({
    request: new Request('https://x/api/admin/session', {
      headers: { Cookie: `${COOKIE_NAME}=${encodeURIComponent(token)}` },
    }),
    env: ENV,
  });
  assert.deepEqual(await signedIn.json(), { proxy: true, authenticated: true, expiresAt });
  assert.ok(!JSON.stringify(body).includes(ENV.ADMIN_PASSWORD));

  const unconfigured = await sessionGet({ request: new Request('https://x/api/admin/session'), env: {} });
  assert.deepEqual(await unconfigured.json(), {
    proxy: false,
    authenticated: false,
    reason: 'server_not_configured',
  });
});

test('logout clears the cookie; the server never echoes failures verbatim', async () => {
  const response = await logoutPost();
  const cookie = response.headers.get('Set-Cookie') ?? '';
  assert.match(cookie, /Max-Age=0/);
  assert.match(cookie, /HttpOnly/);

  const { token } = await createSessionToken(ENV.SESSION_SECRET, 60_000);
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ message: 'duplicate key value violates unique constraint' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;
  const failed = await rpcPost({
    request: post('https://x/api/admin/rpc', { rpc: 'admin_change' }, `${COOKIE_NAME}=${encodeURIComponent(token)}`),
    env: ENV,
  });
  assert.equal(failed.status, 502);
  const payload = await failed.json();
  assert.equal(payload.error, 'The admin request could not be completed.');
  assert.ok(!JSON.stringify(payload).includes('duplicate key'));
});

test('cookie parsing ignores unrelated cookies and decoded values round-trip', () => {
  assert.equal(parseCookie(new Request('https://x', { headers: { Cookie: 'a=1; hs_admin=v1.2.3; b=2' } }), 'hs_admin'), 'v1.2.3');
  assert.equal(parseCookie(new Request('https://x', { headers: { Cookie: 'a=1' } }), 'hs_admin'), null);
  assert.equal(parseCookie(new Request('https://x'), 'hs_admin'), null);
});

test('callAdminRpc sends the anon key, not a service key, and surfaces failures', async () => {
  let headers: Record<string, string> = {};
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    headers = init.headers as Record<string, string>;
    return Response.json({ ok: 1 });
  }) as typeof fetch;
  const config = readAdminConfig(ENV);
  assert.deepEqual(await callAdminRpc(config, 'admin_bundle'), { ok: 1 });
  assert.equal(headers.apikey, config.supabaseKey);
  assert.match(headers.Authorization, /^Bearer eyJ/);
  assert.ok(!headers.Authorization.includes('service_role'));

  globalThis.fetch = (async () => new Response('{"message":"Invalid admin password"}', { status: 401 })) as typeof fetch;
  await assert.rejects(() => callAdminRpc(config, 'admin_bundle'), /Invalid admin password/);
});
