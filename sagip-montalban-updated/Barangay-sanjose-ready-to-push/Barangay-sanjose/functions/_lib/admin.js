/**
 * Shared server-side admin helpers for Cloudflare Pages Functions.
 *
 * The whole point of this layer: the admin credential lives ONLY in the
 * Cloudflare environment (encrypted Secret) and never reaches the browser.
 * The client gets an opaque, signed, HttpOnly session cookie instead — so the
 * Network tab, DevTools, the JS bundle and localStorage never contain the
 * email or the password.
 *
 * Required environment (Pages -> Settings -> Variables and Secrets):
 *   ADMIN_EMAIL      the admin email (secret or plain text)
 *   ADMIN_PASSWORD   the admin password (Secret)
 *   SESSION_SECRET   long random string, >= 32 chars (Secret)
 * Optional:
 *   ADMIN_SUPABASE_URL / ADMIN_SUPABASE_ANON_KEY  defaults to the barangay
 *   hazard-map project; the anon key is a public browser key by design.
 */

export const COOKIE_NAME = 'hs_admin';
/** 30 minutes. Short enough that a stolen cookie dies on its own. */
export const SESSION_TTL_MS = 30 * 60 * 1000;

/** Public project defaults — safe to ship, they are the same keys the client uses. */
const DEFAULT_SUPABASE_URL = 'https://guxzibsrfyfiuqsgcgyt.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1eHppYnNyZnlmaXVxc2djZ3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzODgyOTcsImV4cCI6MjEwNzk2NDI5N30.RmaSRSb0uWa0anmsPFymJx7EYPIqmhY47bH9s0MD4II';

/** RPCs the browser may reach through this proxy. `admin_login` is NOT here. */
export const ALLOWED_RPCS = new Set([
  'admin_bundle',
  'admin_change',
  'admin_create',
  'admin_set_hidden_types',
  'admin_review_flag',
]);

const encoder = new TextEncoder();

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Never let a CDN or browser cache an admin response.
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      ...headers,
    },
  });
}

/** Constant-time string comparison (no early exit on the first differing byte). */
export function safeEqual(a, b) {
  const left = encoder.encode(String(a ?? ''));
  const right = encoder.encode(String(b ?? ''));
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

function base64url(bytes) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', key, encoder.encode(message));
}

/** Reads a Secret from the Pages environment and fails closed when unset. */
export function readAdminConfig(env) {
  const email = String(env?.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = String(env?.ADMIN_PASSWORD ?? '');
  const sessionSecret = String(env?.SESSION_SECRET ?? '');
  const configured = Boolean(email && password && sessionSecret.length >= 32);
  return {
    configured,
    email,
    password,
    sessionSecret,
    supabaseUrl: String(env?.ADMIN_SUPABASE_URL ?? '') || DEFAULT_SUPABASE_URL,
    supabaseKey: String(env?.ADMIN_SUPABASE_ANON_KEY ?? '') || DEFAULT_SUPABASE_ANON_KEY,
  };
}

export function parseCookie(request, name) {
  const header = request.headers.get('Cookie') ?? '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

/** Issues an opaque signed token: v1.<expiresAt>.<hmac>. No email, no password. */
export async function createSessionToken(sessionSecret, ttlMs = SESSION_TTL_MS) {
  const expiresAt = Date.now() + ttlMs;
  const signature = await hmac(sessionSecret, `v1.${expiresAt}`);
  return { token: `v1.${expiresAt}.${base64url(signature)}`, expiresAt };
}

/** Returns the expiry when the token is authentic and unexpired, otherwise null. */
export async function verifySessionToken(sessionSecret, token) {
  if (!token || typeof token !== 'string') return null;
  const [version, expiresRaw, signatureRaw] = token.split('.');
  if (version !== 'v1' || !expiresRaw || !signatureRaw) return null;
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
  let expected;
  try {
    expected = base64url(await hmac(sessionSecret, `v1.${expiresAt}`));
  } catch {
    return null;
  }
  return safeEqual(expected, signatureRaw) ? expiresAt : null;
}

export function sessionCookie(token, maxAgeSeconds) {
  // HttpOnly  -> JavaScript (and therefore DevTools console) cannot read it.
  // Secure    -> HTTPS only.
  // SameSite  -> the browser will not attach it to cross-site requests.
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}

export function clearedCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

/* ------------------------------------------------------------------ limits */

const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function clientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/** Best-effort brute-force brake per isolate. Cheap, and enough for one admin. */
export function isLockedOut(ip) {
  const record = attempts.get(ip);
  if (!record) return false;
  if (Date.now() - record.first > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

export function noteFailure(ip) {
  const record = attempts.get(ip);
  if (!record || Date.now() - record.first > WINDOW_MS) {
    attempts.set(ip, { first: Date.now(), count: 1 });
    return;
  }
  record.count += 1;
}

export function clearFailures(ip) {
  attempts.delete(ip);
}

export function retryAfterSeconds(ip) {
  const record = attempts.get(ip);
  if (!record) return WINDOW_MS / 1000;
  return Math.max(1, Math.ceil((record.first + WINDOW_MS - Date.now()) / 1000));
}

/* ---------------------------------------------------------------- supabase */

/** Reads `Authorization: Bearer <token>`; null when the header is absent or odd. */
export function readBearer(request) {
  const header = request.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

/** Reads a claim from a JWT we already trust. Never used to decide trust. */
function readClaim(token, claim) {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    const parsed = JSON.parse(binary);
    return typeof parsed?.[claim] === 'string' ? parsed[claim] : null;
  } catch {
    return null;
  }
}

/**
 * Checks a Supabase Auth access token against GoTrue.
 *
 * Returns null for anything that is not a live session: GoTrue verifies the
 * signature and the expiry, so a forged or expired token never gets through.
 * The returned `aal` comes from the signed token, and `hasMfa` from the
 * account's enrolled factors.
 */
export async function verifySupabaseToken(config, token) {
  if (!token) return null;
  let response;
  try {
    response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
      headers: { apikey: config.supabaseKey, Authorization: `Bearer ${token}` },
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  const user = await response.json().catch(() => null);
  const email = String(user?.email ?? '').trim().toLowerCase();
  if (!email) return null;
  const factors = Array.isArray(user?.factors) ? user.factors : [];
  return {
    email,
    aal: readClaim(token, 'aal') ?? 'aal1',
    hasMfa: factors.some(
      (factor) => factor?.factor_type === 'totp' && factor?.status === 'verified',
    ),
  };
}

/**
 * Calls an admin RPC.
 *
 * With an access token the request is made as the signed-in admin: PostgREST
 * verifies the JWT and `is_admin()` checks the allow-list and the `aal2` claim.
 * No password is sent at all, so a password can never stand in for a missing
 * second factor.
 *
 * Without a token the legacy credential is injected server-side and the browser
 * still never sees `p_password`.
 */
export async function callAdminRpc(config, rpc, args = {}, accessToken = null) {
  const headers = { 'Content-Type': 'application/json', apikey: config.supabaseKey };
  const body = { ...args };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else {
    headers.Authorization = `Bearer ${config.supabaseKey}`;
    body.p_password = `${config.email}:${config.password}`;
  }
  const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${rpc}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = payload?.message || payload?.hint || `Supabase HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return payload;
}
