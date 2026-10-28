import React from 'react';
import { Eye, EyeOff, Info } from 'lucide-react';
import type { HazardType } from '../types';
import { HAZARD_TYPES, TYPE_LABELS } from '../lib/reportsApi';

interface Props {
  hiddenTypes: HazardType[];
  onToggle: (type: HazardType) => void;
}

/** One-tap category hiding for the public map and incident feeds. */
export function AdminFeedVisibility({ hiddenTypes, onToggle }: Props) {
  return (
    <section className="sj-admin-feed-visibility" aria-labelledby="sj-visibility-title">
      <div className="sj-admin-feed-visibility-head">
        <div>
          <h3 id="sj-visibility-title">
            <Eye size={17} />
            Incident feed visibility
          </h3>
          <p>Hide a whole hazard category from the public map and incident feed, or bring it back.</p>
        </div>
        <span className="sj-admin-feed-visibility-state">
          {hiddenTypes.length ? `${hiddenTypes.length} hidden` : 'All categories visible'}
        </span>
      </div>
      <div className="sj-admin-feed-visibility-grid">
        {HAZARD_TYPES.map((type) => {
          const hidden = hiddenTypes.includes(type);
          return (
            <button
              key={type}
              type="button"
              aria-pressed={hidden}
              aria-label={`${hidden ? 'Show' : 'Hide'} ${TYPE_LABELS[type]} in public feeds`}
              className={`sj-admin-feed-visibility-chip ${hidden ? 'is-hidden' : ''}`}
              onClick={() => onToggle(type)}
            >
              {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
              <span>{TYPE_LABELS[type]}</span>
              <b>{hidden ? 'Hidden' : 'Visible'}</b>
            </button>
          );
        })}
      </div>
      <p className="sj-admin-feed-visibility-note">
        <Info size={14} />
        Hidden incidents stay in the archive and admin list; only public views change. The live PAGASA flood
        pin follows the Flood category.
      </p>
    </section>
  );
}
