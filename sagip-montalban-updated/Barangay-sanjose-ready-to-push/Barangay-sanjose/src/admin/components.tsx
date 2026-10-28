import { AlertTriangle, CheckCircle2, Clock3, Droplets, Eye, Flame, Lightbulb, MapPin, MoreHorizontal, Pencil, Phone, Trash2, UserRound, Waves, Zap, type LucideIcon } from 'lucide-react';
import { relativeTime } from './time';
import type { HazardType } from '../types';
import type { ManagedHazard, MapDisplaySettings } from './types';

export const HAZARD_TYPES: { id: HazardType; label: string; short: string; icon: LucideIcon; color: string; bg: string }[] = [
  { id: 'flood', label: 'Flooding', short: 'Flood', icon: Waves, color: '#2777c8', bg: '#e8f3ff' },
  { id: 'fire', label: 'Fire incidents', short: 'Fire', icon: Flame, color: '#df6a51', bg: '#fff0ec' },
  { id: 'power', label: 'Power outage', short: 'Power', icon: Zap, color: '#b88617', bg: '#fff6dc' },
  { id: 'road', label: 'Road hazards', short: 'Road', icon: AlertTriangle, color: '#d47a43', bg: '#fff2e8' },
  { id: 'water', label: 'Water interruption', short: 'Water', icon: Droplets, color: '#278e91', bg: '#e7f7f6' },
  { id: 'streetlight', label: 'Streetlight', short: 'Streetlight', icon: Lightbulb, color: '#8169a8', bg: '#f1ecf9' },
];

export function TypeIcon({ type, size = 18 }: { type: HazardType; size?: number }) {
  const item = HAZARD_TYPES.find(item => item.id === type) || HAZARD_TYPES[0];
  const Icon = item.icon;
  return <span className="type-icon" style={{ backgroundColor: item.bg, color: item.color }}><Icon size={size} strokeWidth={1.9} /></span>;
}

export function Switch({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className={`switch ${checked ? 'is-on' : ''}`}><span /></button>;
}

export function StatusChip({ status }: { status: ManagedHazard['status'] | ManagedHazard['visibility'] | string }) {
  const label = status === 'published' ? 'Published' : status === 'pending' ? 'Pending review' : status === 'hidden' ? 'Hidden' : status.charAt(0).toUpperCase() + status.slice(1);
  return <span className={`status-chip status-${status.toLowerCase()}`}><i />{label}</span>;
}

export function LayerControls({ map, hazards, onToggle, busy = false, showExtra = true }: {
  map: MapDisplaySettings; hazards: ManagedHazard[]; onToggle: (map: MapDisplaySettings) => void; busy?: boolean; showExtra?: boolean;
}) {
  return <div className="layer-list">
    {HAZARD_TYPES.map(item => {
      const count = hazards.filter(hazard => hazard.visibility === 'published' && hazard.type === item.id && (map.showResolved || hazard.status !== 'resolved')).length;
      return <div className="layer-row" key={item.id}>
        <TypeIcon type={item.id} size={16} />
        <div className="layer-name"><strong>{item.label}</strong><span>{count} {count === 1 ? 'pin' : 'pins'} published</span></div>
        <Switch checked={map.types[item.id]} label={`Show ${item.label} on public map`} disabled={busy} onChange={value => onToggle({ ...map, types: { ...map.types, [item.id]: value } })} />
      </div>;
    })}
    {showExtra && <div className="layer-note"><Eye size={14} /> Changes apply to the public hazard map.</div>}
  </div>;
}

export function IncidentTable({ hazards, map, onEdit, onVisibility, onDelete, busy = false, compact = false }: {
  hazards: ManagedHazard[]; map: MapDisplaySettings; onEdit: (hazard: ManagedHazard) => void;
  onVisibility: (hazard: ManagedHazard) => void; onDelete?: (hazard: ManagedHazard) => void; busy?: boolean; compact?: boolean;
}) {
  if (!hazards.length) return <div className="empty-state"><div className="empty-icon"><CheckCircle2 size={22} /></div><strong>No incidents to show</strong><span>New reports and incidents will appear here.</span></div>;
  return <div className="table-scroll"><table className={`data-table ${compact ? 'compact-table' : ''}`}>
    <thead><tr><th>INCIDENT</th><th>LOCATION</th><th>REPORTER</th><th>STATUS</th><th>MAP DISPLAY</th><th aria-label="Actions" /></tr></thead>
    <tbody>{hazards.map(hazard => {
      const displayed = hazard.visibility === 'published' && map.types[hazard.type] && (map.showResolved || hazard.status !== 'resolved');
      return <tr key={hazard.id}>
        <td><button type="button" className="incident-cell" onClick={() => onEdit(hazard)}>
          <TypeIcon type={hazard.type} />
          <span><strong>{hazard.title}</strong><small>{HAZARD_TYPES.find(type => type.id === hazard.type)?.short} · {hazard.timeReported || 'Reported'}</small></span>
        </button></td>
        <td><span className="location-cell"><MapPin size={14} /><span>{hazard.streetName}<small>{hazard.sitio}</small></span></span></td>
        <td><span className="reporter-cell" title={`${hazard.reportedBy} · ${hazard.reporterEmail || 'walang email'}`}>
          <span className="reporter-avatar">{(hazard.reportedBy || '?').trim().charAt(0).toUpperCase()}</span>
          <span><strong>{hazard.reportedBy || 'Hindi kilala'}</strong><small>{relativeTime(hazard.createdAt || hazard.timeReported)}</small></span>
        </span></td>
        <td><StatusChip status={hazard.visibility === 'pending' ? 'pending' : hazard.status} /></td>
        <td><span className={`display-indicator ${displayed ? 'is-visible' : ''}`}><i />{displayed ? 'Visible' : hazard.visibility === 'pending' ? 'For review' : 'Not visible'}</span></td>
        <td><div className="row-actions">
          <button type="button" className="icon-button" title={hazard.visibility === 'pending' ? 'Review report' : 'Edit incident'} aria-label={`${hazard.visibility === 'pending' ? 'Review' : 'Edit'} ${hazard.title}`} onClick={() => onEdit(hazard)}>{hazard.visibility === 'pending' ? <MoreHorizontal size={17} /> : <Pencil size={15} />}</button>
          {!compact && <button type="button" className="icon-button" disabled={busy} title={hazard.visibility === 'published' ? 'Hide from map' : 'Publish on map'} aria-label={`${hazard.visibility === 'published' ? 'Hide' : 'Publish'} ${hazard.title}`} onClick={() => onVisibility(hazard)}><Eye size={16} /></button>}
          {!compact && onDelete && <button type="button" className="icon-button danger" disabled={busy} title="Delete incident" aria-label={`Delete ${hazard.title}`} onClick={() => onDelete(hazard)}><Trash2 size={15} /></button>}
        </div></td>
      </tr>;
    })}</tbody>
  </table></div>;
}

export function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });
}

export function LoadingState({ label = 'Loading workspace…' }: { label?: string }) {
  return <div className="empty-state"><div className="empty-icon"><Clock3 size={21} /></div><strong>{label}</strong><span>Please wait a moment.</span></div>;
}
