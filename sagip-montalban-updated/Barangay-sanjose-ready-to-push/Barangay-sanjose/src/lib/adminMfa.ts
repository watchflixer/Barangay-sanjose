/**
 * Supabase Auth sign-in with time-based one-time password (TOTP) support.
 *
 * The admin account lives in Supabase Auth, not only in a hashed password in a
 * table. Signing in goes through GoTrue's REST endpoints so the app keeps full
 * control of the two-step flow:
 *
 *   step 1  POST /auth/v1/token?grant_type=password   -> aal1 session
 *   step 2  POST /auth/v1/factors/{id}/challenge      -> challenge id
 *   step 3  POST /auth/v1/factors/{id}/verify         -> aal2 session
 *
 * The `aal` claim inside the access token is what Postgres reads with
 * `auth.jwt() ->> 'aal'`. Every admin RPC refuses to run at `aal1` once the
 * account has an authenticator enrolled, so a stolen password alone is no
 * longer enough — the attacker also needs the 6-digit code.
 *
 * Tokens are kept in memory only. They are never written to localStorage,
 * sessionStorage or a cookie the JavaScript can read.
 */

import { DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_URL, readDataBackend } from './siteVisits';

export interface AdminIdentity {
  userId: string;
  email: string;
}

export interface MfaFactor {
  id: string;
  friendlyName: string;
  factorType: string;
  status: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  identity: AdminIdentity;
  factors: MfaFactor[];
  /** `aal1` or `aal2`, read from the token itself. */
  aal: string;
}

export interface SignInOutcome {
  session: AuthSession | null;
  /** True when the password was right but a 6-digit code is still required. */
  mfaRequired: boolean;
  factorId: string | null;
  challengeId: string | null;
  /** The aal1 token used to open the challenge; never sent to the database. */
  pendingToken: string | null;
  error?: string;
}

interface AuthConfig {
  url: string;
  key: string;
}

function authConfig(): AuthConfig {
  const backend = readDataBackend();
  return {
    url: backend.url || DEFAULT_SUPABASE_URL,
    key: backend.key || DEFAULT_SUPABASE_ANON_KEY,
  };
}

/** Reads a claim out of our own token. Trust comes from Supabase, not from this. */
function decodeClaim(token: string, claim: string): string | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    const payload = JSON.parse(json) as Record<string, unknown>;
    const value = payload?.[claim];
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

function readFactors(user: unknown): MfaFactor[] {
  const factors = (user as { factors?: unknown })?.factors;
  if (!Array.isArray(factors)) return [];
  return factors
    .map((factor) => {
      const row = factor as Record<string, unknown>;
      return {
        id: String(row.id ?? ''),
        friendlyName: String(row.friendly_name ?? ''),
        factorType: String(row.factor_type ?? ''),
        status: String(row.status ?? ''),
      };
    })
    .filter((factor) => factor.id.length > 0);
}

/** Only a verified TOTP factor forces a second step. */
export function hasVerifiedTotp(factors: MfaFactor[]): boolean {
  return factors.some(
    (factor) => factor.factorType === 'totp' && factor.status === 'verified',
  );
}

function sessionFromPayload(payload: unknown): AuthSession | null {
  const row = payload as {
    access_token?: unknown;
    refresh_token?: unknown;
    expires_in?: unknown;
    user?: unknown;
  };
  const accessToken = typeof row?.access_token === 'string' ? row.access_token : '';
  if (!accessToken) return null;
  const user = (row?.user ?? {}) as { id?: unknown; email?: unknown };
  const expiresIn = Number(row?.expires_in);
  return {
    accessToken,
    refreshToken: typeof row.refresh_token === 'string' ? row.refresh_token : null,
    expiresAt: Date.now() + (Number.isFinite(expiresIn) ? expiresIn * 1000 : 3600_000),
    identity: {
      userId: String(user.id ?? ''),
      email: String(user.email ?? '').trim().toLowerCase(),
    },
    factors: readFactors(row?.user),
    aal: decodeClaim(accessToken, 'aal') ?? 'aal1',
  };
}

