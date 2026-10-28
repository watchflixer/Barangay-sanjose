import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity, AlertCircle, AlertTriangle, ArrowDownLeft, ArrowRight, ArrowUpRight, BadgeCheck,
  Building2, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, CircleHelp,
  Clock3, Database, ExternalLink, Eye, FileText, Globe2, History as HistoryIcon, Layers3, LayoutDashboard, LogIn, UserRound,
  LifeBuoy, LogOut, Map, MapPin, Menu, Pencil, Phone, Plus, Radio, RefreshCw,
  Search, Settings, Shield, ShieldCheck, SlidersHorizontal, Trash2, X,
} from 'lucide-react';
import { getSupabaseConfig, setSupabaseConfig, supabaseConfigFromEnv } from '../services/helpCenterService';
import {
  DEMO_STORAGE_KEY, OPERATIONS_CHANGED_EVENT, deleteHazard, deletePlace, getOperationsClient,
  isCurrentUserAdmin, isDemoMode, loadAdminData, readDemoData, saveContent, saveHazard,
  savePlace, visibleHazards, logActivity,
} from '../services/operationsService';
import { exactTime, relativeTime } from './time';
import { lockAdmin } from './gate';
// Imported here as well as in the standalone entry so the workspace is fully
// styled when the secret door mounts it inside the public site.
import './admin.css';
import type { ActivityEntry } from './types';
import type { EmergencyContact } from '../types';
import type { EvacuationCenter } from '../data/evacuationCenters';
import { CATEGORY_BY_ID } from '../data/helpCenterPlaces';
import { AdminMap } from './AdminMap';
import { HAZARD_TYPES, IncidentTable, LayerControls, LoadingState, StatusChip, Switch, TypeIcon } from './components';
import { CenterEditor, HotlineEditor, IncidentEditor, PlaceEditor } from './editors';
import { DEFAULT_MAP_DISPLAY, type ManagedHazard, type ManagedPlace, type MapDisplaySettings, type OperationsData } from './types';

type Section = 'overview' | 'incidents' | 'map' | 'history' | 'centers' | 'hotlines' | 'help' | 'settings';
type AuthState = 'demo' | 'checking' | 'login' | 'admin';
const emptyData = (): OperationsData => ({ hazards: [], map: { ...DEFAULT_MAP_DISPLAY, types: { ...DEFAULT_MAP_DISPLAY.types } }, evacuationCenters: [], emergencyContacts: [], liveStreamUrl: '', places: [], activity: [] });

const NAV: { id: Section; label: string; icon: typeof Map; group: 'workspace' | 'manage' | 'system' }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'workspace' },
  { id: 'incidents', label: 'Incidents & reports', icon: FileText, group: 'workspace' },
  { id: 'map', label: 'Hazard street map', icon: Map, group: 'workspace' },
  { id: 'history', label: 'History', icon: HistoryIcon, group: 'workspace' },
  { id: 'centers', label: 'Evacuation centers', icon: Building2, group: 'manage' },
  { id: 'hotlines', label: 'Emergency hotlines', icon: Phone, group: 'manage' },
  { id: 'help', label: 'Help center', icon: LifeBuoy, group: 'manage' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'system' },
];

function Brand() {
  return <div className="admin-brand"><div className="brand-mark"><svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" fillRule="evenodd" d="M14.15 5.35Q16 1.8 17.85 5.35L29.41 27.54Q30.8 30.2 27.8 30.2H4.2Q1.2 30.2 2.59 27.54L14.15 5.35Z M16 8.9a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2Z M11.25 30.2V26.45a4.75 4.75 0 0 1 9.5 0V30.2H11.25Z" /></svg></div><div><strong>HazardSync<span>.</span></strong><small>ADMIN WORKSPACE</small></div></div>;
}

