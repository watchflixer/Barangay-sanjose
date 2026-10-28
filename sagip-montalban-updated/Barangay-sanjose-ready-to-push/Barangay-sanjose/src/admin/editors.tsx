import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, ImagePlus, Mail, MapPin, Phone, ShieldCheck, Trash2, UserRound, X } from 'lucide-react';
import { exactTime, relativeTime } from './time';
import type { HazardSeverity, HazardStatus, HazardType, EmergencyContact } from '../types';
import type { EvacuationCenter } from '../data/evacuationCenters';
import { HELP_CENTER_CATEGORIES, type PlaceCategoryId } from '../data/helpCenterPlaces';
import { makeId } from '../services/operationsService';
import { AdminMap } from './AdminMap';
import { HAZARD_TYPES } from './components';
import type { ManagedHazard, ManagedPlace, HazardVisibility } from './types';

function Modal({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="admin-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-header"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><button type="button" className="icon-button close-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>
      {children}
    </section>
  </div>;
}

const defaultIncident = (): ManagedHazard => {
  const now = new Date().toISOString();
  return {
    id: makeId(), type: 'flood', title: '', streetName: '', sitio: '', coordinates: [14.7425, 121.131],
    timeReported: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }),
    status: 'active', severity: 'moderate', description: '', reportedBy: 'Barangay San Jose',
    visibility: 'published', source: 'admin', createdAt: now, updatedAt: now,
  };
};

