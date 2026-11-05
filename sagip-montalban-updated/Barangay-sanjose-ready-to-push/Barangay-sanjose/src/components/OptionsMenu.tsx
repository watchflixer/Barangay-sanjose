import React, { useState } from 'react';
import { 
  HazardAlert, 
  HazardType, 
  HazardStatus 
} from '../types';
import { formatReportedTime, isAdminSearch, reportDate } from '../lib/admin';
import { useLiveNow } from '../hooks/useLiveNow';
import { WaterLevelLiveBanner } from './WaterLevelLiveBanner';
import { OptionsMenu } from './OptionsMenu';
import { ReportButton } from './ReportButton';
import { 
  Search, 
  Flame, 
  Waves, 
  Zap, 
  LightbulbOff,
  Droplets, 
  AlertOctagon, 
  MapPin, 
  Clock, 
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Radio,
  PlusCircle,
  PhoneCall,
  ShieldCheck,
  Camera,
  Image as ImageIcon
} from 'lucide-react';

interface SidebarProps {
  onOpenAdmin?: () => void;
  alerts: HazardAlert[];
  hiddenTypes?: HazardType[];
  selectedAlert: HazardAlert | null;
  onSelectAlert: (alert: HazardAlert) => void;
  onRequestResolved: (alert: HazardAlert) => void;
  onOpenReportModal: () => void;
  onOpenHotlinesModal: () => void;
  activeFilterType: HazardType | 'all';
  setActiveFilterType: (type: HazardType | 'all') => void;
  activeFilterStatus: HazardStatus | 'all';
  setActiveFilterStatus: (status: HazardStatus | 'all') => void;
  liveUrl?: string;
  onOpenLiveModal?: () => void;
  onRemoveLive?: () => void;
  onClose?: () => void;
  onOpenUpdates?: () => void;
  onOpenEvacuationCenters?: () => void;
  onOpenResolvedCleared?: () => void;
  onOpenHistory?: () => void;
  optionsDisabled?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  alerts,
  hiddenTypes = [],
  selectedAlert,
  onSelectAlert,
  onRequestResolved,
  onOpenReportModal,
  onOpenHotlinesModal,
  activeFilterType,
  setActiveFilterType,
  activeFilterStatus,
  setActiveFilterStatus,
  liveUrl = '',
  onOpenLiveModal = () => {},
  onRemoveLive = () => {},
  onClose,
  onOpenUpdates = () => {},
  onOpenEvacuationCenters = () => {},
  onOpenResolvedCleared = () => {},
  onOpenHistory = () => {},
  optionsDisabled = false,
  onOpenAdmin,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const now = useLiveNow();

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      searchQuery === '' ||
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.streetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.sitio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      activeFilterType === 'all' || alert.type === activeFilterType;

    const matchesStatus =
      activeFilterStatus === 'all' || alert.status === activeFilterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const activeCount = alerts.filter((a) => a.status === 'active').length;
  const monitoringCount = alerts.filter((a) => a.status === 'monitoring').length;
  const resolvedCount = alerts.filter((a) => a.status === 'resolved').length;

  const getTypeIcon = (type: HazardType) => {
    switch (type) {
      case 'fire':
        return <Flame className="h-3.5 w-3.5 text-red-500" />;
      case 'flood':
        return <Waves className="h-3.5 w-3.5 text-blue-500" />;
      case 'power':
        return <Zap className="h-3.5 w-3.5 text-amber-500" />;
      case 'streetlight':
        return <LightbulbOff className="h-3.5 w-3.5 text-indigo-500" />;
      case 'water':
        return <Droplets className="h-3.5 w-3.5 text-cyan-500" />;
      case 'road':
        return <AlertOctagon className="h-3.5 w-3.5 text-orange-500" />;
    }
  };

  const getTypeBg = (type: HazardType) => {
    switch (type) {
      case 'fire':
        return 'border-red-200 bg-red-50 text-red-700';
      case 'flood':
        return 'border-blue-200 bg-blue-50 text-blue-700';
      case 'power':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'streetlight':
        return 'border-indigo-200 bg-indigo-50 text-indigo-700';
      case 'water':
        return 'border-cyan-200 bg-cyan-50 text-cyan-700';
      case 'road':
        return 'border-orange-200 bg-orange-50 text-orange-700';
    }
  };

