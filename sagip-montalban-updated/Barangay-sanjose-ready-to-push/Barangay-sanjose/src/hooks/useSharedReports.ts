import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { HazardAlert, HazardDraft, HazardType } from '../types';
import type { AdminChange, ReportAction } from '../lib/admin';
import {
  buildAdminCredential,
  changeReportRemote,
  createReportRemote,
  fetchAdminBundle,
  fetchPublicFeed,
  JWT_CREDENTIAL,
  loginAdmin,
  reportClient,
  reviewFlagRemote,
  setHiddenTypesRemote,
  submitReportRemote,
  submitResolveFlag,
  type AdminBundle,
  type ResolveFlag,
} from '../lib/reportsApi';
import {
  AdminSessionExpiredError,
  PROXY_CREDENTIAL,
  adminProxyEnabled,
  getAdminAccessToken,
  proxyLogin,
  proxyLoginWithToken,
  proxyLogout,
  setAdminAccessToken,
} from '../lib/adminProxy';
import { signInWithPassword, signOutRemote, verifyTotp } from '../lib/adminMfa';

const FEED_CACHE = 'san-jose-public-feed-v1';
const ADMIN_CACHE = 'san-jose-admin-bundle-v1';
const POLL_MS = 45000;

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* A full cache must never break live data. */
  }
}

/**
 * Wipes the cached admin bundle. It holds reporter contact numbers and email
 * addresses, so it must never outlive the session that read it.
 */
export function clearAdminCache() {
  try {
    localStorage.removeItem(ADMIN_CACHE);
  } catch {
    /* nothing cached */
  }
}

interface FeedState {
  reports: HazardAlert[];
  hiddenTypes: HazardType[];
}

/**
 * The public feed is server-backed: accepted, non-archived incidents that are
 * not hidden by the admin. Realtime changes refresh it instantly; a slow poll
 * and the last synced copy keep it useful when the network drops.
 */
