import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Plus,
  Inbox,
  Flag,
  Archive,
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Flame,
  History,
  Info,
  LayoutDashboard,
  Lightbulb,
  LockKeyhole,
  LogOut,
  MapPin,
  Monitor,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserRound,
  Waves,
  X,
  Zap,
  Droplets,
  Construction,
} from 'lucide-react';
import { AdminIncidentForm } from './AdminIncidentForm';
import { AdminResolveRequests } from './AdminResolveRequests';
import { AdminFeedVisibility } from './AdminFeedVisibility';
import { VisitsMonitor } from './VisitsMonitor';
import type { HazardDraft, HazardAlert, HazardStatus, HazardType } from '../types';
import { TYPE_LABELS, type ResolveFlag } from '../lib/reportsApi';
import { AdminChange, ReportAction, reportAge, reportDate } from '../lib/admin';
import {
  filterAdminReports,
  reportCounts,
  ReportScope,
  ReportSort,
  StatusFilter,
} from '../lib/adminDashboard';
import './AdminDashboard.css';

interface Props {
  alerts: HazardAlert[];
  history: ReportAction[];
  flags: ResolveFlag[];
  hiddenTypes: HazardType[];
  onChange: (id: string, change: AdminChange) => Promise<void> | void;
  onClose: () => void;
  onLogout: () => void;
  syncError: string;
  loading?: boolean;
  onCreate: (draft: HazardDraft) => Promise<HazardAlert | undefined> | HazardAlert | undefined;
  onReviewFlag: (id: string, decision: 'accepted' | 'ignored') => Promise<void> | void;
  onSetHiddenTypes: (types: HazardType[]) => Promise<void> | void;
}
type Confirmation = { report: HazardAlert; type: 'delete' | 'visibility' | 'decline' };
const typeIcons = {
  flood: Waves,
  fire: Flame,
  power: Zap,
  streetlight: Lightbulb,
  water: Droplets,
  road: Construction,
};
const typeLabels: Record<HazardType, string> = {
  flood: 'Flood',
  fire: 'Fire',
  power: 'Power',
  streetlight: 'Streetlight',
  water: 'Water',
  road: 'Road',
};
const statusLabels: Record<HazardStatus, string> = {
  active: 'Active',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
};

function TypeIcon({ type }: { type: HazardType }) {
  const Icon = typeIcons[type] || CircleAlert;
  return (
    <span className={`sj-admin-type sj-admin-type-${type}`}>
      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}
function StatusBadge({ report }: { report: HazardAlert }) {
  return (
    <span
      className={`sj-admin-badge ${report.deletedAt ? 'sj-admin-badge-archived' : report.reviewStatus === 'pending' ? 'sj-admin-badge-monitoring' : report.reviewStatus === 'declined' ? 'sj-admin-badge-archived' : `sj-admin-badge-${report.status}`}`}
    >
      <i />
      {report.deletedAt
        ? 'Archived'
        : report.reviewStatus === 'pending'
          ? 'Pending'
          : report.reviewStatus === 'declined'
            ? 'Declined'
            : statusLabels[report.status]}
    </span>
  );
}
function TextDetail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="sj-admin-detail-value">
      <dt>{label}</dt>
      <dd>{value || 'Not provided'}</dd>
    </div>
  );
}

function ConfirmAction({
  confirmation,
  onCancel,
  onConfirm,
}: {
  confirmation: Confirmation;
  onCancel: () => void;
  onConfirm: (reason?: string) => void;
}) {
  const cancelButton = useRef<HTMLButtonElement>(null);
  const [reason, setReason] = useState('');
  const declining = confirmation.type === 'decline';
  const removing = confirmation.type === 'delete' || declining;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelButton.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div className="sj-admin-confirm-overlay">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sj-confirm-title"
        aria-describedby="sj-confirm-description"
        className="sj-admin-confirm"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onCancel();
          }
        }}
      >
        <span
          className={`sj-admin-confirm-icon ${declining ? 'is-decline' : removing ? 'is-destructive' : ''}`}
        >
          {declining ? <X size={25} /> : removing ? <Archive size={25} /> : <Eye size={25} />}
        </span>
        <h3 id="sj-confirm-title">
          {declining ? 'Decline this report?' : removing ? 'Remove this incident?' : 'Make this name public?'}
        </h3>
        <p id="sj-confirm-description">
          {declining
            ? 'The report will not appear on the public map. Its details stay in the Declined queue, and you can accept it later.'
            : removing
              ? 'This incident will disappear from public incident views. Its details and history stay in your archive, and you can restore it anytime.'
              : 'The reporter’s full name will appear on public incident views. Make sure you have their consent. Email and cellphone will stay out of public views.'}
        </p>
        <div className="sj-admin-confirm-subject">
          {removing ? confirmation.report.title : confirmation.report.reportedBy}
        </div>
        {declining && (
          <label className="sj-admin-decline-reason">
            Reason (optional)
            <textarea
              aria-label="Decline reason"
              maxLength={500}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        )}
        <div className="sj-admin-confirm-actions">
          <button
            ref={cancelButton}
            type="button"
            className="sj-admin-button sj-admin-button-quiet"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`sj-admin-button ${removing ? 'sj-admin-button-danger-solid' : 'sj-admin-button-primary'}`}
            onClick={() => onConfirm(reason)}
          >
            {declining ? 'Confirm decline' : removing ? 'Confirm removal' : 'Show name publicly'}
          </button>
        </div>
      </section>
    </div>
  );
}