export function IncidentEditor({ hazard, onClose, onSave, onDelete, busy }: {
  hazard: ManagedHazard | null; onClose: () => void; onSave: (hazard: ManagedHazard) => Promise<boolean>;
  onDelete: (hazard: ManagedHazard) => void; busy: boolean;
}) {
  const [form, setForm] = useState<ManagedHazard>(() => hazard ? { ...hazard } : defaultIncident());
  const [lat, setLat] = useState(String(form.coordinates[0]));
  const [lng, setLng] = useState(String(form.coordinates[1]));
  const [pickMap, setPickMap] = useState(false);
  const [error, setError] = useState('');
  const patch = (values: Partial<ManagedHazard>) => setForm(current => ({ ...current, ...values }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const latitude = Number(lat), longitude = Number(lng);
    if (!lat.trim() || !lng.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 4 || latitude > 22 || longitude < 116 || longitude > 128) {
      setError('Enter valid coordinates within the Philippines.'); return;
    }
    if (!form.title.trim() || !form.streetName.trim() || !form.sitio.trim()) { setError('Add an incident title, street and barangay area.'); return; }
    setError('');
    const ok = await onSave({ ...form, title: form.title.trim(), streetName: form.streetName.trim(), sitio: form.sitio.trim(), coordinates: [latitude, longitude] });
    if (ok) onClose();
  };
  const onPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Use a JPG, PNG or WebP photo under 5 MB.'); return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 960 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        const result = canvas.toDataURL('image/jpeg', 0.72);
        if (result.length > 1_500_000) { setError('The compressed photo is too large. Please choose a smaller image.'); return; }
        patch({ photoUrl: result }); setError('');
      };
      image.onerror = () => setError('Could not read this photo.');
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };
  return <Modal title={hazard ? 'Review incident' : 'Add an incident'} eyebrow="HAZARD STREET MAP" onClose={onClose}>
    <form onSubmit={submit} className="modal-form">
      <p className="form-intro">{hazard?.visibility === 'pending' ? 'Review the details before publishing this report to the public map.' : 'Keep incident information accurate and up to date for the community.'}</p>
      {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}
      <label className="field full"><span>Incident title <b>*</b></span><input required maxLength={140} autoFocus value={form.title} onChange={e => patch({ title: e.target.value })} placeholder="e.g. Flooding along Riverside Drive" /></label>
      <div className="form-grid two">
        <label className="field"><span>Hazard type</span><select value={form.type} onChange={e => patch({ type: e.target.value as HazardType })}>{HAZARD_TYPES.map(type => <option value={type.id} key={type.id}>{type.label}</option>)}</select></label>
        <label className="field"><span>Severity</span><select value={form.severity} onChange={e => patch({ severity: e.target.value as HazardSeverity })}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option><option value="critical">Critical</option></select></label>
        <label className="field"><span>Incident status</span><select value={form.status} onChange={e => patch({ status: e.target.value as HazardStatus })}><option value="active">Active</option><option value="monitoring">Monitoring</option><option value="resolved">Resolved</option></select></label>
        <label className="field"><span>Map visibility</span><select value={form.visibility} onChange={e => patch({ visibility: e.target.value as HazardVisibility })}><option value="pending">Pending review</option><option value="published">Published on map</option><option value="hidden">Hidden from public</option></select></label>
      </div>
      <label className="field full"><span>Street / landmark <b>*</b></span><input required maxLength={200} value={form.streetName} onChange={e => patch({ streetName: e.target.value })} placeholder="Street or nearby landmark" /></label>
      <label className="field full"><span>Sitio / area <b>*</b></span><input required maxLength={200} value={form.sitio} onChange={e => patch({ sitio: e.target.value })} placeholder="e.g. Kasiglahan Village" /></label>
      <div className="form-grid two">
        <label className="field"><span>Latitude</span><input required type="number" step="any" min="4" max="22" value={lat} onChange={e => setLat(e.target.value)} /></label>
        <label className="field"><span>Longitude</span><input required type="number" step="any" min="116" max="128" value={lng} onChange={e => setLng(e.target.value)} /></label>
      </div>
      <button type="button" className="inline-link map-picker-toggle" onClick={() => setPickMap(value => !value)}><MapPin size={15} />{pickMap ? 'Close map picker' : 'Choose location on map'}</button>
      {pickMap && <AdminMap hazards={[]} compact pickedCoordinates={Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) ? [Number(lat), Number(lng)] : undefined} onPick={coords => { setLat(String(coords[0])); setLng(String(coords[1])); }} />}
      <label className="field full"><span>Description</span><textarea maxLength={3000} value={form.description} onChange={e => patch({ description: e.target.value })} placeholder="What should residents know?" rows={3} /></label>
      <label className="field full"><span>Reported by</span><input maxLength={160} value={form.reportedBy} onChange={e => patch({ reportedBy: e.target.value })} /></label>
      <div className="reporter-card">
        <div className="reporter-card-head">
          <strong><UserRound size={14} /> Sino ang nag-report <span>ADMIN ONLY</span></strong>
          <small>{hazard?.source === 'community' ? 'Community report' : hazard?.source === 'sample' ? 'Sample record' : 'Barangay entry'}</small>
        </div>
        <dl className="reporter-grid">
          <div><dt><UserRound size={12} /> Pangalan</dt><dd>{form.reportedBy || hazard?.reportedBy || 'Hindi nakalagay'}</dd></div>
          <div><dt><Mail size={12} /> Email</dt><dd>{form.reporterEmail || hazard?.reporterEmail || 'Walang email'}</dd></div>
          <div><dt><Phone size={12} /> Cellphone</dt><dd>{form.contactNumber || hazard?.contactNumber || 'Walang numero'}</dd></div>
          <div><dt><ShieldCheck size={12} /> Kailan nag-report</dt><dd>{exactTime(hazard?.createdAt || hazard?.timeReported)}</dd></div>
        </dl>
        <p className="reporter-since">{relativeTime(hazard?.createdAt || hazard?.timeReported)}</p>
        <label className="check-field reporter-toggle">
          <input type="checkbox" checked={form.showReporterName === true} onChange={event => patch({ showReporterName: event.target.checked })} />
          Ipakita ang pangalan ng nag-report sa public map
        </label>
        <small className="reporter-note">Ang email at cellphone ay hindi kailanman lumalabas sa public site.</small>
      </div>
      <div className="photo-edit"><label className="upload-link"><ImagePlus size={16} />{form.photoUrl ? 'Replace photo' : 'Attach a photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} hidden /></label>{form.photoUrl && <><span>Photo attached</span><button type="button" onClick={() => patch({ photoUrl: undefined })}>Remove</button></>}</div>
      {form.photoUrl && <img className="report-photo" src={form.photoUrl} alt="Photo attached to the report" />}
      <div className="modal-actions">
        {hazard && <button type="button" className="button button-danger-ghost" disabled={busy} onClick={() => onDelete(hazard)}><Trash2 size={15} />Delete</button>}
        <span className="action-spacer" /><button type="button" className="button button-ghost" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save incident'}</button>
      </div>
    </form>
  </Modal>;
}