export function usePublicFeed() {
  const cached = useMemo(() => readCache<FeedState>(FEED_CACHE), []);
  const [feed, setFeed] = useState<FeedState>(cached ?? { reports: [], hiddenTypes: [] });
  const [status, setStatus] = useState<'loading' | 'live' | 'offline'>(cached ? 'live' : 'loading');
  const [error, setError] = useState('');
  const clientRef = useRef<SupabaseClient | null>(null);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const client = clientRef.current ?? (await reportClient());
      clientRef.current = client;
      const next = await fetchPublicFeed(client);
      if (!alive.current) return;
      setFeed(next);
      writeCache(FEED_CACHE, next);
      setStatus('live');
      setError('');
    } catch {
      if (!alive.current) return;
      setStatus((previous) => (previous === 'live' ? 'offline' : cached ? 'live' : 'offline'));
      setError('Live incident data is temporarily unavailable. Showing the last synced incidents.');
    }
  }, [cached]);

  useEffect(() => {
    alive.current = true;
    let stop: (() => void) | undefined;
    let poll: number | undefined;
    void (async () => {
      await refresh();
      const client = clientRef.current;
      if (!client || !alive.current) return;
      const channel = client
        .channel(`public-hazards-${Math.random().toString(36).slice(2)}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'hazard_reports' },
          () => void refresh(),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'feed_settings' },
          () => void refresh(),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'resolve_flags' },
          () => void refresh(),
        )
        .subscribe();
      stop = () => void client.removeChannel(channel);
      poll = window.setInterval(() => void refresh(), POLL_MS);
    })();
    return () => {
      alive.current = false;
      stop?.();
      if (poll) window.clearInterval(poll);
    };
  }, [refresh]);

  const submit = useCallback(
    async (draft: HazardDraft) => {
      const client = clientRef.current ?? (await reportClient());
      clientRef.current = client;
      const loadId = crypto.randomUUID();
      const id = await submitReportRemote(client, draft, loadId);
      await refresh();
      return id;
    },
    [refresh],
  );

  const flagResolved = useCallback(
    async (reportId: string, note: string) => {
      const client = clientRef.current ?? (await reportClient());
      clientRef.current = client;
      await submitResolveFlag(client, reportId, note);
      await refresh();
    },
    [refresh],
  );

  return {
    reports: feed.reports,
    hiddenTypes: feed.hiddenTypes,
    status,
    error,
    refresh,
    submit,
    flagResolved,
  };
}

interface WorkspaceState extends AdminBundle {
  loading: boolean;
  error: string;
}

const EMPTY: AdminBundle = { reports: [], history: [], flags: [], hiddenTypes: [] };

/** Admin data lives on the server too, so moderation changes reach every visitor. */
export function useAdminWorkspace(password: string | null, onExpired?: () => void) {
  const cached = useMemo(() => readCache<AdminBundle>(ADMIN_CACHE), []);
  const [state, setState] = useState<WorkspaceState>({
    ...(cached ?? EMPTY),
    loading: !!password,
    error: '',
  });
  const clientRef = useRef<SupabaseClient | null>(null);
  const alive = useRef(true);

  // A new credential means a new client: a cached one may still carry the
  // previous session's access token, and a signed-out one must not be reused.
  useEffect(() => {
    clientRef.current = null;
  }, [password]);

  const refresh = useCallback(async () => {
    if (!password) return;
    try {
      const client = clientRef.current ?? (await reportClient());
      clientRef.current = client;
      const bundle = await fetchAdminBundle(client, password);
      if (!alive.current) return;
      setState({ ...bundle, loading: false, error: '' });
      writeCache(ADMIN_CACHE, bundle);
    } catch (cause) {
      if (!alive.current) return;
      if (cause instanceof AdminSessionExpiredError) {
        // The signed cookie ran out: drop the in-memory credential and data.
        clearAdminCache();
        onExpired?.();
      }
      setState((previous) => ({
        ...previous,
        loading: false,
        error: cause instanceof Error ? cause.message : 'Could not load the admin workspace.',
      }));
    }
  }, [password, onExpired]);

  useEffect(() => {
    alive.current = true;
    if (!password) {
      setState({ ...EMPTY, loading: false, error: '' });
      return;
    }
    setState((previous) => ({ ...previous, loading: true }));
    let stop: (() => void) | undefined;
    let poll: number | undefined;
    void (async () => {
      await refresh();
      const client = clientRef.current;
      if (!client || !alive.current) return;
      const channel = client
        .channel(`admin-workspace-${Math.random().toString(36).slice(2)}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'hazard_reports' },
          () => void refresh(),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'resolve_flags' },
          () => void refresh(),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'feed_settings' },
          () => void refresh(),
        )
        .subscribe();
      stop = () => void client.removeChannel(channel);
      poll = window.setInterval(() => void refresh(), POLL_MS);
    })();
    return () => {
      alive.current = false;
      stop?.();
      if (poll) window.clearInterval(poll);
    };
  }, [password, refresh]);

  const change = useCallback(
    async (id: string, update: AdminChange) => {
      if (!password) throw new Error('Sign in again to continue.');
      const client = clientRef.current ?? (await reportClient());
      clientRef.current = client;
      await changeReportRemote(client, password, id, update);
      await refresh();
    },
    [password, refresh],
  );

  const create = useCallback(
    async (draft: HazardDraft) => {
      if (!password) throw new Error('Sign in again to continue.');
      const client = clientRef.current ?? (await reportClient());
      clientRef.current = client;
      const report = await createReportRemote(client, password, draft);
      await refresh();
      return report;
    },
    [password, refresh],
  );

  const setHiddenTypes = useCallback(
    async (types: HazardType[]) => {
      if (!password) throw new Error('Sign in again to continue.');
      const client = clientRef.current ?? (await reportClient());
      clientRef.current = client;
      await setHiddenTypesRemote(client, password, types);
      await refresh();
    },
    [password, refresh],
  );

  const reviewFlag = useCallback(
    async (flagId: string, decision: 'accepted' | 'ignored') => {
      if (!password) throw new Error('Sign in again to continue.');
      const client = clientRef.current ?? (await reportClient());
      clientRef.current = client;
      await reviewFlagRemote(client, password, flagId, decision);
      await refresh();
    },
    [password, refresh],
  );

  return { ...state, refresh, change, create, setHiddenTypes, reviewFlag };
}

export interface AdminSignInResult {
  ok: boolean;
  /** Value the app keeps in memory: a sentinel, or the legacy `email:password`. */
  credential: string | null;
  error?: string;
  /** The password was right but the 6-digit code is still needed. */
  mfaRequired?: boolean;
}

