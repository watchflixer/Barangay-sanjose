/**
 * Admin access through the Cloudflare Pages Function proxy.
 *
 * When the site is deployed on Cloudflare Pages with the admin Functions in
 * `functions/api/admin/*`, the browser never learns the admin credential:
 *
 *   sign in  -> POST /api/admin/login  (compare happens server-side)
 *   session  -> HttpOnly + Secure + SameSite=Strict cookie, 30 minutes
 *   actions  -> POST /api/admin/rpc    (the Function injects `p_password`)
 *
 * `PROXY_CREDENTIAL` is the sentinel the app stores in memory instead of a
 * password. It is intentionally meaningless: it grants nothing on its own, and
 * copying it out of DevTools is useless without the HttpOnly cookie.
 *
 * Local development (`npm run dev`) has no Functions, so the app falls back to
 * talking to Supabase directly — the same behaviour as before. That fallback
 * only activates when /api/admin/session is missing or unconfigured.
 */

export const PROXY_CREDENTIAL = '__pages_proxy__';

export type AdminMode = 'proxy' | 'direct' | 'unknown';

let mode: AdminMode = 'unknown';
let probe: Promise<AdminMode> | null = null;

/**
 * The Supabase Auth access token for the signed-in admin, held in memory only.
 *
 * When it is present the Function forwards it to PostgREST, so the database
 * sees `auth.jwt()` and can check the allow-list plus the `aal2` claim. When it
 * is absent the Function falls back to the legacy password path.
 */
let accessToken: string | null = null;

export function setAdminAccessToken(token: string | null): void {
  accessToken = token && token.length > 0 ? token : null;
}

export function getAdminAccessToken(): string | null {
  return accessToken;
}

function authHeaders(): Record<string, string> {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export class AdminSessionExpiredError extends Error {
  constructor() {
    super('Your admin session has expired. Sign in again.');
    this.name = 'AdminSessionExpiredError';
  }
}

async function readSession(): Promise<{
  proxy: boolean;
  authenticated: boolean;
  expiresAt: number | null;
}> {
  const response = await fetch('/api/admin/session', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`session ${response.status}`);
  const payload = (await response.json()) as {
    proxy?: boolean;
    authenticated?: boolean;
    expiresAt?: number | null;
  };
  if (!payload?.proxy) throw new Error('proxy disabled');
  return {
    proxy: true,
    authenticated: payload.authenticated === true,
    expiresAt: typeof payload.expiresAt === 'number' ? payload.expiresAt : null,
  };
}

/** Detects (once per page load) whether the server proxy is usable. */
export function detectAdminMode(): Promise<AdminMode> {
  if (mode !== 'unknown') return Promise.resolve(mode);
  if (!probe) {
    probe = readSession()
      .then(() => {
        mode = 'proxy';
        return mode;
      })
      .catch(() => {
        mode = 'direct';
        return mode;
      });
  }
  return probe;
}

/** True when this deployment hides the credential behind the Function. */
export async function adminProxyEnabled(): Promise<boolean> {
  return (await detectAdminMode()) === 'proxy';
}

export interface ProxyLoginResult {
  ok: boolean;
  error?: string;
  retryAfter?: number;
  expiresAt?: number;
}

export async function proxyLogin(email: string, password: string): Promise<ProxyLoginResult> {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ email, password }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    retryAfter?: number;
    expiresAt?: number;
  };
  return {
    ok: response.ok && payload.ok === true,
    error: payload.error,
    retryAfter: payload.retryAfter,
    expiresAt: payload.expiresAt,
  };
}

/**
 * Opens the server session with a Supabase Auth token instead of a password.
 *
 * The Function verifies the token with Supabase before minting the cookie, so a
 * forged or expired token never becomes a session. Requiring `aal2` here too
 * keeps the error message honest instead of letting every later action fail.
 */
export async function proxyLoginWithToken(): Promise<ProxyLoginResult> {
  if (!accessToken) return { ok: false, error: 'Sign in again to continue.' };
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ method: 'supabase' }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    expiresAt?: number;
  };
  return {
    ok: response.ok && payload.ok === true,
    error: payload.error,
    expiresAt: payload.expiresAt,
  };
}

export async function proxyLogout(): Promise<void> {
  accessToken = null;
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    /* The cookie expires on its own; a failed logout must not trap the user. */
  }
}

/** Current server session, or null when signed out / unavailable. */
export async function proxySession(): Promise<{ active: boolean; expiresAt: number | null }> {
  try {
    const session = await readSession();
    return { active: session.authenticated, expiresAt: session.expiresAt };
  } catch {
    return { active: false, expiresAt: null };
  }
}

export async function proxyRpc<T>(rpc: string, args: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch('/api/admin/rpc', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ rpc, args }),
  });
  if (response.status === 401) throw new AdminSessionExpiredError();
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: T;
    error?: string;
  };
  if (!response.ok || payload.ok !== true) {
    throw new Error(payload.error || 'The admin request could not be completed.');
  }
  return payload.data as T;
}
