import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Info } from 'lucide-react';
import { readVisits, VISIT_EVENT, VISIT_KEY, VISIT_BASELINE, VisitReading } from '../lib/visits';
import {
  getVisitClient,
  readSharedVisits,
  readVisitConfig,
  SITE_VISITS_BASELINE,
  SITE_VISITS_EVENT,
  SharedVisitSnapshot,
  watchSharedVisits,
} from '../lib/siteVisits';

const POLL_MS = 15000;

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function elapsedLabel(updatedAt: string | undefined, now: number) {
  const stamp = updatedAt ? Date.parse(updatedAt) : NaN;
  if (!Number.isFinite(stamp)) return 'Waiting for the first visit';
  const seconds = Math.max(0, Math.floor((now - stamp) / 1000));
  if (seconds < 5) return 'Updated just now';
  if (seconds < 60) return `Updated ${seconds}s ago`;
  if (seconds < 3600) return `Updated ${Math.floor(seconds / 60)}m ago`;
  return `Updated ${Math.floor(seconds / 3600)}h ago`;
}

export function VisitsMonitor() {
  const config = useMemo(() => readVisitConfig(), []);
  const shared = Boolean(config);
  const [status, setStatus] = useState<'connecting' | 'live' | 'offline'>(shared ? 'connecting' : 'live');
  const [snapshot, setSnapshot] = useState<SharedVisitSnapshot>({ total: SITE_VISITS_BASELINE });
  const [local, setLocal] = useState<VisitReading>(() => {
    try {
      return readVisits(localStorage);
    } catch {
      return { total: VISIT_BASELINE, additional: 0, error: 'Visit storage is unavailable.' };
    }
  });
  const [error, setError] = useState('');
  const now = useNow(shared);
  const active = shared ? status !== 'offline' : true;

  useEffect(() => {
    if (!shared) {
      const update = () => {
        try {
          setLocal(readVisits(localStorage));
        } catch {
          setLocal({ total: VISIT_BASELINE, additional: 0, error: 'Visits storage is unavailable.' });
        }
      };
      const sameTab = (event: Event) => setLocal((event as CustomEvent<VisitReading>).detail);
      const otherTab = (event: StorageEvent) => {
        if (event.key === VISIT_KEY || event.key === null) update();
      };
      window.addEventListener(VISIT_EVENT, sameTab);
      window.addEventListener('storage', otherTab);
      update();
      return () => {
        window.removeEventListener(VISIT_EVENT, sameTab);
        window.removeEventListener('storage', otherTab);
      };
    }

    let cancelled = false;
    let stopWatch: (() => void) | undefined;
    let poll: number | undefined;
    const handleShared = (event: Event) => {
      const detail = (event as CustomEvent<SharedVisitSnapshot>).detail;
      if (detail && Number.isFinite(detail.total)) {
        setSnapshot(detail);
        setStatus('live');
        setError('');
      }
    };
    window.addEventListener(SITE_VISITS_EVENT, handleShared);

    void (async () => {
      try {
        const client = await getVisitClient(config!);
        if (cancelled) return;
        const load = async () => {
          try {
            const next = await readSharedVisits(client);
            if (cancelled) return;
            setSnapshot(next);
            setStatus('live');
            setError('');
          } catch {
            if (!cancelled) {
              setStatus('offline');
              setError('Live sync is temporarily unavailable. Retrying automatically.');
            }
          }
        };
        await load();
        if (cancelled) return;
        stopWatch = watchSharedVisits(
          client,
          (next) => {
            setSnapshot(next);
            setStatus('live');
            setError('');
          },
          (next) => {
            if (next === 'subscribed') setStatus('live');
          },
        );
        poll = window.setInterval(() => void load(), POLL_MS);
      } catch {
        if (!cancelled) {
          setStatus('offline');
          setError('Live sync could not start. Retrying automatically.');
        }
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener(SITE_VISITS_EVENT, handleShared);
      if (poll) window.clearInterval(poll);
      stopWatch?.();
    };
  }, [shared, config]);

  const total = shared ? snapshot.total : local.total;
  const badge = !shared
    ? 'This browser'
    : status === 'live'
      ? 'Live · all visitors'
      : status === 'connecting'
        ? 'Connecting…'
        : 'Reconnecting…';

  return (
    <section className="sj-admin-visits" aria-label="Visits monitoring">
      <span className="sj-admin-visits-icon">
        <BarChart3 size={25} />
      </span>
      <div>
        <span className="sj-admin-visits-label">
          Realtime visits{' '}
          <b className={shared && status === 'live' ? 'is-live' : ''}>
            <Activity size={11} />
            {badge}
          </b>
        </span>
        <strong data-testid="visits-total">{total.toLocaleString('en-US')}</strong>
        <p>
          {shared ? (
            <>
              Shared total across every visit to this website
              <span className="sj-admin-visits-pulse" aria-live="polite">
                {elapsedLabel(snapshot.updatedAt, now)}
              </span>
            </>
          ) : (
            <>
              {SITE_VISITS_BASELINE.toLocaleString('en-US')} starting count +{' '}
              {local.additional.toLocaleString('en-US')} page loads in this browser
            </>
          )}
        </p>
      </div>
      <div className="sj-admin-visits-note">
        <Info size={15} />
        <span>
          {shared
            ? 'Each visit on any device adds one, and the dashboard updates instantly. Counts page loads, not unique people.'
            : 'Live sync is off, so this counts only page loads on this device. Run the Supabase SQL to share it with every visitor.'}
          {error && <em>{error}</em>}
          {!shared && local.error && <em>{local.error}</em>}
        </span>
      </div>
    </section>
  );
}
