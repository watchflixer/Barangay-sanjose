import {
  SESSION_TTL_MS,
  clientIp,
  clearFailures,
  createSessionToken,
  isLockedOut,
  json,
  noteFailure,
  readAdminConfig,
  readBearer,
  retryAfterSeconds,
  safeEqual,
  sessionCookie,
  verifySupabaseToken,
} from '../../_lib/admin.js';

/** A failed login always costs the same wall-clock time, so timing leaks nothing. */
const FAILURE_DELAY_MS = 700;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * POST /api/admin/login
 *
 * Two ways in, both ending in the same opaque HttpOnly cookie:
 *
 *   1. Supabase Auth: `Authorization: Bearer <access_token>`. GoTrue verifies
 *      the token and the account must have reached `aal2` when it has an
 *      authenticator enrolled. The password never reaches this Function.
 *   2. Legacy password: body `{ email, password }`, compared here against the
 *      encrypted Cloudflare Secrets.
 *
 * Either way the browser receives a signed cookie — never the credential, and
 * never a token the JavaScript can read.
 */
export async function onRequestPost({ request, env }) {
  const config = readAdminConfig(env);
  if (!config.configured) {
    return json(
      { ok: false, error: 'Admin sign-in is not configured on this deployment.' },
      503,
    );
  }

  const ip = clientIp(request);
  if (isLockedOut(ip)) {
    return json(
      { ok: false, error: 'Too many attempts. Try again later.', retryAfter: retryAfterSeconds(ip) },
      429,
      { 'Retry-After': String(retryAfterSeconds(ip)) },
    );
  }

  // --- Path 1: a Supabase Auth access token ------------------------------
  const bearer = readBearer(request);
  if (bearer) {
    const identity = await verifySupabaseToken(config, bearer);
    if (!identity || !safeEqual(identity.email, config.email)) {
      // The token is already verified, so there is no guessing to slow down;
      // counting a failure here would only lock out a misconfigured admin.
      return json({ ok: false, error: 'That sign-in is not recognised on this deployment.' }, 401);
    }
    if (identity.hasMfa && identity.aal !== 'aal2') {
      return json(
        { ok: false, error: 'Enter the 6-digit code from your authenticator app.' },
        403,
      );
    }
    clearFailures(ip);
    const session = await createSessionToken(config.sessionSecret, SESSION_TTL_MS);
    return json({ ok: true, expiresAt: session.expiresAt, method: 'supabase' }, 200, {
      'Set-Cookie': sessionCookie(session.token, Math.floor(SESSION_TTL_MS / 1000)),
    });
  }

  // --- Path 2: the legacy password ---------------------------------------
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid request body.' }, 400);
  }

  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');

  // Compare both fields every time (no short-circuit), then decide.
  const emailMatches = safeEqual(email, config.email);
  const passwordMatches = safeEqual(password, config.password);

  if (!emailMatches || !passwordMatches) {
    noteFailure(ip);
    await sleep(FAILURE_DELAY_MS);
    // Same message for a wrong email and a wrong password: no account probing.
    return json({ ok: false, error: 'That email or password doesn’t match. Try again.' }, 401);
  }

  clearFailures(ip);
  const { token, expiresAt } = await createSessionToken(config.sessionSecret, SESSION_TTL_MS);
  return json(
    { ok: true, expiresAt },
    200,
    { 'Set-Cookie': sessionCookie(token, Math.floor(SESSION_TTL_MS / 1000)) },
  );
}