function friendlyAuthError(status: number, payload: unknown): string {
  const message = String((payload as { msg?: unknown; error_description?: unknown })?.msg ?? '');
  const description = String(
    (payload as { error_description?: unknown })?.error_description ?? '',
  );
  const combined = `${message} ${description}`.toLowerCase();
  if (status === 429) return 'Too many attempts. Please wait a minute and try again.';
  if (combined.includes('invalid login credentials')) {
    return 'That email or password doesn’t match. Try again.';
  }
  if (combined.includes('email not confirmed')) {
    return 'This account has not confirmed its email address yet.';
  }
  if (
    (combined.includes('totp') || combined.includes('mfa') || combined.includes('factor')) &&
    (combined.includes('invalid') || combined.includes('expired') || combined.includes('not'))
  ) {
    return 'That code is not valid. Check your authenticator and try again.';
  }
  if (status >= 500) return 'The sign-in service is unavailable right now. Try again shortly.';
  return 'Sign in failed. Please try again.';
}

async function postAuth(
  path: string,
  body: unknown,
  options: { token?: string } = {},
): Promise<{ ok: boolean; status: number; payload: unknown }> {
  const config = authConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: config.key,
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  try {
    const response = await fetch(`${config.url}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
    });
    const payload = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, payload };
  } catch {
    return { ok: false, status: 0, payload: null };
  }
}

/**
 * Step 1 — email + password.
 *
 * Returns `mfaRequired: true` with a challenge ready when the account has an
 * authenticator enrolled. The aal1 token in `pendingToken` can only open a
 * challenge; the database refuses it for every admin action.
 */
export async function signInWithPassword(email: string, password: string): Promise<SignInOutcome> {
  const normalised = email.trim().toLowerCase();
  if (!normalised || !password) {
    return {
      session: null,
      mfaRequired: false,
      factorId: null,
      challengeId: null,
      pendingToken: null,
      error: 'Enter your email and password.',
    };
  }

  const result = await postAuth('/auth/v1/token?grant_type=password', {
    email: normalised,
    password,
  });
  if (!result.ok) {
    return {
      session: null,
      mfaRequired: false,
      factorId: null,
      challengeId: null,
      pendingToken: null,
      error: friendlyAuthError(result.status, result.payload),
    };
  }

  const session = sessionFromPayload(result.payload);
  if (!session) {
    return {
      session: null,
      mfaRequired: false,
      factorId: null,
      challengeId: null,
      pendingToken: null,
      error: 'The sign-in response was incomplete. Try again.',
    };
  }

  const totp = session.factors.find(
    (factor) => factor.factorType === 'totp' && factor.status === 'verified',
  );
  if (!totp) {
    // No authenticator on this account, so aal1 is the highest level possible.
    return {
      session,
      mfaRequired: false,
      factorId: null,
      challengeId: null,
      pendingToken: null,
    };
  }

  const challenge = await postAuth(`/auth/v1/factors/${totp.id}/challenge`, {}, {
    token: session.accessToken,
  });
  const challengeId =
    challenge.ok && typeof (challenge.payload as { id?: unknown })?.id === 'string'
      ? String((challenge.payload as { id?: unknown }).id)
      : null;

  if (!challengeId) {
    return {
      session: null,
      mfaRequired: false,
      factorId: null,
      challengeId: null,
      pendingToken: null,
      error: friendlyAuthError(challenge.status, challenge.payload),
    };
  }

  return {
    session: null,
    mfaRequired: true,
    factorId: totp.id,
    challengeId,
    pendingToken: session.accessToken,
  };
}

/** Step 2 — the 6-digit code. Produces the aal2 session the database accepts. */
export async function verifyTotp(
  factorId: string,
  challengeId: string,
  code: string,
  pendingToken: string,
): Promise<{ session: AuthSession | null; error?: string }> {
  const clean = code.replace(/\D/g, '');
  if (clean.length !== 6) {
    return { session: null, error: 'Enter the 6-digit code from your authenticator app.' };
  }

  const result = await postAuth(
    `/auth/v1/factors/${factorId}/verify`,
    { challenge_id: challengeId, code: clean },
    { token: pendingToken },
  );
  if (!result.ok) {
    return { session: null, error: friendlyAuthError(result.status, result.payload) };
  }

  const session = sessionFromPayload(result.payload);
  if (!session) {
    return { session: null, error: 'The verification response was incomplete. Try again.' };
  }
  if (session.aal !== 'aal2') {
    // Defensive: never treat a session as verified when the token says otherwise.
    return { session: null, error: 'Two-factor verification did not complete. Try again.' };
  }
  return { session };
}

/** Ends the Supabase Auth session so a copied refresh token stops working. */
export async function signOutRemote(accessToken: string | null): Promise<void> {
  if (!accessToken) return;
  const config = authConfig();
  try {
    await fetch(`${config.url}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    /* The token expires on its own; a failed logout must not trap the user. */
  }
}