export function AdminDashboard({
  alerts,
  history,
  flags,
  hiddenTypes,
  onChange,
  onClose,
  onLogout,
  syncError,
  loading = false,
  onCreate,
  onReviewFlag,
  onSetHiddenTypes,
}: Props) {
  const [tab, setTab] = useState<'reports' | 'history' | 'create' | 'flags'>('reports');
  const [scope, setScope] = useState<ReportScope>('current');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ReportSort>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [historyReport, setHistoryReport] = useState('all');
  const [historyActor, setHistoryActor] = useState('all');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [notice, setNotice] = useState('');
  const detailPanel = useRef<HTMLElement>(null);
  const reportListPanel = useRef<HTMLElement>(null);
  const main = useRef<HTMLElement>(null);
  const counts = reportCounts(alerts);
  const shown = filterAdminReports(alerts, scope, status, query, sort);
  const selected = shown.find((alert) => alert.id === selectedId) || shown[0];
  const events = history.filter(
    (event) =>
      (historyReport === 'all' || event.reportId === historyReport) &&
      (historyActor === 'all' || event.actor === historyActor),
  );
  const pendingFlags = flags.filter((flag) => flag.status === 'pending').length;
  const currentPage =
    tab === 'create'
      ? 'Add incident'
      : tab === 'flags'
        ? 'Resolve requests'
        : tab === 'history'
          ? 'History'
          : scope === 'archived'
            ? 'Archive'
            : scope === 'pending'
              ? 'Pending review'
              : scope === 'declined'
                ? 'Declined reports'
                : 'Reports';

  useEffect(() => {
    if (tab === 'create')
      main.current
        ?.querySelector<HTMLInputElement>('.sj-admin-create-form input')
        ?.focus({ preventScroll: true });
  }, [tab]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => {
      if (document.activeElement?.closest('.sj-admin-toast')) main.current?.focus({ preventScroll: true });
      setNotice('');
    }, 4500);
    return () => clearTimeout(timeout);
  }, [notice]);

  const change = (id: string, update: AdminChange) => {
    const finishFocus = () =>
      requestAnimationFrame(() => {
        if (document.activeElement === document.body)
          (main.current?.querySelector<HTMLElement>('input, button, select') || main.current)?.focus({
            preventScroll: true,
          });
      });
    Promise.resolve(onChange(id, update))
      .then(() => {
        finishFocus();
        setNotice(
          update.type === 'review'
            ? update.value === 'accepted'
              ? 'Report accepted and published.'
              : 'Report declined. It remains off the public map.'
            : update.type === 'delete'
              ? 'Incident moved to archive.'
              : update.type === 'restore'
                ? 'Incident restored. Its review state is unchanged.'
                : update.type === 'status'
                  ? 'Incident status updated.'
                  : update.value
                    ? 'Reporter name is now public.'
                    : 'Reporter name is now hidden.',
        );
      })
      .catch((cause: unknown) => {
        finishFocus();
        setNotice(cause instanceof Error ? cause.message : 'The server could not save that change.');
      });
  };
  const navigate = (destination: 'reports' | 'history' | 'archive' | 'pending' | 'declined' | 'flags') => {
    setTab(destination === 'history' ? 'history' : destination === 'flags' ? 'flags' : 'reports');
    setScope(
      destination === 'archive'
        ? 'archived'
        : destination === 'pending' || destination === 'declined'
          ? destination
          : 'current',
    );
    setStatus('all');
    setQuery('');
    setHistoryReport('all');
    setHistoryActor('all');
    main.current?.scrollTo({ top: 0 });
  };
  const openHistory = (id: string) => {
    setHistoryReport(id);
    setHistoryActor('all');
    setTab('history');
    main.current?.scrollTo({ top: 0 });
  };
  const navigation = (
    <>
      <button
        type="button"
        className={`sj-admin-nav-item ${tab === 'reports' && scope === 'current' ? 'is-active' : ''}`}
        aria-current={tab === 'reports' && scope === 'current' ? 'page' : undefined}
        aria-label={`Reports (${counts.total})`}
        onClick={() => navigate('reports')}
      >
        <LayoutDashboard size={18} />
        <span>Reports</span>
        <b>{counts.total}</b>
      </button>
      {(['pending', 'declined'] as const).map((queue) => (
        <button
          type="button"
          key={queue}
          className={`sj-admin-nav-item ${tab === 'reports' && scope === queue ? 'is-active' : ''}`}
          aria-label={`${queue === 'pending' ? 'Pending review' : 'Declined'} (${counts[queue]})`}
          aria-current={tab === 'reports' && scope === queue ? 'page' : undefined}
          onClick={() => navigate(queue)}
        >
          <Inbox size={18} />
          <span className="sj-admin-nav-long">{queue === 'pending' ? 'Pending review' : 'Declined'}</span>
          <span className="sj-admin-nav-short" aria-hidden="true">
            {queue === 'pending' ? 'Pending' : 'Declined'}
          </span>
          <b>{counts[queue]}</b>
        </button>
      ))}
      <button
        type="button"
        className={`sj-admin-nav-item ${tab === 'flags' ? 'is-active' : ''}`}
        aria-current={tab === 'flags' ? 'page' : undefined}
        aria-label={`Resolve requests (${pendingFlags})`}
        onClick={() => navigate('flags')}
      >
        <Flag size={18} />
        <span className="sj-admin-nav-long">Resolve requests</span>
        <span className="sj-admin-nav-short" aria-hidden="true">
          Resolves
        </span>
        <b>{pendingFlags}</b>
      </button>
      <button
        type="button"
        className={`sj-admin-nav-item ${tab === 'history' ? 'is-active' : ''}`}
        aria-current={tab === 'history' ? 'page' : undefined}
        aria-label={`History (${history.length})`}
        onClick={() => navigate('history')}
      >
        <History size={18} />
        <span>History</span>
        <b>{history.length}</b>
      </button>
      <button
        type="button"
        className={`sj-admin-nav-item ${tab === 'reports' && scope === 'archived' ? 'is-active' : ''}`}
        aria-current={tab === 'reports' && scope === 'archived' ? 'page' : undefined}
        aria-label={`Archive (${counts.archived})`}
        onClick={() => navigate('archive')}
      >
        <Archive size={18} />
        <span>Archive</span>
        <b>{counts.archived}</b>
      </button>
    </>
  );

  return (
    <div className="sj-admin-shell">
      <aside className="sj-admin-sidebar">
        <div className="sj-admin-brand">
          <span>
            <ShieldCheck size={24} />
          </span>
          <div>
            <strong>
              San Jose<span>.</span>
            </strong>
            <small>COMMUNITY WORKSPACE</small>
          </div>
        </div>
        <p className="sj-admin-nav-label">MANAGEMENT</p>
        <nav aria-label="Admin navigation">{navigation}</nav>
        <div className="sj-admin-sidebar-care">
          <span className="sj-admin-care-icon">
            <ShieldCheck size={22} strokeWidth={1.5} />
          </span>
          <strong>Community first.</strong>
          <p>
            A little care. A safer
            <br />
            San Jose, together.
          </p>
        </div>
        <div className="sj-admin-sidebar-bottom">
          <span>
            <Monitor size={15} />
            Shared workspace
          </span>
          <p>Live for every visitor</p>
        </div>
      </aside>

      <header className="sj-admin-header">
        <div className="sj-admin-header-title">
          <span className="sj-admin-header-breadcrumb">
            Workspace <ChevronRight size={13} /> {currentPage}
          </span>
          <h2 id="admin-title">Incident administration</h2>
        </div>
        <div className="sj-admin-header-actions">
          <span className="sj-admin-admin-avatar" aria-hidden="true">
            A
          </span>
          <button type="button" className="sj-admin-logout" onClick={onLogout}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
          <span className="sj-admin-header-divider" />
          <button
            type="button"
            aria-label="Close admin"
            title="Back to hazard map"
            className="sj-admin-icon-button"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
      </header>
      <nav className="sj-admin-mobile-nav" aria-label="Admin mobile navigation">
        {navigation}
      </nav>

      <main className={`sj-admin-main ${tab === 'create' ? 'is-creating' : ''}`} ref={main} tabIndex={-1}>
        {tab !== 'create' && (
          <div className="sj-admin-page-heading">
            <div>
              <p className="sj-admin-eyebrow">BARANGAY SAN JOSE · RODRIGUEZ, RIZAL</p>
              <h3>
                {tab === 'flags'
                  ? 'Resolve requests, reviewed fairly.'
                  : tab === 'history'
                    ? 'Every action, in one place.'
                    : scope === 'archived'
                      ? 'Out of sight. Not out of reach.'
                      : 'A clearer view of your community.'}
              </h3>
              <p>
                {tab === 'flags'
                  ? 'Residents can ask for an incident to be closed. Accept the request or ignore it here.'
                  : tab === 'history'
                    ? 'Follow report submissions and the decisions made along the way.'
                    : scope === 'archived'
                      ? 'Review removed incidents and bring them back whenever needed.'
                      : 'Review reports, care for your community, and keep everyone informed.'}
              </p>
            </div>
            {tab !== 'flags' && (
              <button
                type="button"
                className="sj-admin-button sj-admin-button-primary"
                onClick={() => {
                  setTab('create');
                  main.current?.scrollTo({ top: 0 });
                }}
              >
                <Plus size={17} />
                Add incident
              </button>
            )}
          </div>
        )}

        <div className="sj-admin-workspace-note">
          <Info size={16} />
          <p>
            <strong>Shared workspace.</strong> Reports, moderation decisions and category visibility are saved
            on the barangay server, so every visitor sees the same live map.
          </p>
        </div>
        {syncError && (
          <p className="sj-admin-storage-error" role="alert">
            {syncError}
          </p>
        )}

        {tab !== 'flags' && (
          <>
            <VisitsMonitor />
            <div className="sj-admin-review-summary">
              <Inbox size={18} />
              <div>
                <strong>
                  {counts.pending} {counts.pending === 1 ? 'report awaits' : 'reports await'} your review
                </strong>
                <p>
                  Community submissions stay off the public map until accepted. {counts.declined} declined.
                </p>
              </div>
              <button
                type="button"
                className="sj-admin-button sj-admin-button-quiet"
                onClick={() => navigate('pending')}
              >
                Review queue
                <ArrowRight size={14} />
              </button>
            </div>
            <section className="sj-admin-stats" aria-label="Incident overview">
              {(
                [
                  {
                    key: 'all',
                    title: 'Total reports',
                    count: counts.total,
                    Icon: FileText,
                    tone: 'blue',
                    hint: 'Currently on the website',
                  },
                  {
                    key: 'active',
                    title: 'Active incidents',
                    count: counts.active,
                    Icon: CircleAlert,
                    tone: 'red',
                    hint: 'Open community reports',
                  },
                  {
                    key: 'monitoring',
                    title: 'Monitoring',
                    count: counts.monitoring,
                    Icon: Activity,
                    tone: 'amber',
                    hint: 'Being monitored',
                  },
                  {
                    key: 'resolved',
                    title: 'Resolved',
                    count: counts.resolved,
                    Icon: CheckCheck,
                    tone: 'green',
                    hint: 'Marked as resolved',
                  },
                ] as const
              ).map((item) => (
                <button
                  type="button"
                  key={item.key}
                  className={`sj-admin-stat ${tab === 'reports' && scope === 'current' && status === item.key ? 'is-selected' : ''}`}
                  aria-label={`Filter ${item.title}: ${item.count}`}
                  aria-pressed={tab === 'reports' && scope === 'current' && status === item.key}
                  onClick={() => {
                    setTab('reports');
                    setScope('current');
                    setStatus(item.key);
                    setQuery('');
                  }}
                >
                  <span className="sj-admin-stat-label">
                    {item.title}
                    <span className={`sj-admin-stat-icon is-${item.tone}`}>
                      <item.Icon size={18} />
                    </span>
                  </span>
                  <strong>{item.count.toString().padStart(2, '0')}</strong>
                  <span className="sj-admin-stat-hint">
                    {item.hint}
                    <ArrowRight size={13} />
                  </span>
                </button>
              ))}
            </section>

            <AdminFeedVisibility
              hiddenTypes={hiddenTypes}
              onToggle={(type) => {
                const next = hiddenTypes.includes(type)
                  ? hiddenTypes.filter((value) => value !== type)
                  : [...hiddenTypes, type];
                Promise.resolve(onSetHiddenTypes(next))
                  .then(() =>
                    setNotice(
                      next.includes(type)
                        ? `${TYPE_LABELS[type]} hidden from public feeds.`
                        : `${TYPE_LABELS[type]} visible in public feeds again.`,
                    ),
                  )
                  .catch((cause: unknown) =>
                    setNotice(cause instanceof Error ? cause.message : 'Could not update the feeds.'),
                  );
              }}
            />
          </>
        )}
        {tab === 'flags' ? (
          <AdminResolveRequests
            flags={flags}
            onDecision={(id, decision) => {
              Promise.resolve(onReviewFlag(id, decision))
                .then(() =>
                  setNotice(
                    decision === 'accepted'
                      ? 'Resolve request accepted. The incident is now resolved.'
                      : 'Resolve request ignored. The incident stays on the map.',
                  ),
                )
                .catch((cause: unknown) =>
                  setNotice(cause instanceof Error ? cause.message : 'Could not update that request.'),
                );
            }}
          />
        ) : tab === 'create' ? (
          <AdminIncidentForm
            onCreate={onCreate}
            onCancel={() => navigate('reports')}
            onCreated={(report) => {
              navigate('reports');
              setSelectedId(report.id);
              setSort('newest');
              setNotice('Admin incident published to the Streets hazard map.');
            }}
          />
        ) : tab === 'reports' ? (
          <div className="sj-admin-report-layout">
            <section
              ref={reportListPanel}
              className="sj-admin-card sj-admin-reports"
              aria-labelledby="sj-reports-title"
            >
              <div className="sj-admin-section-header">
                <div>
                  <h3 id="sj-reports-title">
                    {scope === 'archived'
                      ? 'Archived incidents'
                      : scope === 'pending'
                        ? 'Pending review'
                        : scope === 'declined'
                          ? 'Declined reports'
                          : 'Incident reports'}
                    <span>{shown.length}</span>
                  </h3>
                  <p>Select an incident to review its full details.</p>
                </div>
                <button
                  type="button"
                  className="sj-admin-section-icon"
                  aria-label="Reset report filters"
                  title="Reset report filters"
                  onClick={() => {
                    setQuery('');
                    setStatus('all');
                    setSort('newest');
                  }}
                >
                  <RotateCcw size={17} />
                </button>
              </div>
              <div className="sj-admin-toolbar">
                <label className="sj-admin-search">
                  <Search size={17} />
                  <input
                    type="search"
                    aria-label="Search admin reports"
                    placeholder="Search reports, names, email…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery('')} aria-label="Clear admin search">
                      <X size={15} />
                    </button>
                  )}
                </label>
                <select
                  aria-label="Report archive filter"
                  value={scope}
                  onChange={(event) => {
                    setScope(event.target.value as ReportScope);
                    setStatus('all');
                  }}
                >
                  <option value="current">On website</option>
                  <option value="archived">Archived</option>
                  <option value="pending">Pending review</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
              <div className="sj-admin-list-controls">
                <div className="sj-admin-status-chips" aria-label="Filter incident status">
                  {(['all', 'active', 'monitoring', 'resolved'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={status === value}
                      className={status === value ? 'is-active' : ''}
                      onClick={() => setStatus(value)}
                    >
                      {value === 'all' ? 'All' : statusLabels[value]}
                    </button>
                  ))}
                </div>
                <label className="sj-admin-sort">
                  <ArrowDownUp size={13} />
                  <select
                    aria-label="Sort reports"
                    value={sort}
                    onChange={(event) => setSort(event.target.value as ReportSort)}
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="severity">By severity</option>
                  </select>
                </label>
              </div>
              <div className="sj-admin-list-labels" aria-hidden="true">
                <span>INCIDENT / LOCATION</span>
                <span>STATUS</span>
              </div>
              <div className="sj-admin-report-list">
                {shown.map((alert) => (
                  <button
                    type="button"
                    key={alert.id}
                    className={`sj-admin-report-row ${selected?.id === alert.id ? 'is-selected' : ''}`}
                    aria-label={`View report: ${alert.title}`}
                    aria-pressed={selected?.id === alert.id}
                    onClick={() => {
                      setSelectedId(alert.id);
                      if (window.matchMedia('(max-width: 1099px)').matches)
                        requestAnimationFrame(() => {
                          detailPanel.current?.scrollIntoView({
                            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                              ? 'auto'
                              : 'smooth',
                            block: 'start',
                          });
                          detailPanel.current?.focus({ preventScroll: true });
                        });
                    }}
                  >
                    <TypeIcon type={alert.type} />
                    <span className="sj-admin-report-summary">
                      <strong>{alert.title}</strong>
                      <span>
                        <MapPin size={11} />
                        {alert.streetName}
                      </span>
                      <small>
                        {typeLabels[alert.type]}
                        <i />
                        {alert.reportedAt ? reportAge(alert.reportedAt) : alert.timeReported}
                      </small>
                    </span>
                    <span className="sj-admin-row-end">
                      <StatusBadge report={alert} />
                      <ChevronRight size={15} />
                    </span>
                  </button>
                ))}
                {!shown.length && (
                  <div className="sj-admin-empty">
                    <span>{scope === 'archived' ? <Archive size={28} /> : <Search size={28} />}</span>
                    <h4>
                      {query || status !== 'all'
                        ? 'No matching incidents'
                        : scope === 'archived'
                          ? 'Your archive is clear'
                          : 'No reports yet'}
                    </h4>
                    <p>
                      {query || status !== 'all'
                        ? 'Try another search or reset your filters.'
                        : scope === 'archived'
                          ? 'Removed incidents will appear here, with their details and history intact.'
                          : 'New hazard reports will appear here when submitted in this browser.'}
                    </p>
                    {(query || status !== 'all') && (
                      <button
                        type="button"
                        className="sj-admin-text-button"
                        onClick={() => {
                          setQuery('');
                          setStatus('all');
                        }}
                      >
                        Reset filters
                      </button>
                    )}
                  </div>
                )}
              </div>
              <footer className="sj-admin-list-footer">
                <span>
                  {shown.length} {shown.length === 1 ? 'incident' : 'incidents'} shown
                </span>
                <span>
                  <Clock3 size={12} />
                  Philippine time
                </span>
              </footer>
            </section>

            <section
              ref={detailPanel}
              tabIndex={-1}
              className="sj-admin-card sj-admin-inspector"
              aria-label="Selected report details"
            >
              <div className="sj-admin-inspector-top">
                <span>
                  <FileText size={15} />
                  REPORT DETAILS
                </span>
                {selected && <StatusBadge report={selected} />}
              </div>
              {selected ? (
                <>
                  <button
                    type="button"
                    className="sj-admin-back-list"
                    onClick={() => {
                      reportListPanel.current?.scrollIntoView({ block: 'start' });
                      reportListPanel.current
                        ?.querySelector<HTMLElement>('.sj-admin-report-row.is-selected')
                        ?.focus({ preventScroll: true });
                    }}
                  >
                    <ArrowLeft size={14} />
                    Back to incident list
                  </button>
                  <div className="sj-admin-inspector-body">
                    <div className={`sj-admin-review-box is-${selected.reviewStatus || 'accepted'}`}>
                      <strong>
                        {selected.reviewStatus === 'pending'
                          ? 'Awaiting admin review'
                          : selected.reviewStatus === 'declined'
                            ? 'Report declined'
                            : selected.deletedAt
                              ? 'Accepted'
                              : 'Accepted / published'}
                        {selected.deletedAt ? ' · Archived' : ''}
                      </strong>
                      <p>
                        {selected.deletedAt
                          ? 'Archived incidents are not shown on the public map.'
                          : selected.reviewStatus === 'pending'
                            ? 'This report is private until an admin accepts it.'
                            : selected.reviewStatus === 'declined'
                              ? 'Not shown on the public map. You can accept this report after reconsideration.'
                              : 'This incident is visible on the public Streets hazard map.'}
                      </p>
                      {selected.reviewedAt && <small>Reviewed: {reportDate(selected.reviewedAt)}</small>}
                      {selected.declineReason && <p>Reason: {selected.declineReason}</p>}
                      {!selected.deletedAt &&
                        (selected.reviewStatus === 'pending' || selected.reviewStatus === 'declined') && (
                          <div>
                            <button
                              type="button"
                              className="sj-admin-button sj-admin-button-primary"
                              onClick={() => change(selected.id, { type: 'review', value: 'accepted' })}
                            >
                              <Check size={15} />
                              Accept report
                            </button>
                            {selected.reviewStatus === 'pending' && (
                              <button
                                type="button"
                                className="sj-admin-button sj-admin-button-danger"
                                onClick={() => setConfirmation({ report: selected, type: 'decline' })}
                              >
                                Decline report
                              </button>
                            )}
                          </div>
                        )}
                    </div>
                    <div className="sj-admin-inspector-title">
                      <span className={`sj-admin-severity is-${selected.severity}`}>
                        <i />
                        {selected.severity} severity
                      </span>
                      <h3>{selected.title}</h3>
                      <p>
                        <MapPin size={14} />
                        {selected.streetName} — {selected.sitio}
                      </p>
                      <span className="sj-admin-report-id">{selected.id}</span>
                    </div>
                    <div className="sj-admin-inspector-section">
                      <h4>
                        <UserRound size={15} />
                        Reporter information
                        <span className="sj-admin-private-pill">
                          <LockKeyhole size={10} />
                          Admin view
                        </span>
                      </h4>
                      <p className="sj-admin-section-note">
                        Contact details are not shown in public incident views.
                      </p>
                      <dl className="sj-admin-reporter-data">
                        <TextDetail label="Full name" value={selected.reportedBy} />
                        <TextDetail label="Email" value={selected.reporterEmail} />
                        <TextDetail label="Cellphone number" value={selected.contactNumber} />
                      </dl>
                    </div>
                    {!selected.deletedAt && (
                      <div className="sj-admin-inspector-section sj-admin-manage-section">
                        <h4>
                          <SlidersHorizontal size={15} />
                          Manage incident
                        </h4>
                        <label className="sj-admin-status-field">
                          <span>Incident status</span>
                          <select
                            aria-label={`Status for ${selected.title}`}
                            value={selected.status}
                            onChange={(event) =>
                              change(selected.id, {
                                type: 'status',
                                value: event.target.value as HazardStatus,
                              })
                            }
                          >
                            {(['active', 'monitoring', 'resolved'] as const).map((value) => (
                              <option key={value} value={value}>
                                {statusLabels[value]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="sj-admin-visibility">
                          <span className="sj-admin-visibility-icon">
                            {selected.showReporter ? <Eye size={18} /> : <EyeOff size={18} />}
                          </span>
                          <span>
                            <strong>Display reporter name publicly</strong>
                            <small>
                              {selected.showReporter
                                ? selected.deletedAt ||
                                  (selected.reviewStatus && selected.reviewStatus !== 'accepted')
                                  ? 'Name will be visible if this incident is published.'
                                  : 'Name is visible in public incident views.'
                                : 'Reporter name is hidden from public views.'}
                            </small>
                          </span>
                          <input
                            type="checkbox"
                            role="switch"
                            checked={!!selected.showReporter}
                            onChange={(event) =>
                              event.target.checked
                                ? setConfirmation({ report: selected, type: 'visibility' })
                                : change(selected.id, { type: 'visibility', value: false })
                            }
                          />
                        </label>
                        <p className="sj-admin-consent-note">
                          Only publish a name with consent. Email and phone stay out of public views; browser
                          storage is not a privacy boundary.
                        </p>
                      </div>
                    )}
                    <div className="sj-admin-inspector-section">
                      <h4>
                        <Clock3 size={15} />
                        Report timeline
                      </h4>
                      <dl className="sj-admin-timing-data">
                        <TextDetail
                          label="Reported on"
                          value={
                            selected.reportedAt
                              ? reportDate(selected.reportedAt)
                              : `Exact date not recorded · ${selected.timeReported}`
                          }
                        />
                        <TextDetail label="Time elapsed" value={reportAge(selected.reportedAt)} />
                        <TextDetail
                          label="Last update"
                          value={
                            selected.lastUpdated && Number.isFinite(Date.parse(selected.lastUpdated))
                              ? reportDate(selected.lastUpdated)
                              : selected.lastUpdated
                          }
                        />
                        {selected.deletedAt && (
                          <TextDetail label="Removed on" value={reportDate(selected.deletedAt)} />
                        )}
                      </dl>
                    </div>
                    <div className="sj-admin-inspector-section">
                      <h4>
                        <FileText size={15} />
                        Incident information
                      </h4>
                      <p className="sj-admin-description">
                        {selected.description || 'No description provided.'}
                      </p>
                      <dl className="sj-admin-extra-data">
                        <TextDetail label="Hazard type" value={typeLabels[selected.type]} />
                        <TextDetail label="Coordinates" value={selected.coordinates.join(', ')} />
                        <TextDetail label="Affected households" value={selected.affectedHouseholds} />
                        <TextDetail label="Evacuation center" value={selected.evacuationCenter} />
                      </dl>
                    </div>
                  </div>
                  <div className="sj-admin-inspector-actions">
                    <button
                      type="button"
                      className="sj-admin-button sj-admin-button-quiet"
                      onClick={() => openHistory(selected.id)}
                    >
                      <History size={15} />
                      View report history
                    </button>
                    {selected.deletedAt ? (
                      <button
                        type="button"
                        className="sj-admin-button sj-admin-button-primary"
                        onClick={() => change(selected.id, { type: 'restore' })}
                      >
                        <RotateCcw size={15} />
                        Restore incident
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="sj-admin-button sj-admin-button-danger"
                        onClick={() => setConfirmation({ report: selected, type: 'delete' })}
                      >
                        <Trash2 size={15} />
                        Remove incident
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="sj-admin-empty sj-admin-empty-detail">
                  <span>
                    <FileText size={28} />
                  </span>
                  <h4>Room for the details</h4>
                  <p>Select a report from the list to see reporter information and manage the incident.</p>
                </div>
              )}
            </section>
          </div>
        ) : (
          <section className="sj-admin-card sj-admin-history" aria-labelledby="sj-history-title">
            <div className="sj-admin-section-header">
              <div>
                <h3 id="sj-history-title">
                  Activity history<span>{events.length}</span>
                </h3>
                <p>A timeline of submissions, updates, and admin decisions.</p>
              </div>
              <span className="sj-admin-section-icon">
                <History size={20} />
              </span>
            </div>
            <div className="sj-admin-history-filters">
              <label>
                <span>Report</span>
                <select
                  aria-label="Filter history by report"
                  value={historyReport}
                  onChange={(event) => setHistoryReport(event.target.value)}
                >
                  <option value="all">All reports</option>
                  {alerts.map((alert) => (
                    <option key={alert.id} value={alert.id}>
                      {alert.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Action author</span>
                <select
                  aria-label="Filter history by author"
                  value={historyActor}
                  onChange={(event) => setHistoryActor(event.target.value)}
                >
                  <option value="all">Everyone</option>
                  <option value="admin">Admin</option>
                  <option value="reporter">Reporter</option>
                  <option value="public">Residents</option>
                </select>
              </label>
            </div>
            <div className="sj-admin-history-note">
              <Info size={14} />
              <span>
                Every submission, moderation decision and resolve request is recorded on the barangay server,
                so the trail is the same for every administrator.
              </span>
            </div>
            <div className="sj-admin-timeline">
              {events.map((event) => (
                <article key={event.id} className="sj-admin-event">
                  <span className={`sj-admin-event-icon ${event.actor === 'reporter' ? 'is-reporter' : ''}`}>
                    {event.actor === 'admin' ? (
                      <History size={16} />
                    ) : event.actor === 'reporter' ? (
                      <UserRound size={16} />
                    ) : (
                      <Flag size={16} />
                    )}
                  </span>
                  <div>
                    <div className="sj-admin-event-meta">
                      <span>
                        {event.actor === 'admin'
                          ? 'ADMIN ACTION'
                          : event.actor === 'public'
                            ? 'RESIDENT REQUEST'
                            : 'REPORT SUBMITTED'}
                      </span>
                      <time dateTime={event.at}>{reportDate(event.at)}</time>
                    </div>
                    <h4>{event.action}</h4>
                    <p>{event.title}</p>
                    <span className="sj-admin-event-id">
                      {event.reportId} · {reportAge(event.at)}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Review report: ${event.title}`}
                    className="sj-admin-icon-button"
                    onClick={() => {
                      const report = alerts.find((alert) => alert.id === event.reportId);
                      if (report) {
                        setSelectedId(report.id);
                        setScope(
                          report.deletedAt
                            ? 'archived'
                            : report.reviewStatus === 'pending' || report.reviewStatus === 'declined'
                              ? report.reviewStatus
                              : 'current',
                        );
                        setStatus('all');
                        setQuery('');
                        setTab('reports');
                      }
                    }}
                  >
                    <ArrowRight size={17} />
                  </button>
                </article>
              ))}
            </div>
            {!events.length && (
              <div className="sj-admin-empty">
                <span>
                  <History size={28} />
                </span>
                <h4>No activity to show yet</h4>
                <p>
                  New reports and admin actions will appear here. Try another filter if you’re looking for a
                  specific report.
                </p>
                {(historyReport !== 'all' || historyActor !== 'all') && (
                  <button
                    type="button"
                    className="sj-admin-text-button"
                    onClick={() => {
                      setHistoryReport('all');
                      setHistoryActor('all');
                    }}
                  >
                    Clear history filters
                  </button>
                )}
              </div>
            )}
          </section>
        )}
        <footer className="sj-admin-page-footer">
          <span>
            <ShieldCheck size={13} />
            Made for a safer San Jose.
          </span>
          <span>San Jose admin workspace · Times in Asia/Manila</span>
        </footer>
      </main>
      {notice && (
        <div className="sj-admin-toast" role="status">
          <span>
            <Check size={16} />
          </span>
          {notice}
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => {
              setNotice('');
              main.current?.focus({ preventScroll: true });
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {confirmation && (
        <ConfirmAction
          confirmation={confirmation}
          onCancel={() => setConfirmation(null)}
          onConfirm={(reason) => {
            change(
              confirmation.report.id,
              confirmation.type === 'decline'
                ? { type: 'review', value: 'declined', reason }
                : confirmation.type === 'delete'
                  ? { type: 'delete' }
                  : { type: 'visibility', value: true },
            );
            setConfirmation(null);
            if (confirmation.type === 'delete')
              requestAnimationFrame(() =>
                main.current
                  ?.querySelector<HTMLInputElement>('input[type="search"]')
                  ?.focus({ preventScroll: true }),
              );
          }}
        />
      )}
    </div>
  );
}
