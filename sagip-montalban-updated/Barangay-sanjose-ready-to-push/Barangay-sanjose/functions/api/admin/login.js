import {
  SESSION_TTL_MS,
  clientIp,
  clearFailures,
  createSessionToken,
  isLockedOut,
  json,
  noteFailure,
  readAdminConfig,
  retryAfterSeconds,
  safeEqual,
  sessionCookie,
} from '../../_lib/admin.js';

/** A failed login always costs the same wall-clock time, so timing leaks nothing. */
const FAILURE_DELAY_MS = 700;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * POST /api/admin/login
 *
 * Body: { email, password }
 *
 * The comparison happens here, inside the Function, against the encrypted
 * Cloudflare Secrets. On success the browser receives a signed, HttpOnly
 * cookie — never the credential itself, and never a token the JS can read.
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