interface PendingMfa {
  factorId: string;
  challengeId: string;
  pendingToken: string;
}

/**
 * The challenged-but-unverified session, held in memory for the few seconds
 * between the password step and the code step. It is never persisted.
 */
let pendingMfa: PendingMfa | null = null;

function discardPendingMfa(): void {
  pendingMfa = null;
}

/**
 * Turns a verified Supabase Auth session into an app credential.
 *
 * Behind the Pages Function the session cookie is what the app needs, so the
 * token is sent once to /api/admin/login. Without the Function the token rides
 * along on every request instead. Either way the token stays in memory.
 */
async function adoptAuthToken(accessToken: string): Promise<AdminSignInResult> {
  setAdminAccessToken(accessToken);
  if (await adminProxyEnabled()) {
    const result = await proxyLoginWithToken();
    if (result.ok) {
      discardPendingMfa();
      return { ok: true, credential: PROXY_CREDENTIAL };
    }
    setAdminAccessToken(null);
    return {
      ok: false,
      credential: null,
      error: result.error ?? 'The server could not start an admin session. Try again.',
    };
  }
  discardPendingMfa();
  return { ok: true, credential: JWT_CREDENTIAL };
}

/**
 * Signs in.
 *
 * Step 1 of the new flow: Supabase Auth. When the account has an authenticator
 * enrolled, the password alone is not enough and this returns
 * `mfaRequired: true`; finish with `verifyAdminMfa()`.
 *
 * The legacy password still works during the transition, so a deployment that
 * has not created the Auth user yet keeps working. It is tried only after
 * Supabase Auth says the credentials are wrong — a missing second factor never
 * falls back, which is what stops a password from skipping MFA.
 */
export async function signInAdmin(email: string, password: string): Promise<AdminSignInResult> {
  discardPendingMfa();

  const attempt = await signInWithPassword(email, password);

  if (attempt.mfaRequired && attempt.factorId && attempt.challengeId && attempt.pendingToken) {
    pendingMfa = {
      factorId: attempt.factorId,
      challengeId: attempt.challengeId,
      pendingToken: attempt.pendingToken,
    };
    return { ok: false, credential: null, mfaRequired: true };
  }

  if (attempt.session) {
    return adoptAuthToken(attempt.session.accessToken);
  }

  // A rate limit or an outage is not a wrong password: report it as-is instead
  // of quietly retrying against the legacy path.
  if (attempt.error && !attempt.error.startsWith('That email or password')) {
    return { ok: false, credential: null, error: attempt.error };
  }

  if (await adminProxyEnabled()) {
    const result = await proxyLogin(email, password);
    return {
      ok: result.ok,
      credential: result.ok ? PROXY_CREDENTIAL : null,
      error: result.error ?? (result.ok ? undefined : attempt.error),
    };
  }

  const client = await reportClient();
  const ok = await loginAdmin(client, email, password);
  return { ok, credential: ok ? buildAdminCredential(email, password) : null, error: ok ? undefined : attempt.error };
}

/** Step 2: the 6-digit code. Produces the session the database will accept. */
export async function verifyAdminMfa(code: string): Promise<AdminSignInResult> {
  if (!pendingMfa) {
    return {
      ok: false,
      credential: null,
      error: 'Your sign-in expired. Enter your email and password again.',
    };
  }
  const { factorId, challengeId, pendingToken } = pendingMfa;
  const result = await verifyTotp(factorId, challengeId, code, pendingToken);
  if (!result.session) {
    return { ok: false, credential: null, error: result.error ?? 'That code is not valid.' };
  }
  return adoptAuthToken(result.session.accessToken);
}

/** True while a code is expected, so the UI can restore the right step. */
export function adminMfaPending(): boolean {
  return pendingMfa !== null;
}

/** Ends the session and removes every trace of admin data from this device. */
export async function signOutAdmin(credential: string | null): Promise<void> {
  discardPendingMfa();
  const token = getAdminAccessToken();
  setAdminAccessToken(null);
  if (token) await signOutRemote(token);
  if (credential === PROXY_CREDENTIAL) await proxyLogout();
  clearAdminCache();
}

export type { ReportAction, ResolveFlag };
