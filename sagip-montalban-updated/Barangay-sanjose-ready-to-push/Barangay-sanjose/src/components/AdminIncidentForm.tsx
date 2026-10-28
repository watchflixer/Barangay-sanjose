import React, { useRef, useState } from 'react';
import { ArrowLeft, Check, MapPin, Plus } from 'lucide-react';
import type { HazardAlert, HazardDraft, HazardSeverity, HazardStatus, HazardType } from '../types';
import { validateHazardDraft } from '../lib/admin';
import { SAN_JOSE_SITIOS } from '../data/geoData';

export function AdminIncidentForm({
  onCreate,
  onCancel,
  onCreated,
}: {
  onCreate: (draft: HazardDraft) => HazardAlert | undefined;
  onCancel: () => void;
  onCreated: (report: HazardAlert) => void;
}) {
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const [draft, setDraft] = useState<HazardDraft>({
    title: '',
    type: 'flood',
    severity: 'high',
    status: 'active',
    streetName: '',
    sitio: 'San Jose',
    coordinates: [14.743, 121.133],
    description: '',
    reportedBy: 'Barangay administrator',
    reporterEmail: '',
    contactNumber: '',
  });
  const field = (
    label: string,
    key: 'title' | 'streetName' | 'sitio' | 'reportedBy' | 'reporterEmail' | 'contactNumber',
    required = false,
    type = 'text',
  ) => (
    <label>
      <span>
        {label}
        {required ? ' *' : ''}
      </span>
      <input
        name={key}
        type={type}
        required={required}
        maxLength={key === 'title' ? 200 : 250}
        value={draft[key] || ''}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
      />
    </label>
  );
  return (
    <section className="sj-admin-card sj-admin-create" aria-labelledby="sj-create-title">
      <div className="sj-admin-section-header">
        <div>
          <h3 id="sj-create-title">
            <Plus size={18} />
            Add incident
          </h3>
          <p>Publish an official hazard directly to the Streets hazard map.</p>
        </div>
        <button type="button" className="sj-admin-button sj-admin-button-quiet" onClick={onCancel}>
          <ArrowLeft size={14} />
          Back
        </button>
      </div>
      <form
        className="sj-admin-create-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (submitting.current) return;
          const validation = validateHazardDraft(draft);
          if (validation) {
            setError(validation);
            return;
          }
          submitting.current = true;
          try {
            const report = onCreate(draft);
            if (report) onCreated(report);
            else {
              setError('Admin access is required. Sign in again.');
              submitting.current = false;
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create incident.');
            submitting.current = false;
          }
        }}
      >
        <div className="sj-admin-create-notice">
          <Check size={17} />
          <p>
            Admin-created incidents are accepted and published immediately. Reporter name stays hidden by
            default. Contact fields are optional and are never displayed in public views.
          </p>
        </div>
        <h4>Incident information</h4>
        <div className="sj-admin-create-grid">
          <div className="sj-admin-create-wide">{field('Incident title', 'title', true)}</div>
          <label>
            <span>Hazard type</span>
            <select
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as HazardType })}
            >
              {['flood', 'fire', 'power', 'streetlight', 'water', 'road'].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Severity</span>
            <select
              value={draft.severity}
              onChange={(e) => setDraft({ ...draft, severity: e.target.value as HazardSeverity })}
            >
              {['critical', 'high', 'moderate', 'low'].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Initial status</span>
            <select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as HazardStatus })}
            >
              {['active', 'monitoring', 'resolved'].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="sj-admin-create-wide">
            <span>Description *</span>
            <textarea
              required
              maxLength={5000}
              rows={4}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>
        </div>
        <h4>
          <MapPin size={16} />
          Location
        </h4>
        <div className="sj-admin-create-grid">
          <label className="sj-admin-create-wide">
            <span>Sitio preset (moves the map pin)</span>
            <select
              value={
                SAN_JOSE_SITIOS.find(
                  (s) =>
                    s.coordinates[0] === draft.coordinates[0] && s.coordinates[1] === draft.coordinates[1],
                )?.name || 'custom'
              }
              onChange={(e) => {
                const sitio = SAN_JOSE_SITIOS.find((s) => s.name === e.target.value);
                if (sitio) setDraft({ ...draft, coordinates: sitio.coordinates, sitio: sitio.zone });
              }}
            >
              <option value="custom">Custom coordinates</option>
              {SAN_JOSE_SITIOS.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          {field('Street / landmark', 'streetName', true)}
          {field('Sitio / area', 'sitio', true)}
          <label>
            <span>Latitude *</span>
            <input
              required
              type="number"
              step="any"
              min="-90"
              max="90"
              value={Number.isNaN(draft.coordinates[0]) ? '' : draft.coordinates[0]}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  coordinates: [e.target.value === '' ? NaN : Number(e.target.value), draft.coordinates[1]],
                })
              }
            />
          </label>
          <label>
            <span>Longitude *</span>
            <input
              required
              type="number"
              step="any"
              min="-180"
              max="180"
              value={Number.isNaN(draft.coordinates[1]) ? '' : draft.coordinates[1]}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  coordinates: [draft.coordinates[0], e.target.value === '' ? NaN : Number(e.target.value)],
                })
              }
            />
          </label>
        </div>
        <p className="sj-admin-form-note">
          Coordinates start near San Jose. Verify the exact location before publishing; coordinates outside
          the barangay may be outside the map’s locked view.
        </p>
        <h4>
          Reporter information <small>Optional contacts · Admin view only</small>
        </h4>
        <div className="sj-admin-create-grid">
          {field('Full name / organization', 'reportedBy')}
          {field('Email', 'reporterEmail', false, 'email')}
          {field('Cellphone number', 'contactNumber', false, 'tel')}
        </div>
        {error && (
          <p role="alert" className="sj-admin-storage-error">
            {error}
          </p>
        )}
        <div className="sj-admin-create-actions">
          <button type="button" className="sj-admin-button sj-admin-button-quiet" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="sj-admin-button sj-admin-button-primary">
            <Plus size={16} />
            Publish incident
          </button>
        </div>
      </form>
    </section>
  );
}
