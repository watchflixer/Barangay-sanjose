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
  proxyLogin,
  proxyLogout,
} from '../lib/adminProxy';

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
  /** Value the app keeps in memory: the proxy sentinel, or `email:password`. */
  credential: string | null;
  error?: string;
}

/**
 * Signs in through the Cloudflare Function when the site is deployed with it,
 * so the browser never stores (or transmits) the admin credential. Local dev
 * without Functions falls back to verifying against Supabase directly.
 */
export async function signInAdmin(email: string, password: string): Promise<AdminSignInResult> {
  if (await adminProxyEnabled()) {
    const result = await proxyLogin(email, password);
    return {
      ok: result.ok,
      credential: result.ok ? PROXY_CREDENTIAL : null,
      error: result.error,
    };
  }
  const client = await reportClient();
  const ok = await loginAdmin(client, email, password);
  return { ok, credential: ok ? buildAdminCredential(email, password) : null };
}

/** Ends the session and removes every trace of admin data from this device. */
export async function signOutAdmin(credential: string | null): Promise<void> {
  if (credential === PROXY_CREDENTIAL) await proxyLogout();
  clearAdminCache();
}

export type { ReportAction, ResolveFlag };
