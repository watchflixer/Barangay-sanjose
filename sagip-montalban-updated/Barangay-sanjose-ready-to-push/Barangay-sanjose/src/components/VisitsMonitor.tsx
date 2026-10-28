import React, { useEffect, useState } from 'react';
import { Activity, BarChart3, Info } from 'lucide-react';
import {
  readVisits,
  startVisitTracking,
  VISIT_EVENT,
  VISIT_KEY,
  VisitReading,
  VISIT_BASELINE,
} from '../lib/visits';

export function VisitsMonitor() {
  const [reading, setReading] = useState<VisitReading>({ total: VISIT_BASELINE, additional: 0 });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let mounted = true;
    const update = () => {
      try {
        setReading(readVisits(localStorage));
      } catch {
        setReading({ total: VISIT_BASELINE, additional: 0, error: 'Visits storage is unavailable.' });
      }
    };
    const sameTab = (event: Event) => setReading((event as CustomEvent<VisitReading>).detail);
    const otherTab = (event: StorageEvent) => {
      if (event.key === VISIT_KEY || event.key === null) update();
    };
    window.addEventListener(VISIT_EVENT, sameTab);
    window.addEventListener('storage', otherTab);
    update();
    startVisitTracking().then(() => {
      if (mounted) update();
    });
    return () => {
      mounted = false;
      window.removeEventListener(VISIT_EVENT, sameTab);
      window.removeEventListener('storage', otherTab);
    };
  }, []);
  const lastVisit = reading.updatedAt ? Date.parse(reading.updatedAt) : NaN;
  const elapsed = Number.isFinite(lastVisit) ? Math.max(0, Math.floor((now - lastVisit) / 1000)) : NaN;
  const liveLabel = Number.isNaN(elapsed)
    ? 'No visit recorded yet'
    : elapsed < 5
      ? 'Updated just now'
      : elapsed < 60
        ? `Updated ${elapsed}s ago`
        : `Updated ${Math.floor(elapsed / 60)}m ago`;
  return (
    <section className="sj-admin-visits" aria-label="Visits monitoring">
      <span className="sj-admin-visits-icon">
        <BarChart3 size={25} />
      </span>
      <div>
        <span className="sj-admin-visits-label">
          Realtime visits{' '}
          <b>
            <Activity size={11} />
            {reading.error ? 'Storage unavailable' : 'Live'}
          </b>
        </span>
        <strong data-testid="visits-total">{reading.total.toLocaleString('en-US')}</strong>
        <p>5,000 starting count + {reading.additional.toLocaleString('en-US')} page loads in this browser</p>
      </div>
      <div className="sj-admin-visits-note">
        <Info size={15} />
        <span>
          Counts each page load on this device and updates instantly across open tabs. It is not a server-wide
          visitor or unique-people total.{reading.error && <em>{reading.error}</em>}
        </span>
      </div>
    </section>
  );
}
