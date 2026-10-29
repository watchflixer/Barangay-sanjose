import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  callAdminRpc,
  readAdminConfig,
  readBearer,
  verifySupabaseToken,
} from '../functions/_lib/admin.js';
import { onRequestPost as loginPost } from '../functions/api/admin/login.js';
import { onRequestPost as rpcPost } from '../functions/api/admin/rpc.js';
import { signInWithPassword, verifyTotp } from '../src/lib/adminMfa';

const ENV = {
  ADMIN_EMAIL: 'admin@example.com',
  ADMIN_PASSWORD: 'correct horse battery staple',
  SESSION_SECRET: 'x'.repeat(48),
};
const CONFIG = readAdminConfig(ENV);
const IP = '198.51.100.9';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

/** An unsigned JWT-shaped string. Only the middle segment matters to the app. */
const fakeToken = (claims: Record<string, unknown>) => {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode(claims)}.signature`;
};

const aal1 = fakeToken({ sub: 'u1', email: 'admin@example.com', aal: 'aal1' });
const aal2 = fakeToken({ sub: 'u1', email: 'admin@example.com', aal: 'aal2' });

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

function stubFetch(handler: (call: Call) => { status: number; body: unknown }) {
  const calls: Call[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const call: Call = {
      url: String(input),
      method: String(init?.method ?? 'GET'),
      headers,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    const { status, body } = handler(call);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
  return calls;
}

/* ------------------------------------------------------------------ bearer */

test('readBearer accepts one token and ignores anything malformed', () => {
  const withHeader = (value: string | null) =>
    new Request('https://x.test/', {
      headers: value === null ? {} : { Authorization: value },
    });
  assert.equal(readBearer(withHeader('Bearer abc.def.ghi')), 'abc.def.ghi');
  assert.equal(readBearer(withHeader('bearer abc.def.ghi')), 'abc.def.ghi');
  assert.equal(readBearer(withHeader('Basic abc')), null);
  assert.equal(readBearer(withHeader('Bearer')), null);
  assert.equal(readBearer(withHeader('Bearer a b')), null);
  assert.equal(readBearer(withHeader(null)), null);
});

test('verifySupabaseToken rejects anything GoTrue does not confirm', async () => {
  stubFetch(() => ({ status: 401, body: { message: 'invalid token' } }));
  assert.equal(await verifySupabaseToken(CONFIG, 'nope'), null);
  assert.equal(await verifySupabaseToken(CONFIG, null), null);

  stubFetch(() => ({ status: 500, body: {} }));
  assert.equal(await verifySupabaseToken(CONFIG, 'nope'), null);

  // A network failure must fail closed, not blow up.
  globalThis.fetch = (async () => {
    throw new Error('offline');
  }) as typeof fetch;
  assert.equal(await verifySupabaseToken(CONFIG, 'nope'), null);
});

test('verifySupabaseToken reports the email, assurance level and factor state', async () => {
  const calls = stubFetch(() => ({
    status: 200,
    body: {
      id: 'u1',
      email: 'Admin@Example.com',
      factors: [
        { id: 'f1', factor_type: 'totp', status: 'verified' },
        { id: 'f2', factor_type: 'totp', status: 'unverified' },
      ],
    },
  }));
  const identity = await verifySupabaseToken(CONFIG, aal2);
  assert.deepEqual(identity, {
    email: 'admin@example.com',
    aal: 'aal2',
    hasMfa: true,
  });
  // The token is verified with GoTrue, never decoded and trusted on its own.
  assert.ok(calls[0].url.endsWith('/auth/v1/user'));
  assert.equal(calls[0].headers.Authorization, `Bearer ${aal2}`);

  const withoutFactors = stubFetch(() => ({
    status: 200,
    body: { id: 'u1', email: 'admin@example.com', factors: [] },
  }));
  assert.equal((await verifySupabaseToken(CONFIG, aal1))?.hasMfa, false);
  assert.equal((await verifySupabaseToken(CONFIG, aal1))?.aal, 'aal1');
  assert.equal(withoutFactors.length, 2);
});

/* --------------------------------------------------------------------- rpc */

test('callAdminRpc sends no password when an access token is present', async () => {
  const calls = stubFetch(() => ({ status: 200, body: { ok: true } }));
  await callAdminRpc(CONFIG, 'admin_bundle', {}, aal2);

  assert.equal(calls[0].headers.Authorization, `Bearer ${aal2}`);
  assert.equal('p_password' in (calls[0].body as object), false);
  // The anon key still rides along: PostgREST needs it to route the request.
  assert.equal(calls[0].headers.apikey, CONFIG.supabaseKey);
});

test('callAdminRpc falls back to the injected credential without a token', async () => {
  const calls = stubFetch(() => ({ status: 200, body: { ok: true } }));
  await callAdminRpc(CONFIG, 'admin_bundle', {});

  assert.equal(calls[0].headers.Authorization, `Bearer ${CONFIG.supabaseKey}`);
  assert.equal(
    (calls[0].body as { p_password?: string }).p_password,
    `${CONFIG.email}:${CONFIG.password}`,
  );
});

test('callAdminRpc surfaces the PostgREST status so rpc.js can map it', async () => {
  stubFetch(() => ({ status: 401, body: { message: 'JWT expired' } }));
  await assert.rejects(
    () => callAdminRpc(CONFIG, 'admin_bundle', {}, aal2),
    (error: { status?: number }) => error.status === 401,
  );
});

/* ------------------------------------------------------------------- login */

const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': IP,
      ...headers,
    },
    body: JSON.stringify(body),
  });

test('login with a valid aal2 token sets the cookie without a password', async () => {
  stubFetch((call) => {
    if (call.url.includes('/auth/v1/user')) {
      return {
        status: 200,
        body: {
          id: 'u1',
          email: ENV.ADMIN_EMAIL,
          factors: [{ id: 'f1', factor_type: 'totp', status: 'verified' }],
        },
      };
    }
    return { status: 500, body: {} };
  });

  const response = await loginPost({
    request: post('https://x.test/api/admin/login', {}, { Authorization: `Bearer ${aal2}` }),
    env: ENV,
  });
  assert.equal(response.status, 200);
  assert.ok(cookieFrom(response).includes('hs_admin='));
});

test('login refuses an aal1 token when the account has an authenticator', async () => {
  stubFetch(() => ({
    status: 200,
    body: {
      id: 'u1',
      email: ENV.ADMIN_EMAIL,
      factors: [{ id: 'f1', factor_type: 'totp', status: 'verified' }],
    },
  }));

  const response = await loginPost({
    request: post('https://x.test/api/admin/login', {}, { Authorization: `Bearer ${aal1}` }),
    env: ENV,
  });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('Set-Cookie'), null);
  const payload = (await response.json()) as { error?: string };
  assert.match(String(payload.error), /6-digit code/i);
});

test('login refuses a token that belongs to another account', async () => {
  stubFetch(() => ({
    status: 200,
    body: { id: 'u2', email: 'someone.else@example.com', factors: [] },
  }));

  const response = await loginPost({
    request: post('https://x.test/api/admin/login', {}, { Authorization: `Bearer ${aal2}` }),
    env: ENV,
  });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('Set-Cookie'), null);
});

test('login refuses a token GoTrue does not recognise', async () => {
  stubFetch(() => ({ status: 401, body: { message: 'invalid JWT' } }));

  const response = await loginPost({
    request: post('https://x.test/api/admin/login', {}, { Authorization: `Bearer ${aal2}` }),
    env: ENV,
  });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('Set-Cookie'), null);
});

const cookieFrom = (response: Response) =>
  (response.headers.get('Set-Cookie') ?? '').split(';')[0] ?? '';

test('the legacy password still opens a session during the transition', async () => {
  stubFetch(() => ({ status: 500, body: {} }));
  const response = await loginPost({
    request: post('https://x.test/api/admin/login', {
      email: ENV.ADMIN_EMAIL,
      password: ENV.ADMIN_PASSWORD,
    }),
    env: ENV,
  });
  assert.equal(response.status, 200);
  assert.ok(cookieFrom(response).includes('hs_admin='));
});

/* -------------------------------------------------------------------- rpc.js */

test('rpc forwards the browser token and never injects a password', async () => {
  // 1) Open a session through the token path.
  stubFetch((call) =>
    call.url.includes('/auth/v1/user')
      ? {
          status: 200,
          body: {
            id: 'u1',
            email: ENV.ADMIN_EMAIL,
            factors: [{ id: 'f1', factor_type: 'totp', status: 'verified' }],
          },
        }
      : { status: 500, body: {} },
  );
  const login = await loginPost({
    request: post('https://x.test/api/admin/login', {}, { Authorization: `Bearer ${aal2}` }),
    env: ENV,
  });
  const cookie = cookieFrom(login);

  // 2) Call an allowed RPC with that cookie and the same token.
  const calls = stubFetch(() => ({ status: 200, body: { ok: true } }));
  const response = await rpcPost({
    request: post(
      'https://x.test/api/admin/rpc',
      { rpc: 'admin_bundle', args: {} },
      { Cookie: cookie, Authorization: `Bearer ${aal2}` },
    ),
    env: ENV,
  });

  assert.equal(response.status, 200);
  const forwarded = calls.find((call) => call.url.includes('/rest/v1/rpc/admin_bundle'));
  assert.ok(forwarded);
  assert.equal(forwarded.headers.Authorization, `Bearer ${aal2}`);
  assert.equal('p_password' in (forwarded.body as object), false);
});

test('rpc still needs the cookie even when a token is present', async () => {
  stubFetch(() => ({ status: 200, body: { ok: true } }));
  const response = await rpcPost({
    request: post(
      'https://x.test/api/admin/rpc',
      { rpc: 'admin_bundle', args: {} },
      { Authorization: `Bearer ${aal2}` },
    ),
    env: ENV,
  });
  assert.equal(response.status, 401);
});

test('rpc reports an expired token as a sign-in problem, not a server fault', async () => {
  stubFetch((call) =>
    call.url.includes('/auth/v1/user')
      ? {
          status: 200,
          body: {
            id: 'u1',
            email: ENV.ADMIN_EMAIL,
            factors: [{ id: 'f1', factor_type: 'totp', status: 'verified' }],
          },
        }
      : { status: 500, body: {} },
  );
  const login = await loginPost({
    request: post('https://x.test/api/admin/login', {}, { Authorization: `Bearer ${aal2}` }),
    env: ENV,
  });
  const cookie = cookieFrom(login);

  stubFetch(() => ({ status: 401, body: { message: 'JWT expired' } }));
  const response = await rpcPost({
    request: post(
      'https://x.test/api/admin/rpc',
      { rpc: 'admin_bundle', args: {} },
      { Cookie: cookie, Authorization: `Bearer ${aal2}` },
    ),
    env: ENV,
  });
  assert.equal(response.status, 401);
  const payload = (await response.json()) as { error?: string };
  assert.match(String(payload.error), /expired/i);
});

test('rpc explains a missing second factor instead of blaming the credential', async () => {
  stubFetch((call) =>
    call.url.includes('/auth/v1/user')
      ? {
          status: 200,
          body: {
            id: 'u1',
            email: ENV.ADMIN_EMAIL,
            factors: [{ id: 'f1', factor_type: 'totp', status: 'verified' }],
          },
        }
      : { status: 500, body: {} },
  );
  const login = await loginPost({
    request: post('https://x.test/api/admin/login', {}, { Authorization: `Bearer ${aal2}` }),
    env: ENV,
  });
  const cookie = cookieFrom(login);

  stubFetch(() => ({ status: 500, body: { message: 'MFA verification is required' } }));
  const response = await rpcPost({
    request: post(
      'https://x.test/api/admin/rpc',
      { rpc: 'admin_bundle', args: {} },
      { Cookie: cookie, Authorization: `Bearer ${aal2}` },
    ),
    env: ENV,
  });
  assert.equal(response.status, 502);
  const payload = (await response.json()) as { error?: string };
  assert.match(String(payload.error), /two-factor/i);
});

/* ---------------------------------------------------------------- client */

test('signInWithPassword reports a second factor instead of a session', async () => {
  const calls = stubFetch((call) =>
    call.url.includes('/challenge')
      ? { status: 200, body: { id: 'challenge-1', expires_at: 1 } }
      : {
          status: 200,
          body: {
            access_token: aal1,
            refresh_token: 'r1',
            expires_in: 3600,
            user: {
              id: 'u1',
              email: 'admin@example.com',
              factors: [{ id: 'f1', factor_type: 'totp', status: 'verified' }],
            },
          },
        },
  );

  const outcome = await signInWithPassword('Admin@Example.com', 'correct horse');
  assert.equal(outcome.session, null);
  assert.equal(outcome.mfaRequired, true);
  assert.equal(outcome.factorId, 'f1');
  assert.ok(outcome.challengeId);
  assert.equal(outcome.pendingToken, aal1);
  assert.equal(calls[1].url.endsWith('/auth/v1/factors/f1/challenge'), true);
  assert.equal(calls[1].headers.Authorization, `Bearer ${aal1}`);
});

test('signInWithPassword returns a session when no authenticator is enrolled', async () => {
  stubFetch(() => ({
    status: 200,
    body: {
      access_token: aal1,
      refresh_token: 'r1',
      expires_in: 3600,
      user: { id: 'u1', email: 'admin@example.com', factors: [] },
    },
  }));

  const outcome = await signInWithPassword('admin@example.com', 'correct horse');
  assert.equal(outcome.mfaRequired, false);
  assert.equal(outcome.session?.aal, 'aal1');
  assert.equal(outcome.session?.identity.email, 'admin@example.com');
});

test('signInWithPassword keeps the message generic and never leaks a reason', async () => {
  stubFetch(() => ({
    status: 400,
    body: { code: 400, msg: 'Invalid login credentials' },
  }));
  const outcome = await signInWithPassword('admin@example.com', 'wrong');
  assert.equal(outcome.session, null);
  assert.equal(outcome.mfaRequired, false);
  assert.match(String(outcome.error), /doesn’t match/);

  const blank = await signInWithPassword('  ', '');
  assert.equal(blank.session, null);
  assert.match(String(blank.error), /email and password/i);
});

test('verifyTotp refuses a short code before it reaches the network', async () => {
  const calls = stubFetch(() => ({ status: 200, body: {} }));
  const short = await verifyTotp('f1', 'c1', '12', aal1);
  assert.equal(short.session, null);
  assert.match(String(short.error), /6-digit/);
  assert.equal(calls.length, 0);
});

test('verifyTotp only accepts a session that really reached aal2', async () => {
  // GoTrue returning an aal1 token would mean the second factor was skipped.
  stubFetch(() => ({
    status: 200,
    body: {
      access_token: aal1,
      expires_in: 3600,
      user: { id: 'u1', email: 'admin@example.com', factors: [] },
    },
  }));
  const downgraded = await verifyTotp('f1', 'c1', '123456', aal1);
  assert.equal(downgraded.session, null);
  assert.match(String(downgraded.error), /did not complete/);

  const calls = stubFetch(() => ({
    status: 200,
    body: {
      access_token: aal2,
      expires_in: 3600,
      user: {
        id: 'u1',
        email: 'admin@example.com',
        factors: [{ id: 'f1', factor_type: 'totp', status: 'verified' }],
      },
    },
  }));
  const verified = await verifyTotp('f1', 'c1', '123-456', aal1);
  assert.equal(verified.session?.aal, 'aal2');
  assert.equal(verified.error, undefined);
  assert.deepEqual(calls[0].body, { challenge_id: 'c1', code: '123456' });
  assert.equal(calls[0].headers.Authorization, `Bearer ${aal1}`);

  const rejected = stubFetch(() => ({ status: 422, body: { msg: 'Invalid TOTP code entered' } }));
  const bad = await verifyTotp('f1', 'c1', '000000', aal1);
  assert.equal(bad.session, null);
  assert.match(String(bad.error), /not valid/);
  assert.equal(rejected.length, 1);
});
