import React, { useState } from 'react';
import { Check, CheckCheck, Flag, X } from 'lucide-react';
import type { ResolveFlag } from '../lib/reportsApi';
import { reportDate } from '../lib/admin';

interface Props {
  flags: ResolveFlag[];
  onDecision: (id: string, decision: 'accepted' | 'ignored') => void;
}

/** Resident "resolved" requests wait here until an admin accepts or ignores them. */
export function AdminResolveRequests({ flags, onDecision }: Props) {
  const [busy, setBusy] = useState('');
  const pending = flags.filter((flag) => flag.status === 'pending');
  const handled = flags.filter((flag) => flag.status !== 'pending').slice(0, 12);

  const decide = (id: string, decision: 'accepted' | 'ignored') => {
    setBusy(id);
    try {
      onDecision(id, decision);
    } finally {
      window.setTimeout(() => setBusy(''), 600);
    }
  };

  return (
    <div className="sj-admin-flags">
      <section className="sj-admin-flag-card" aria-labelledby="sj-flags-pending">
        <div className="sj-admin-section-header">
          <div>
            <h3 id="sj-flags-pending">
              <Flag size={18} />
              Resolve requests
            </h3>
            <p>Residents flagged these incidents as resolved. The map only changes after you decide.</p>
          </div>
          <span className="sj-admin-flag-count">{pending.length} waiting</span>
        </div>
        {pending.length ? (
          <ul className="sj-admin-flag-list">
            {pending.map((flag) => (
              <li key={flag.id} className="sj-admin-flag-item">
                <div>
                  <strong>{flag.title}</strong>
                  {flag.note && <p>“{flag.note}”</p>}
                  <small>Requested {reportDate(flag.createdAt)}</small>
                </div>
                <div className="sj-admin-flag-actions">
                  <button
                    type="button"
                    className="sj-admin-button sj-admin-button-primary"
                    disabled={busy === flag.id}
                    onClick={() => decide(flag.id, 'accepted')}
                  >
                    <Check size={15} />
                    Accept &amp; resolve
                  </button>
                  <button
                    type="button"
                    className="sj-admin-button sj-admin-button-quiet"
                    disabled={busy === flag.id}
                    onClick={() => decide(flag.id, 'ignored')}
                  >
                    <X size={15} />
                    Ignore
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="sj-admin-flags-empty">
            <span>
              <CheckCheck size={24} />
            </span>
            <strong>No resolve requests waiting</strong>
            <p>New resident requests will appear here for review.</p>
          </div>
        )}
      </section>

      {handled.length > 0 && (
        <section className="sj-admin-flag-card" aria-labelledby="sj-flags-handled">
          <div className="sj-admin-section-header">
            <div>
              <h3 id="sj-flags-handled">Recently handled</h3>
              <p>Kept for reference. The full audit trail lives in History.</p>
            </div>
          </div>
          <ul className="sj-admin-flag-list">
            {handled.map((flag) => (
              <li key={flag.id} className="sj-admin-flag-item is-handled">
                <div>
                  <strong>{flag.title}</strong>
                  <small>
                    {flag.status === 'accepted' ? 'Accepted' : 'Ignored'}
                    {flag.reviewedAt ? ` · ${reportDate(flag.reviewedAt)}` : ''}
                  </small>
                </div>
                <span className={`sj-admin-flag-status is-${flag.status}`}>
                  {flag.status === 'accepted' ? 'Resolved' : 'Ignored'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