  return (
    <aside className="flex h-full w-full min-h-0 shrink-0 flex-col overflow-hidden bg-white lg:w-full lg:border-0 lg:shadow-none">
      <div className="shrink-0 border-b border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 pb-2 pt-3.5 lg:bg-white">
        <div className="flex items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="m-0 text-lg font-bold leading-6 tracking-[-0.04em] text-slate-900">Incident Feeds</h2>
              <span className="rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold leading-none text-slate-600 shadow-sm">
                {filteredAlerts.length}
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="truncate">Verified reports · Barangay San Jose</span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <ReportButton
              id="btn-report-hazard-mobile"
              className="hidden portrait:inline-flex"
              disabled={optionsDisabled}
              onClick={onOpenReportModal}
            />
            <OptionsMenu
              className="hidden portrait:inline-flex"
              anchor="row"
              disabled
              onOpenUpdates={onOpenUpdates}
              onOpenEvacuationCenters={onOpenEvacuationCenters}
              onOpenResolvedCleared={onOpenResolvedCleared}
              onOpenHistory={onOpenHistory}
            />
          </div>
        </div>

        <label className="mt-2.5 flex h-11 items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 text-slate-500 shadow-[0_6px_18px_rgba(15,23,42,0.04)] transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <input
            id="input-hazard-search"
            type="search"
            value={searchQuery}
            onChange={(e) => {
              if (isAdminSearch(e.target.value)) { setSearchQuery(''); onOpenAdmin?.(); }
              else setSearchQuery(e.target.value);
            }}
            placeholder="Search street, sitio, or incident"
            aria-label="Search incident feeds"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-900 outline-none placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100"
            >
              ×
            </button>
          )}
        </label>

        <div className="-mx-1 mt-2.5 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {([
            ['all', 'All'],
            ['fire', 'Fire'],
            ['flood', 'Flood'],
            ['power', 'No Power'],
            ['streetlight', 'Streetlight'],
            ['water', 'Water'],
            ['road', 'Road'],
          ] as Array<[HazardType | 'all', string]>)
            .filter(([type]) => type === 'all' || !hiddenTypes.includes(type as HazardType))
            .map(([type, label]) => {
              const selected = activeFilterType === type;
              return (
                <button
                  key={type}
                  id={`filter-${type}`}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActiveFilterType(type)}
                  className={`flex h-8 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-[10px] font-bold whitespace-nowrap transition-all ${
                    selected
                      ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-[0_8px_20px_rgba(37,99,235,0.08)]'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {type !== 'all' && getTypeIcon(type)}
                  <span>{label}</span>
                </button>
              );
            })}
        </div>

        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">Status:</span>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setActiveFilterStatus('all')}
              aria-pressed={activeFilterStatus === 'all'}
              className={`rounded-lg px-1.5 py-1 text-[9px] font-semibold ${activeFilterStatus === 'all' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-white'}`}
            >
              All ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterStatus('active')}
              aria-pressed={activeFilterStatus === 'active'}
              className={`rounded-lg px-1.5 py-1 text-[9px] font-semibold ${activeFilterStatus === 'active' ? 'bg-red-50 text-red-700' : 'text-slate-500 hover:bg-white'}`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterStatus('monitoring')}
              aria-pressed={activeFilterStatus === 'monitoring'}
              className={`rounded-lg px-1.5 py-1 text-[9px] font-semibold ${activeFilterStatus === 'monitoring' ? 'bg-amber-50 text-amber-800' : 'text-slate-500 hover:bg-white'}`}
            >
              Mon ({monitoringCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterStatus('resolved')}
              aria-pressed={activeFilterStatus === 'resolved'}
              className={`rounded-lg px-1.5 py-1 text-[9px] font-semibold ${activeFilterStatus === 'resolved' ? 'bg-slate-200 text-slate-700' : 'text-slate-500 hover:bg-white'}`}
            >
              Done ({resolvedCount})
            </button>
          </div>
        </div>
      </div>

      <WaterLevelLiveBanner
        liveUrl={liveUrl}
        onOpenEditModal={onOpenLiveModal}
        onRemoveLive={onRemoveLive}
      />

      <div className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50/40 p-3 lg:bg-white">
        {filteredAlerts.length === 0 ? (
          <div className="space-y-3 py-12 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">No matching incidents</p>
              <p className="mx-auto mt-1 max-w-xs text-[11px] text-slate-500">
                No reports match your current filter in Barangay San Jose.
              </p>
            </div>
            {(searchQuery || activeFilterType !== 'all' || activeFilterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilterType('all');
                  setActiveFilterStatus('all');
                }}
                className="text-[11px] font-semibold text-blue-600 underline decoration-blue-200 underline-offset-4 hover:text-blue-700"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isSelected = selectedAlert?.id === alert.id;
            const isResolved = alert.status === 'resolved';

            return (
              <div
                key={alert.id}
                id={`alert-card-${alert.id}`}
                onClick={() => {
                  onSelectAlert(alert);
                  onClose?.();
                }}
                className={`group relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-3 transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-300 bg-blue-50/30 shadow-[0_18px_30px_rgba(37,99,235,0.08)]'
                    : isResolved
                    ? 'border-slate-200/80 opacity-75 hover:opacity-100 hover:border-slate-300 hover:shadow-[0_10px_20px_rgba(15,23,42,0.04)]'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-[0_10px_20px_rgba(15,23,42,0.04)]'
                }`}
              >
                {alert.photoUrl && (
                  <div className="relative -mx-3 -mt-3 mb-2 h-24 overflow-hidden rounded-t-[17px] bg-slate-100">
                    <img
                      src={alert.photoUrl}
                      alt={alert.title}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
                    />
                    <span className={`absolute left-2 top-2 rounded-lg bg-white/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] shadow-sm ${
                      alert.severity === 'critical' || alert.severity === 'high'
                        ? 'text-red-700'
                        : 'text-amber-800'
                    }`}>
                      {alert.severity}
                    </span>
                    <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm">
                      <Camera className="h-2.5 w-2.5 text-emerald-400" />
                      <span>Photo attached</span>
                    </div>
                  </div>
                )}

                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border ${getTypeBg(alert.type)}`}>
                      {getTypeIcon(alert.type)}
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        {alert.type === 'streetlight' ? 'STREETLIGHT' : alert.type.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {isResolved ? (
                      <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold text-slate-700">
                        Resolved
                      </span>
                    ) : alert.status === 'monitoring' ? (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                        Monitoring
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-700">
                        Active
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="mb-1 text-xs font-bold leading-snug text-slate-900 line-clamp-2">
                  {alert.title}
                </h3>

                <div className="mb-1 flex items-start gap-1 text-[11px] text-slate-600">
                  <MapPin className="mt-[1px] h-3 w-3 shrink-0 text-slate-400" />
                  <span className="min-w-0 break-words font-medium" title={alert.streetName}>
                    {alert.streetName}
                  </span>
                </div>

                <p className="mb-2 break-words text-[10px] text-slate-500">Reported by: {alert.reportedBy}</p>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                  <div
                    className="flex items-center gap-1 font-mono text-[10px]"
                    title={alert.reportedAt ? reportDate(alert.reportedAt) : undefined}
                  >
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>{formatReportedTime(alert, now)}</span>
                  </div>

                  {!isResolved && <button
                    id={`btn-card-resolve-${alert.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestResolved(alert);
                    }}
                    disabled={!!alert.pendingResolveFlags}
                    title={
                      alert.pendingResolveFlags
                        ? 'A resolve request is already waiting for admin review.'
                        : 'Ask the barangay admin to mark this incident resolved.'
                    }
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {alert.pendingResolveFlags ? 'Request pending' : 'Flag as resolved'}
                  </button>}
                </div>
              </div>
            );
          })
        )}
      </div>

      <footer
        className="shrink-0 bg-slate-50 px-3 pt-2 lg:bg-white"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-[0_10px_22px_rgba(15,23,42,0.04)]">
          <div className="min-w-0">
            <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">Streetlights</span>
            <span className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-slate-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Active survey
            </span>
          </div>
          <button
            type="button"
            disabled
            aria-label="Hotlines temporarily unavailable"
            className="inline-flex h-8 shrink-0 cursor-not-allowed items-center gap-1.5 rounded-full bg-red-600/95 px-3 text-[10px] font-bold text-white shadow-sm"
          >
            <PhoneCall className="h-3.5 w-3.5" />
            <span>Hotlines</span>
          </button>
        </div>
      </footer>
    </aside>
  );
};










































