const initialCenter = (): EvacuationCenter => ({ id: makeId(), name: '', sitio: '', address: '', capacityFamilies: 0, currentFamilies: 0, status: 'Standby', contactPerson: '', contactNumber: '', coordinates: [14.7425, 121.131], amenities: [] });
export function CenterEditor({ center, onClose, onSave, busy }: { center: EvacuationCenter | null; onClose: () => void; onSave: (center: EvacuationCenter) => Promise<boolean>; busy: boolean }) {
  const [form, setForm] = useState(() => center ? { ...center } : initialCenter());
  const [amenities, setAmenities] = useState(form.amenities.join(', '));
  const [error, setError] = useState('');
  const patch = (value: Partial<EvacuationCenter>) => setForm(current => ({ ...current, ...value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.address.trim() || !form.sitio.trim()) { setError('Please fill in the name and location.'); return; }
    if (form.currentFamilies > form.capacityFamilies) { setError('Current families cannot exceed capacity.'); return; }
    if (!Number.isFinite(form.coordinates[0]) || !Number.isFinite(form.coordinates[1]) || form.coordinates[0] < 4 || form.coordinates[0] > 22 || form.coordinates[1] < 116 || form.coordinates[1] > 128) { setError('Enter valid Philippine coordinates.'); return; }
    if (await onSave({ ...form, name: form.name.trim(), address: form.address.trim(), sitio: form.sitio.trim(), amenities: amenities.split(',').map(x => x.trim()).filter(Boolean) })) onClose();
  };
  return <Modal eyebrow="COMMUNITY RESOURCES" title={center ? 'Edit evacuation center' : 'Add evacuation center'} onClose={onClose}>
    <form onSubmit={submit} className="modal-form"><p className="form-intro">This information appears in the public evacuation directory.</p>
      {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}
      <label className="field full"><span>Center name <b>*</b></span><input required autoFocus value={form.name} onChange={e => patch({ name: e.target.value })} /></label>
      <label className="field full"><span>Address <b>*</b></span><input required value={form.address} onChange={e => patch({ address: e.target.value })} /></label>
      <div className="form-grid two"><label className="field"><span>Sitio / area <b>*</b></span><input required value={form.sitio} onChange={e => patch({ sitio: e.target.value })} /></label><label className="field"><span>Status</span><select value={form.status} onChange={e => patch({ status: e.target.value as EvacuationCenter['status'] })}><option>Standby</option><option>Open</option><option>Full</option></select></label>
        <label className="field"><span>Capacity (families)</span><input type="number" min="0" required value={form.capacityFamilies} onChange={e => patch({ capacityFamilies: Number(e.target.value) })} /></label><label className="field"><span>Current families</span><input type="number" min="0" required value={form.currentFamilies} onChange={e => patch({ currentFamilies: Number(e.target.value) })} /></label>
        <label className="field"><span>Contact person</span><input value={form.contactPerson} onChange={e => patch({ contactPerson: e.target.value })} /></label><label className="field"><span>Contact number</span><input value={form.contactNumber} onChange={e => patch({ contactNumber: e.target.value })} /></label>
        <label className="field"><span>Latitude</span><input type="number" required step="any" min="4" max="22" value={form.coordinates[0]} onChange={e => patch({ coordinates: [Number(e.target.value), form.coordinates[1]] })} /></label><label className="field"><span>Longitude</span><input type="number" required step="any" min="116" max="128" value={form.coordinates[1]} onChange={e => patch({ coordinates: [form.coordinates[0], Number(e.target.value)] })} /></label></div>
      <label className="field full"><span>Amenities <small>(comma separated)</small></span><input value={amenities} onChange={e => setAmenities(e.target.value)} placeholder="Drinking water, first aid, generator" /></label>
      <div className="modal-actions"><span className="action-spacer" /><button type="button" className="button button-ghost" onClick={onClose}>Cancel</button><button type="submit" disabled={busy} className="button button-primary">{busy ? 'Saving…' : 'Save center'}</button></div>
    </form>
  </Modal>;
}

export function HotlineEditor({ contact, onClose, onSave, busy }: { contact: EmergencyContact | null; onClose: () => void; onSave: (contact: EmergencyContact) => Promise<boolean>; busy: boolean }) {
  const [form, setForm] = useState<EmergencyContact>(() => contact ? { ...contact } : { label: '', agency: '', numbers: [], type: 'barangay', icon: 'ShieldAlert' });
  const [numbers, setNumbers] = useState(form.numbers.join(', '));
  const [error, setError] = useState('');
  const patch = (value: Partial<EmergencyContact>) => setForm(current => ({ ...current, ...value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const clean = numbers.split(',').map(value => value.trim()).filter(Boolean);
    if (!form.label.trim() || !form.agency.trim() || !clean.length) { setError('Enter a name, agency and at least one phone number.'); return; }
    if (await onSave({ ...form, label: form.label.trim(), agency: form.agency.trim(), numbers: clean })) onClose();
  };
  return <Modal eyebrow="COMMUNITY RESOURCES" title={contact ? 'Edit hotline' : 'Add a hotline'} onClose={onClose}>
    <form className="modal-form" onSubmit={submit}><p className="form-intro">Make sure these numbers are verified before sharing them with residents.</p>
      {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}
      <label className="field full"><span>Display name <b>*</b></span><input required autoFocus value={form.label} onChange={e => patch({ label: e.target.value })} placeholder="e.g. MDRRMO Rescue" /></label>
      <label className="field full"><span>Agency <b>*</b></span><input required value={form.agency} onChange={e => patch({ agency: e.target.value })} /></label>
      <label className="field full"><span>Phone number(s) <b>*</b> <small>Separate multiple numbers with commas</small></span><input required value={numbers} onChange={e => setNumbers(e.target.value)} placeholder="911, (02) 1234-5678" /></label>
      <label className="field full"><span>Category</span><select value={form.type} onChange={e => patch({ type: e.target.value as EmergencyContact['type'] })}><option value="barangay">Barangay</option><option value="rescue">Rescue</option><option value="fire">Fire</option><option value="police">Police</option><option value="utility">Utility</option></select></label>
      <div className="modal-actions"><span className="action-spacer" /><button type="button" className="button button-ghost" onClick={onClose}>Cancel</button><button type="submit" disabled={busy} className="button button-primary">{busy ? 'Saving…' : 'Save hotline'}</button></div>
    </form>
  </Modal>;
}

export function PlaceEditor({ place, onClose, onSave, busy }: { place: ManagedPlace | null; onClose: () => void; onSave: (place: ManagedPlace) => Promise<boolean>; busy: boolean }) {
  const [form, setForm] = useState<ManagedPlace>(() => place ? { ...place } : { id: makeId(), category: 'police', name: '', latitude: 14.7425, longitude: 121.131, address: '', phone: '', hours: '', note: '', approx: false, is_active: true });
  const [error, setError] = useState('');
  const patch = (value: Partial<ManagedPlace>) => setForm(current => ({ ...current, ...value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !Number.isFinite(form.latitude) || !Number.isFinite(form.longitude) || form.latitude < 4 || form.latitude > 22 || form.longitude < 116 || form.longitude > 128) { setError('Enter a name and valid Philippine coordinates.'); return; }
    if (await onSave({ ...form, name: form.name.trim() })) onClose();
  };
  return <Modal eyebrow="HELP CENTER" title={place ? 'Edit directory pin' : 'Add directory pin'} onClose={onClose}>
    <form className="modal-form" onSubmit={submit}><p className="form-intro">Active places are shown on the public Help Center map for their category.</p>
      {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}
      <label className="field full"><span>Place name <b>*</b></span><input required autoFocus value={form.name} onChange={e => patch({ name: e.target.value })} /></label>
      <label className="field full"><span>Category</span><select value={form.category} onChange={e => patch({ category: e.target.value as PlaceCategoryId })}>{HELP_CENTER_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}</select></label>
      <label className="field full"><span>Address</span><input value={form.address || ''} onChange={e => patch({ address: e.target.value })} /></label>
      <div className="form-grid two"><label className="field"><span>Latitude</span><input required type="number" step="any" min="4" max="22" value={form.latitude} onChange={e => patch({ latitude: Number(e.target.value) })} /></label><label className="field"><span>Longitude</span><input required type="number" step="any" min="116" max="128" value={form.longitude} onChange={e => patch({ longitude: Number(e.target.value) })} /></label>
        <label className="field"><span>Phone</span><input value={form.phone || ''} onChange={e => patch({ phone: e.target.value })} /></label><label className="field"><span>Hours</span><input value={form.hours || ''} onChange={e => patch({ hours: e.target.value })} /></label></div>
      <label className="field full"><span>Notes</span><textarea rows={2} value={form.note || ''} onChange={e => patch({ note: e.target.value })} /></label>
      <label className="check-field"><input type="checkbox" checked={form.is_active} onChange={e => patch({ is_active: e.target.checked })} /> Show this place in the public Help Center</label>
      <label className="check-field"><input type="checkbox" checked={form.approx} onChange={e => patch({ approx: e.target.checked })} /> Location is approximate</label>
      <div className="modal-actions"><span className="action-spacer" /><button type="button" className="button button-ghost" onClick={onClose}>Cancel</button><button type="submit" disabled={busy} className="button button-primary">{busy ? 'Saving…' : 'Save place'}</button></div>
    </form>
  </Modal>;
}