function SidebarNav({ section, setSection, pending, demo, email, onSignOut, open, onClose }: {
  section: Section; setSection: (section: Section) => void; pending: number; demo: boolean; email: string;
  onSignOut: () => void; open: boolean; onClose: () => void;
}) {
  return <>
    {open && <button className="mobile-nav-backdrop" aria-label="Close navigation" onClick={onClose} />}
    <aside className={`admin-sidebar ${open ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand-row"><Brand /><button className="sidebar-close icon-button" aria-label="Close navigation" onClick={onClose}><X size={19} /></button></div>
      <div className="workspace-card"><div className="workspace-icon"><ShieldCheck size={19} /></div><div><strong>Barangay San Jose</strong><span>Rodriguez, Rizal</span></div><ChevronDown size={15} /></div>
      <nav aria-label="Admin navigation">
        {(['workspace', 'manage', 'system'] as const).map(group => <div className="nav-group" key={group}>
          <p>{group === 'workspace' ? 'WORKSPACE' : group === 'manage' ? 'COMMUNITY' : 'PREFERENCES'}</p>
          {NAV.filter(item => item.group === group).map(item => {
            const Icon = item.icon;
            return <button type="button" className={`nav-item ${section === item.id ? 'active' : ''}`} key={item.id} onClick={() => { setSection(item.id); onClose(); }} aria-current={section === item.id ? 'page' : undefined}>
              <Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === 'incidents' && pending > 0 && <b>{pending}</b>}
            </button>;
          })}
        </div>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-help"><div className="sidebar-help-icon"><Shield size={17} /></div><strong>Safer, together.</strong><p>Every update helps keep our community informed.</p><span>BARANGAY SAN JOSE <ArrowUpRight size={13} /></span></div>
        <div className="sidebar-user"><div className="avatar">{demo ? 'A' : (email[0] || 'A').toUpperCase()}</div><div><strong>{demo ? 'Admin account' : 'Administrator'}</strong><span>{demo ? 'Demo workspace' : email}</span></div>{<button type="button" className="signout" title="Sign out" aria-label="Sign out" onClick={onSignOut}><LogOut size={17} /></button>}</div>
      </div>
    </aside>
  </>;
}

function Login({ onLogin, busy, error, note }: { onLogin: (email: string, password: string) => void; busy: boolean; error: string; note?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return <div className="login-page"><div className="login-visual"><Brand /><div className="login-message"><span className="eyebrow">BARANGAY SAN JOSE · RODRIGUEZ, RIZAL</span><h1>A safer community<br />starts with you.</h1><p>One place to manage the information that matters to your barangay.</p></div><small>HAZARDSYNC · ADMIN WORKSPACE</small></div><div className="login-panel"><form onSubmit={event => { event.preventDefault(); onLogin(email, password); }}><div className="login-icon"><ShieldCheck size={25} /></div><span className="eyebrow">ADMIN WORKSPACE</span><h2>Welcome back</h2>{note && <p className="login-note">{note}</p>}<p>Sign in with your authorized administrator account.</p>{error && <div className="form-error"><AlertCircle size={16} />{error}</div>}<label className="field full"><span>Email address</span><input type="email" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="admin@example.com" /></label><label className="field full"><span>Password</span><input type="password" required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" /></label><button type="submit" className="button button-primary login-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} /></button><a href="./index.html" className="login-back"><ArrowDownLeft size={15} /> Back to public website</a></form></div></div>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action && <div className="heading-action">{action}</div>}</div>;
}
function PanelTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="panel-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>;
}

function MetricCard({ label, number, detail, icon: Icon, tone, onClick }: { label: string; number: number; detail: string; icon: typeof Map; tone: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={19} strokeWidth={1.8} /></span></div><strong>{String(number).padStart(2, '0')}</strong><div className="metric-detail"><span className={`metric-dot ${tone}`} />{detail}</div></button>;
}

function MapCard({ hazards, onSelect, onFullMap, large = false }: { hazards: ManagedHazard[]; onSelect: (hazard: ManagedHazard) => void; onFullMap?: () => void; large?: boolean }) {
  return <section className={`panel map-panel ${large ? 'map-panel-large' : ''}`}><PanelTitle title="Hazard street map" description="A live preview of published manual pins" action={onFullMap && <button type="button" className="text-action" onClick={onFullMap}>Open map <ArrowUpRight size={15} /></button>} />
    <div className="map-frame"><AdminMap hazards={hazards} onSelect={onSelect} /><div className="map-label"><span className="map-label-icon"><MapPin size={15} /></span><span><strong>Barangay San Jose</strong><small>Rodriguez, Rizal</small></span></div><div className="map-pin-count"><i />{hazards.length} {hazards.length === 1 ? 'pin' : 'pins'} visible</div></div>
    <div className="map-footer"><span><i /> Published & enabled incidents</span><span>Automatic PAGASA pin, when active, appears on the public map.</span></div>
  </section>;
}

function MapLayersCard({ data, busy, onToggle, full = false }: { data: OperationsData; busy: boolean; onToggle: (map: MapDisplaySettings) => void; full?: boolean }) {
  return <section className="panel layers-panel"><PanelTitle title="Map display" description="Choose what residents can see" action={<span className="panel-heading-icon"><SlidersHorizontal size={16} /></span>} />
    <div className="layers-intro"><span>HAZARD LAYERS</span><span>{Object.values(data.map.types).filter(Boolean).length} OF 6 ON</span></div>
    <LayerControls map={data.map} hazards={data.hazards} onToggle={onToggle} busy={busy} />
    {full && <div className="extra-layers"><div><span><strong>Resolved incidents</strong><small>Show cleared incidents on the map</small></span><Switch label="Show resolved incidents on public map" checked={data.map.showResolved} disabled={busy} onChange={value => onToggle({ ...data.map, showResolved: value })} /></div><div><span><strong>Automatic PAGASA pin</strong><small>Show flood warnings when available</small></span><Switch label="Show automatic PAGASA flood pin" checked={data.map.showPagasa} disabled={busy} onChange={value => onToggle({ ...data.map, showPagasa: value })} /></div></div>}
  </section>;
}

function Overview({ data, setSection, setFilter, onAdd, onEdit, onVisibility, onToggle, busy }: {
  data: OperationsData; setSection: (s: Section) => void; setFilter: (s: string) => void; onAdd: () => void;
  onEdit: (hazard: ManagedHazard) => void; onVisibility: (hazard: ManagedHazard) => void; onToggle: (map: MapDisplaySettings) => void; busy: boolean;
}) {
  const pending = data.hazards.filter(item => item.visibility === 'pending').length;
  const active = data.hazards.filter(item => item.visibility === 'published' && item.status === 'active').length;
  const resolved = data.hazards.filter(item => item.status === 'resolved').length;
  const visible = visibleHazards(data);
  const go = (filter: string) => { setFilter(filter); setSection('incidents'); };
  return <>
    <PageHeading eyebrow="BARANGAY SAN JOSE  /  COMMAND CENTER" title="Community overview" description="A little more clarity for a safer, more prepared barangay." action={<button type="button" className="button button-primary" onClick={onAdd}><Plus size={17} /> Add incident</button>} />
    <div className="overview-intro"><div><span className="intro-symbol"><Activity size={16} /></span><span><strong>Keeping our community informed</strong><small>Manage reports, map visibility, and essential resources in one place.</small></span></div><span className="intro-caption"><i /> BARANGAY OPERATIONS</span></div>
    <div className="metrics-grid">
      <MetricCard label="Total incidents" number={data.hazards.length} detail="All reports on record" icon={FileText} tone="mint" onClick={() => go('all')} />
      <MetricCard label="Active incidents" number={active} detail="Published & active" icon={AlertTriangle} tone="coral" onClick={() => go('active')} />
      <MetricCard label="Pending review" number={pending} detail="Waiting for your review" icon={Clock3} tone="amber" onClick={() => go('pending')} />
      <MetricCard label="Resolved" number={resolved} detail="Marked as resolved" icon={CheckCircle2} tone="blue" onClick={() => go('resolved')} />
    </div>
    <div className="dashboard-grid"><MapCard hazards={visible} onSelect={onEdit} onFullMap={() => setSection('map')} /><MapLayersCard data={data} busy={busy} onToggle={onToggle} /></div>
    <section className="panel recent-panel"><PanelTitle title="Recent incidents" description="The latest reports in your workspace" action={<button type="button" className="text-action" onClick={() => go('all')}>View all incidents <ArrowRight size={15} /></button>} /><IncidentTable hazards={data.hazards.slice(0, 5)} map={data.map} onEdit={onEdit} onVisibility={onVisibility} compact busy={busy} /></section>
    <div className="dashboard-footer"><span>HazardSync Admin · Barangay San Jose</span><span>Made for a more prepared community <span className="footer-heart">♥</span></span></div>
  </>;
}

function Incidents({ data, filter, setFilter, query, setQuery, onAdd, onEdit, onVisibility, onDelete, busy }: {
  data: OperationsData; filter: string; setFilter: (value: string) => void; query: string; setQuery: (value: string) => void;
  onAdd: () => void; onEdit: (hazard: ManagedHazard) => void; onVisibility: (hazard: ManagedHazard) => void; onDelete: (hazard: ManagedHazard) => void; busy: boolean;
}) {
  const filtered = data.hazards.filter(h => {
    const matches = `${h.title} ${h.streetName} ${h.sitio} ${h.type}`.toLowerCase().includes(query.toLowerCase().trim());
    return matches && (filter === 'all' || (filter === 'active' ? h.visibility === 'published' && h.status === 'active' : filter === 'resolved' ? h.status === 'resolved' : h.visibility === filter));
  });
  const filters = [ ['all', 'All incidents'], ['pending', 'Pending review'], ['published', 'Published'], ['hidden', 'Hidden'], ['active', 'Active'], ['resolved', 'Resolved'] ];
  return <><PageHeading eyebrow="WORKSPACE  /  INCIDENTS & REPORTS" title="Incidents & reports" description="Review community reports and manage what appears on the map." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} /> Add incident</button>} />
    <section className="panel list-panel"><div className="list-panel-top"><div><h2>Incident reports <span className="count-pill">{data.hazards.length}</span></h2><p>Only published incidents are eligible to appear on the public map.</p></div><label className="search-box"><Search size={16} /><input aria-label="Search incidents" placeholder="Search incidents or locations" value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={15} /></button>}</label></div>
      <div className="tabs" role="tablist" aria-label="Filter incidents">{filters.map(([id, label]) => <button role="tab" aria-selected={filter === id} key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}{id === 'pending' && data.hazards.some(h => h.visibility === 'pending') && <span>{data.hazards.filter(h => h.visibility === 'pending').length}</span>}</button>)}</div>
      <IncidentTable hazards={filtered} map={data.map} onEdit={onEdit} onVisibility={onVisibility} onDelete={onDelete} busy={busy} />
      <div className="list-footer">Showing {filtered.length} of {data.hazards.length} incidents <span>Visibility also depends on enabled map layers.</span></div>
    </section></>;
}


const ACTION_META: Record<string, { label: string; tone: string }> = {
  reported: { label: 'Reported', tone: 'amber' },
  created: { label: 'Added', tone: 'mint' },
  updated: { label: 'Updated', tone: 'blue' },
  published: { label: 'Published', tone: 'mint' },
  hidden: { label: 'Hidden', tone: 'grey' },
  deleted: { label: 'Deleted', tone: 'coral' },
  resolved: { label: 'Resolved', tone: 'blue' },
  resources: { label: 'Directory', tone: 'blue' },
  settings: { label: 'Settings', tone: 'grey' },
};

function dayLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Walang petsa';
  const today = new Date();
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((start(today) - start(date)) / 86_400_000);
  if (diff === 0) return 'Ngayong araw';
  if (diff === 1) return 'Kahapon';
  return date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}

function HistoryPage({ data }: { data: OperationsData }) {
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('all');
  const entries = data.activity.filter(entry => {
    const text = `${entry.title} ${entry.actor} ${entry.detail || ''} ${entry.action}`.toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (action === 'all' || entry.action === action);
  });
  const groups: { day: string; items: ActivityEntry[] }[] = [];
  for (const entry of entries) {
    const day = dayLabel(entry.at);
    const group = groups.find(item => item.day === day);
    if (group) group.items.push(entry); else groups.push({ day, items: [entry] });
  }
  const actions = ['all', ...Object.keys(ACTION_META)];
  return <>
    <PageHeading eyebrow="WORKSPACE  /  HISTORY" title="History" description="Bawat pagbabago sa site: sino ang gumawa, kailan, at ano ang nangyari." />
    <section className="panel list-panel">
      <div className="list-panel-top">
        <div><h2>Activity log <span className="count-pill">{data.activity.length}</span></h2><p>Kasama dito ang reports, publish/hide, delete, at mga pagbabago sa directory.</p></div>
        <label className="search-box"><Search size={16} /><input aria-label="Search history" placeholder="Search history or reporter" value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={15} /></button>}</label>
      </div>
      <div className="tabs" role="tablist" aria-label="Filter history">
        {actions.map(id => <button key={id} role="tab" aria-selected={action === id} className={action === id ? 'active' : ''} onClick={() => setAction(id)}>
          {id === 'all' ? 'Lahat' : ACTION_META[id].label}
        </button>)}
      </div>
      {groups.length === 0 ? <div className="empty-state"><div className="empty-icon"><HistoryIcon size={22} /></div><strong>Walang history na tugma</strong><span>Subukan ang ibang filter o search.</span></div> : (
        <div className="history-feed">
          {groups.map(group => <div className="history-group" key={group.day}>
            <p className="history-day">{group.day}</p>
            {group.items.map(entry => {
              const meta = ACTION_META[entry.action] || { label: entry.action, tone: 'grey' };
              return <div className="history-item" key={entry.id}>
                <span className={`history-dot tone-${meta.tone}`} />
                <div className="history-body">
                  <div className="history-top"><span className={`history-badge tone-${meta.tone}`}>{meta.label}</span><strong>{entry.title}</strong></div>
                  {entry.detail && <p>{entry.detail}</p>}
                  <div className="history-meta"><span><UserRound size={12} />{entry.actor}</span><span><Clock3 size={12} />{exactTime(entry.at)}</span><span className="history-ago">{relativeTime(entry.at)}</span></div>
                </div>
              </div>;
            })}
          </div>)}
        </div>
      )}
    </section>
  </>;
}

function MapPage({ data, busy, onEdit, onToggle, onAdd, onVisibility, onDelete }: { data: OperationsData; busy: boolean; onEdit: (h: ManagedHazard) => void; onToggle: (m: MapDisplaySettings) => void; onAdd: () => void; onVisibility: (h: ManagedHazard) => void; onDelete: (h: ManagedHazard) => void }) {
  return <><PageHeading eyebrow="WORKSPACE  /  HAZARD STREET MAP" title="Hazard street map" description="You're in control of which incidents and layers residents see." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} /> Add a map pin</button>} />
    <div className="dashboard-grid map-page-grid"><MapCard hazards={visibleHazards(data)} onSelect={onEdit} large /><MapLayersCard data={data} busy={busy} onToggle={onToggle} full /></div>
    <section className="panel recent-panel"><PanelTitle title="Published incidents" description="Edit or hide individual pins. Disabled layers will not appear publicly." /><IncidentTable hazards={data.hazards.filter(h => h.visibility === 'published')} map={data.map} onEdit={onEdit} onVisibility={onVisibility} onDelete={onDelete} busy={busy} /></section></>;
}

function CentersPage({ data, onAdd, onEdit, onDelete }: { data: OperationsData; onAdd: () => void; onEdit: (i: number) => void; onDelete: (i: number) => void }) {
  const open = data.evacuationCenters.filter(c => c.status === 'Open').length;
  const capacity = data.evacuationCenters.reduce((sum, c) => sum + c.capacityFamilies, 0);
  return <><PageHeading eyebrow="COMMUNITY  /  EVACUATION CENTERS" title="Evacuation centers" description="Keep shelter details and capacity up to date for residents." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} /> Add center</button>} />
    <div className="resource-summary"><div><span className="resource-summary-icon mint"><Building2 size={20} /></span><span><small>LISTED CENTERS</small><strong>{data.evacuationCenters.length}</strong></span></div><div><span className="resource-summary-icon blue"><CheckCircle2 size={20} /></span><span><small>OPEN CENTERS</small><strong>{open}</strong></span></div><div><span className="resource-summary-icon amber"><Shield size={20} /></span><span><small>TOTAL FAMILY CAPACITY</small><strong>{capacity.toLocaleString()}</strong></span></div></div>
    <section className="panel list-panel"><PanelTitle title="Shelter directory" description="Changes are reflected in the public evacuation centers list." /><div className="table-scroll"><table className="data-table"><thead><tr><th>CENTER</th><th>STATUS</th><th>FAMILIES</th><th>CONTACT</th><th aria-label="Actions" /></tr></thead><tbody>{data.evacuationCenters.map((center, index) => <tr key={center.id}><td><div className="resource-name"><span className="resource-square"><Building2 size={18} /></span><span><strong>{center.name}</strong><small>{center.address}</small></span></div></td><td><StatusChip status={center.status} /></td><td>{center.currentFamilies} / {center.capacityFamilies}</td><td>{center.contactNumber || '—'}</td><td><div className="row-actions"><button className="icon-button" aria-label={`Edit ${center.name}`} onClick={() => onEdit(index)}><Pencil size={15} /></button><button className="icon-button danger" aria-label={`Delete ${center.name}`} onClick={() => onDelete(index)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>{!data.evacuationCenters.length && <div className="empty-state"><div className="empty-icon"><Building2 size={22} /></div><strong>No evacuation centers yet</strong><span>Add a verified center to the public directory.</span></div>}</section></>;
}

function HotlinesPage({ data, onAdd, onEdit, onDelete }: { data: OperationsData; onAdd: () => void; onEdit: (i: number) => void; onDelete: (i: number) => void }) {
  return <><PageHeading eyebrow="COMMUNITY  /  EMERGENCY HOTLINES" title="Emergency hotlines" description="Keep important contact numbers easy to find and up to date." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} /> Add hotline</button>} />
    <div className="resource-callout"><span><Phone size={19} /></span><div><strong>Accurate information saves time.</strong><p>Please verify numbers with the agency before publishing changes.</p></div><BadgeCheck size={20} /></div>
    <section className="panel list-panel"><PanelTitle title="Hotline directory" description="These contacts appear in the public emergency hotlines directory." /><div className="table-scroll"><table className="data-table"><thead><tr><th>AGENCY</th><th>CATEGORY</th><th>PHONE NUMBER</th><th aria-label="Actions" /></tr></thead><tbody>{data.emergencyContacts.map((contact, index) => <tr key={`${contact.label}-${index}`}><td><div className="resource-name"><span className="resource-square coral"><Phone size={17} /></span><span><strong>{contact.label}</strong><small>{contact.agency}</small></span></div></td><td className="capitalize">{contact.type}</td><td>{contact.numbers.join(' · ')}</td><td><div className="row-actions"><button className="icon-button" aria-label={`Edit ${contact.label}`} onClick={() => onEdit(index)}><Pencil size={15} /></button><button className="icon-button danger" aria-label={`Delete ${contact.label}`} onClick={() => onDelete(index)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>{!data.emergencyContacts.length && <div className="empty-state"><div className="empty-icon"><Phone size={22} /></div><strong>No hotlines yet</strong><span>Add verified emergency contact numbers.</span></div>}</section></>;
}

function HelpPage({ data, demo, onAdd, onEdit, onDelete, openSettings }: { data: OperationsData; demo: boolean; onAdd: () => void; onEdit: (place: ManagedPlace) => void; onDelete: (place: ManagedPlace) => void; openSettings: () => void }) {
  return <><PageHeading eyebrow="COMMUNITY  /  HELP CENTER" title="Help center" description="Manage the places residents can find on the Help Center map." action={<button className="button button-primary" onClick={onAdd} disabled={demo}><Plus size={17} /> Add place</button>} />
    {demo && <div className="setup-notice"><Database size={19} /><div><strong>Connect Supabase to manage directory pins</strong><p>The Help Center reads directly from your database; demo pins are not published.</p></div><button className="button button-outline" onClick={openSettings}>Connection settings <ArrowRight size={15} /></button></div>}
    <section className="panel list-panel"><PanelTitle title="Directory places" description="Active places appear in their selected Help Center category." /><div className="table-scroll"><table className="data-table"><thead><tr><th>PLACE</th><th>CATEGORY</th><th>COORDINATES</th><th>VISIBILITY</th><th aria-label="Actions" /></tr></thead><tbody>{data.places.map(place => <tr key={place.id}><td><div className="resource-name"><span className="resource-square"><MapPin size={18} /></span><span><strong>{place.name}</strong><small>{place.address || 'No address provided'}</small></span></div></td><td>{CATEGORY_BY_ID[place.category]?.label || place.category}</td><td>{Number(place.latitude).toFixed(5)}, {Number(place.longitude).toFixed(5)}</td><td><StatusChip status={place.is_active ? 'published' : 'hidden'} /></td><td><div className="row-actions"><button className="icon-button" aria-label={`Edit ${place.name}`} onClick={() => onEdit(place)}><Pencil size={15} /></button><button className="icon-button danger" aria-label={`Delete ${place.name}`} onClick={() => onDelete(place)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>{!data.places.length && <div className="empty-state"><div className="empty-icon"><MapPin size={22} /></div><strong>No directory places yet</strong><span>{demo ? 'Connect your database to get started.' : 'Add a place to make it visible in the Help Center.'}</span></div>}</section></>;
}

function SettingsPage({ data, demo, busy, onToggle, onBroadcast, onReset }: { data: OperationsData; demo: boolean; busy: boolean; onToggle: (map: MapDisplaySettings) => void; onBroadcast: (url: string) => Promise<boolean>; onReset: () => void }) {
  const [url, setUrl] = useState(data.liveStreamUrl);
  const [dbUrl, setDbUrl] = useState(getSupabaseConfig()?.url || '');
  const [dbKey, setDbKey] = useState(getSupabaseConfig()?.key || '');
  const [error, setError] = useState('');
  useEffect(() => setUrl(data.liveStreamUrl), [data.liveStreamUrl]);
  const saveBroadcast = async (event: FormEvent) => {
    event.preventDefault(); const value = url.trim();
    if (value) { try { if (new URL(value).protocol !== 'https:') throw new Error(); } catch { setError('Use a valid HTTPS video URL.'); return; } }
    setError(''); await onBroadcast(value);
  };
  const connect = (event: FormEvent) => {
    event.preventDefault();
    try {
      const parsed = new URL(dbUrl.trim());
      if (parsed.protocol !== 'https:' || !dbKey.trim()) throw new Error();
      if (!setSupabaseConfig({ url: parsed.toString(), key: dbKey })) throw new Error();
      window.location.reload();
    } catch { setError('Enter an HTTPS Supabase project URL and public anon key.'); }
  };
  return <><PageHeading eyebrow="PREFERENCES  /  SETTINGS" title="Workspace settings" description="Control map behavior, broadcast links and your data connection." />
    <div className="settings-grid"><div className="settings-column"><section className="panel settings-panel"><PanelTitle title="Public map preferences" description="These controls apply to the hazard street map." /><div className="setting-row"><span><strong>Show resolved incidents</strong><small>Display cleared incidents alongside active ones.</small></span><Switch label="Show resolved incidents on public map" checked={data.map.showResolved} disabled={busy} onChange={value => onToggle({ ...data.map, showResolved: value })} /></div><div className="setting-row"><span><strong>Automatic PAGASA flood pin</strong><small>Show the automatic warning when a qualifying live reading is available.</small></span><Switch label="Show automatic PAGASA flood pin" checked={data.map.showPagasa} disabled={busy} onChange={value => onToggle({ ...data.map, showPagasa: value })} /></div></section>
      <section className="panel settings-panel"><PanelTitle title="Live water monitoring" description="Add an official Facebook or YouTube broadcast link. Leave blank to remove it." /><form onSubmit={saveBroadcast} className="settings-form"><label className="field full"><span>Broadcast URL</span><input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></label>{error && <div className="form-error"><AlertCircle size={16} />{error}</div>}<button type="submit" className="button button-primary" disabled={busy}>Save broadcast</button></form></section>
      <section className="panel settings-panel"><PanelTitle title="External map feeds" description="Weather, traffic and flood-prone layers use their existing external providers." /><div className="provider-note"><Globe2 size={20} /><span>These feeds are not edited here. Hazard pins, directories and the automatic PAGASA pin are managed in this workspace.</span></div></section></div>
      <div className="settings-column"><section className="panel settings-panel"><PanelTitle title="Data connection" description={demo ? 'Connect a project to share updates with all residents.' : 'This workspace is connected to Supabase.'} /><div className={`connection-status ${demo ? 'demo' : ''}`}><i />{demo ? 'Local demo mode' : 'Supabase configured'}</div><p className="settings-help">{demo ? 'Demo changes stay on this browser only. To go live, run the admin SQL setup, add an authorized admin, and configure the public project URL and anon key.' : 'Database permissions and administrator access are enforced by Supabase row-level security.'}</p>
        {!supabaseConfigFromEnv() && <form className="settings-form" onSubmit={connect}><label className="field full"><span>Supabase project URL</span><input type="url" required value={dbUrl} onChange={e => setDbUrl(e.target.value)} placeholder="https://your-project.supabase.co" /></label><label className="field full"><span>Public anon key</span><input required value={dbKey} onChange={e => setDbKey(e.target.value)} placeholder="Your public anon key" /></label><small>Never paste a service-role key here. Build-time environment variables are needed for all visitors.</small><button type="submit" className="button button-outline">Connect project <ArrowRight size={15} /></button></form>}
        {supabaseConfigFromEnv() && <p className="settings-help">The project URL and public key are provided at build time.</p>}
      </section>{demo && <section className="panel settings-panel"><PanelTitle title="Demo data" description="Start again with the sample records on this browser." /><button className="button button-outline" onClick={onReset}><RefreshCw size={15} /> Reset demo workspace</button></section>}</div></div>
  </>;
}

interface AdminWorkspaceProps {
  /** Rendered inside the public site (secret door) instead of its own page. */
  embedded?: boolean;
  /** The secret sign-in card already accepted the local admin credentials. */
  gateUnlocked?: boolean;
  onExit?: () => void;
}

export function AdminWorkspace({ embedded = false, gateUnlocked = false, onExit }: AdminWorkspaceProps) {
  const demo = isDemoMode();
  const [auth, setAuth] = useState<AuthState>(demo ? 'demo' : 'checking');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('');
  const [section, setSection] = useState<Section>('overview');
  const [mobileNav, setMobileNav] = useState(false);
  const [data, setData] = useState<OperationsData>(() => demo ? readDemoData() : emptyData());
  const [loading, setLoading] = useState(!demo);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [incidentEditor, setIncidentEditor] = useState<ManagedHazard | null | undefined>(undefined);
  const [centerEditor, setCenterEditor] = useState<number | null | undefined>(undefined);
  const [hotlineEditor, setHotlineEditor] = useState<number | null | undefined>(undefined);
  const [placeEditor, setPlaceEditor] = useState<ManagedPlace | null | undefined>(undefined);

  const verifySession = useCallback(async () => {
    const client = getOperationsClient();
    if (!client) return;
    try {
      const { data: sessionData, error } = await client.auth.getSession();
      if (error) throw error;
      if (!sessionData.session) { setAuth('login'); return; }
      const admin = await isCurrentUserAdmin();
      if (!admin) { await client.auth.signOut(); setAuthError('This account is not an authorized administrator.'); setAuth('login'); return; }
      setEmail(sessionData.session.user.email || 'Administrator'); setAuthError(''); setAuth('admin');
    } catch (error) { setAuthError(error instanceof Error ? error.message : 'Unable to verify your account.'); setAuth('login'); }
  }, []);
  useEffect(() => {
    if (demo) return;
    verifySession();
    const client = getOperationsClient();
    const subscription = client?.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') setAuth('login'); });
    return () => subscription?.data.subscription.unsubscribe();
  }, [demo, verifySession]);

  const login = async (loginEmail: string, password: string) => {
    setAuthBusy(true); setAuthError('');
    try { const { error } = await getOperationsClient()!.auth.signInWithPassword({ email: loginEmail, password }); if (error) throw error; await verifySession(); }
    catch (error) { setAuthError(error instanceof Error ? error.message : 'Sign in failed.'); }
    finally { setAuthBusy(false); }
  };
  const signOut = async () => {
    await getOperationsClient()?.auth.signOut();
    lockAdmin();
    setEmail(''); setData(emptyData()); setAuth('login');
    if (embedded) onExit?.();
  };

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try { const next = await loadAdminData(); setData(next); setLoadError(''); return true; }
    catch (error) { setLoadError(error instanceof Error ? error.message : 'Could not load the workspace.'); return false; }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    if (auth !== 'admin' && auth !== 'demo') return;
    refresh(!(!demo));
    const update = () => { void refresh(true); };
    window.addEventListener('storage', update); window.addEventListener(OPERATIONS_CHANGED_EVENT, update);
    const timer = window.setInterval(update, 30000);
    return () => { window.removeEventListener('storage', update); window.removeEventListener(OPERATIONS_CHANGED_EVENT, update); window.clearInterval(timer); };
  }, [auth, demo, refresh]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3600); return () => window.clearTimeout(timer); }, [toast]);

  const run = async (
    operation: () => Promise<void>,
    message: string,
    audit?: { action: string; title: string; detail?: string },
  ): Promise<boolean> => {
    setBusy(true);
    try {
      await operation();
      if (audit) await logActivity(audit.action, audit.title, audit.detail);
      const refreshed = await refresh(true);
      setToast(refreshed ? message : 'Saved, but the workspace could not refresh.');
      return true;
    }
    catch (error) { setToast(error instanceof Error ? `Could not save: ${error.message}` : 'Could not save changes.'); return false; }
    finally { setBusy(false); }
  };
  const updateMap = (map: MapDisplaySettings) => {
    const on = HAZARD_TYPES.filter(type => map.types[type.id]).length;
    void run(() => saveContent('map', map), 'Map display updated.', {
      action: 'settings', title: 'Map display updated',
      detail: `${on} of 6 layers on${map.showResolved ? ' · resolved shown' : ' · resolved hidden'}`,
    });
  };
  const saveIncident = (hazard: ManagedHazard) => {
    const exists = data.hazards.some(item => item.id === hazard.id);
    const action = hazard.visibility === 'published' ? 'published' : hazard.visibility === 'hidden' ? 'hidden' : exists ? 'updated' : 'created';
    return run(() => saveHazard(hazard), hazard.visibility === 'published' ? 'Incident saved and published.' : 'Incident saved.', {
      action, title: hazard.title,
      detail: `${HAZARD_TYPES.find(type => type.id === hazard.type)?.label || hazard.type} · ${hazard.status} · ${hazard.visibility}`,
    });
  };
  const toggleVisibility = (hazard: ManagedHazard) => {
    if (hazard.visibility === 'pending') { setIncidentEditor(hazard); return; }
    const next = hazard.visibility === 'published' ? 'hidden' : 'published';
    if (window.confirm(`${next === 'published' ? 'Publish' : 'Hide'} “${hazard.title}” ${next === 'published' ? 'on' : 'from'} the public map?`)) {
      void run(() => saveHazard({ ...hazard, visibility: next }), next === 'published' ? 'Incident published.' : 'Incident hidden from the public map.', {
        action: next === 'published' ? 'published' : 'hidden', title: hazard.title,
        detail: next === 'published' ? 'Inilabas sa public hazard map' : 'Tinanggal pansamantala sa public hazard map',
      });
    }
  };
  const removeIncident = (hazard: ManagedHazard) => {
    if (window.confirm(`Permanently delete “${hazard.title}”? This cannot be undone.`)) {
      void run(() => deleteHazard(hazard.id), 'Incident deleted.', {
        action: 'deleted', title: hazard.title,
        detail: `Ni-report ni ${hazard.reportedBy}${hazard.reporterEmail ? ` (${hazard.reporterEmail})` : ''}`,
      }).then(ok => { if (ok) setIncidentEditor(undefined); });
    }
  };
  const removeCenter = (index: number) => { if (window.confirm(`Delete “${data.evacuationCenters[index].name}” from the public directory?`)) void run(() => saveContent('evacuationCenters', data.evacuationCenters.filter((_, i) => i !== index)), 'Evacuation center deleted.', { action: 'resources', title: 'Evacuation center deleted', detail: data.evacuationCenters[index].name }); };
  const removeHotline = (index: number) => { if (window.confirm(`Delete “${data.emergencyContacts[index].label}” from the public directory?`)) void run(() => saveContent('emergencyContacts', data.emergencyContacts.filter((_, i) => i !== index)), 'Hotline deleted.', { action: 'resources', title: 'Hotline deleted', detail: data.emergencyContacts[index].label }); };
  const removePlace = (place: ManagedPlace) => { if (window.confirm(`Delete “${place.name}” from the Help Center?`)) void run(() => deletePlace(place.id), 'Directory place deleted.', { action: 'resources', title: 'Help Center place deleted', detail: place.name }); };
  const resetDemo = () => { if (window.confirm('Reset this browser’s demo workspace? Any demo edits will be lost.')) { try { localStorage.removeItem(DEMO_STORAGE_KEY); void refresh(true); setToast('Demo workspace reset.'); } catch { setToast('Could not reset demo data.'); } } };

  const pending = data.hazards.filter(h => h.visibility === 'pending').length;
  const sectionLabel = NAV.find(item => item.id === section)?.label || 'Overview';
  const today = useMemo(() => new Intl.DateTimeFormat('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date()), []);

  if (auth === 'checking') return <div className="auth-loading"><LoadingState label="Checking administrator access…" /></div>;
  if (auth === 'login') return <Login onLogin={login} busy={authBusy} error={authError} note={gateUnlocked && !demo ? 'Nakapasok ka na sa secret door. Para maging shared sa lahat ng bisita ang mga pagbabago, mag-sign in gamit ang Supabase admin account ng barangay.' : undefined} />;
  return <div className={`admin-app ${embedded ? "admin-embed" : ""}`}>
    <SidebarNav section={section} setSection={setSection} pending={pending} demo={demo} email={email} onSignOut={signOut} open={mobileNav} onClose={() => setMobileNav(false)} />
    <div className="admin-main"><header className="admin-topbar"><div className="topbar-left"><button type="button" className="mobile-menu-button icon-button" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button><span className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{sectionLabel}</strong></span></div><div className="topbar-right"><span className={`topbar-mode ${demo ? 'demo' : ''}`}><i />{demo ? 'Demo mode' : 'Connected'}</span>{embedded
            ? <button type="button" className="topbar-public topbar-exit" onClick={onExit}><X size={15} /> Back to site</button>
            : <a href="./index.html" target="_blank" rel="noreferrer" className="topbar-public"><ExternalLink size={15} /> View public site</a>}<span className="topbar-divider" /><div className="topbar-avatar">{demo ? 'A' : (email[0] || 'A').toUpperCase()}</div><span className="topbar-user"><strong>{demo ? 'Admin' : 'Administrator'}</strong><small>Barangay San Jose</small></span><ChevronDown className="topbar-chevron" size={15} /></div></header>
      <main className="admin-content"><div className="content-wrap">
        <div className="content-meta"><span><i /> OPERATIONS DASHBOARD</span><span><CalendarDays size={14} /> {today} <b>·</b> PHT</span></div>
        {demo && <div className="demo-banner"><span className="demo-banner-icon"><AlertCircle size={15} /></span><span><strong>You're viewing sample data.</strong> Changes stay in this browser until a shared database is connected.</span><button onClick={() => setSection('settings')}>Connect database <ArrowRight size={14} /></button></div>}
        {loadError && <div className="error-banner"><AlertCircle size={17} /><span><strong>Could not load the latest data.</strong> {loadError}</span><button onClick={() => void refresh()}>Retry</button></div>}
        {loading ? <section className="panel"><LoadingState /></section> : <>
          {section === 'overview' && <Overview data={data} setSection={setSection} setFilter={setFilter} onAdd={() => setIncidentEditor(null)} onEdit={setIncidentEditor} onVisibility={toggleVisibility} onToggle={updateMap} busy={busy} />}
          {section === 'incidents' && <Incidents data={data} filter={filter} setFilter={setFilter} query={query} setQuery={setQuery} onAdd={() => setIncidentEditor(null)} onEdit={setIncidentEditor} onVisibility={toggleVisibility} onDelete={removeIncident} busy={busy} />}
          {section === 'map' && <MapPage data={data} busy={busy} onEdit={setIncidentEditor} onToggle={updateMap} onAdd={() => setIncidentEditor(null)} onVisibility={toggleVisibility} onDelete={removeIncident} />}
          {section === 'history' && <HistoryPage data={data} />}
          {section === 'centers' && <CentersPage data={data} onAdd={() => setCenterEditor(null)} onEdit={setCenterEditor} onDelete={removeCenter} />}
          {section === 'hotlines' && <HotlinesPage data={data} onAdd={() => setHotlineEditor(null)} onEdit={setHotlineEditor} onDelete={removeHotline} />}
          {section === 'help' && <HelpPage data={data} demo={demo} onAdd={() => setPlaceEditor(null)} onEdit={setPlaceEditor} onDelete={removePlace} openSettings={() => setSection('settings')} />}
          {section === 'settings' && <SettingsPage data={data} demo={demo} busy={busy} onToggle={updateMap} onBroadcast={url => run(() => saveContent('liveStreamUrl', url), 'Broadcast link updated.', { action: 'settings', title: url ? 'Broadcast link updated' : 'Broadcast link removed', detail: url || undefined })} onReset={resetDemo} />}
        </>}
      </div></main>
    </div>
    {incidentEditor !== undefined && <IncidentEditor key={incidentEditor?.id || 'new'} hazard={incidentEditor} busy={busy} onClose={() => setIncidentEditor(undefined)} onSave={saveIncident} onDelete={removeIncident} />}
    {centerEditor !== undefined && <CenterEditor key={centerEditor ?? 'new'} center={centerEditor === null ? null : data.evacuationCenters[centerEditor]} busy={busy} onClose={() => setCenterEditor(undefined)} onSave={center => run(() => saveContent('evacuationCenters', centerEditor === null ? [...data.evacuationCenters, center] : data.evacuationCenters.map((item, index) => index === centerEditor ? center : item)), 'Evacuation center saved.', { action: 'resources', title: centerEditor === null ? 'Evacuation center added' : 'Evacuation center updated', detail: center.name })} />}
    {hotlineEditor !== undefined && <HotlineEditor key={hotlineEditor ?? 'new'} contact={hotlineEditor === null ? null : data.emergencyContacts[hotlineEditor]} busy={busy} onClose={() => setHotlineEditor(undefined)} onSave={contact => run(() => saveContent('emergencyContacts', hotlineEditor === null ? [...data.emergencyContacts, contact] : data.emergencyContacts.map((item, index) => index === hotlineEditor ? contact : item)), 'Hotline saved.', { action: 'resources', title: hotlineEditor === null ? 'Hotline added' : 'Hotline updated', detail: `${contact.label} · ${contact.numbers.join(', ')}` })} />}
    {placeEditor !== undefined && <PlaceEditor key={placeEditor?.id || 'new'} place={placeEditor} busy={busy} onClose={() => setPlaceEditor(undefined)} onSave={place => run(() => savePlace(place), 'Help Center place saved.', { action: 'resources', title: 'Help Center place saved', detail: place.name })} />}
    {toast && <div className="admin-toast" role="status"><span>{toast.startsWith('Could not') ? <AlertCircle size={17} /> : <Check size={17} />}</span>{toast}<button aria-label="Dismiss message" onClick={() => setToast('')}><X size={15} /></button></div>}
  </div>;
}

/** Standalone page at /admin.html. */
export default function AdminApp() {
  return <AdminWorkspace />;
}
