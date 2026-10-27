import React, { useState } from 'react';
import { 
  HazardAlert, 
  HazardType, 
  HazardStatus 
} from '../types';
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
  Image as ImageIcon,
  X
} from 'lucide-react';

interface SidebarProps {
  alerts: HazardAlert[];
  selectedAlert: HazardAlert | null;
  onSelectAlert: (alert: HazardAlert) => void;
  onToggleAlertStatus: (id: string) => void;
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
  /** Closes the desktop/laptop feed panel (the X in the header). */
  onCloseDesktop?: () => void;
  /** ●●● options menu — lives in this header on mobile portrait. */
  onOpenUpdates?: () => void;
  onOpenEvacuationCenters?: () => void;
  onOpenResolvedCleared?: () => void;
  onOpenHistory?: () => void;
  /** Flood Prone / Traffic map open — greys out the ⊕ at ●●● buttons (all devices). */
  optionsDisabled?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  alerts,
  selectedAlert,
  onSelectAlert,
  onToggleAlertStatus,
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
  onCloseDesktop,
  onOpenUpdates = () => {},
  onOpenEvacuationCenters = () => {},
  onOpenResolvedCleared = () => {},
  onOpenHistory = () => {},
  optionsDisabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter alerts by search and active filters
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
        return <Flame className="w-3.5 h-3.5 text-red-500" />;
      case 'flood':
        return <Waves className="w-3.5 h-3.5 text-blue-500" />;
      case 'power':
        return <Zap className="w-3.5 h-3.5 text-amber-500" />;
      case 'streetlight':
        return <LightbulbOff className="w-3.5 h-3.5 text-indigo-600" />;
      case 'water':
        return <Droplets className="w-3.5 h-3.5 text-cyan-500" />;
      case 'road':
        return <AlertOctagon className="w-3.5 h-3.5 text-orange-500" />;
    }
  };

  const getTypeBg = (type: HazardType) => {
    switch (type) {
      case 'fire':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'flood':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'power':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'streetlight':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'water':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'road':
        return 'bg-orange-50 text-orange-700 border-orange-200';
    }
  };

  return (
    <aside
      /* Desktop/laptop: the panel is the INNER card (rounded, own hairline) —
         its looks come from index.css. Phones keep the plain drawer styling. */
      className="flex h-full w-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-xs lg:w-full lg:rounded-2xl lg:border"
    >
      {/* Compact header, search, and filters styled after the supplied screenshots. */}
      <div className="shrink-0 border-b border-slate-100 bg-[#f6f8fc] px-4 pb-2 pt-3.5 lg:rounded-t-2xl">
        <div className="flex items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="m-0 text-lg font-medium leading-6 tracking-tight text-[#1f1f1f]">Incident Feeds</h2>
              <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium leading-none text-[#5f6368] shadow-sm">
                {filteredAlerts.length}
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#5f6368]">
              <span className="truncate">Verified reports · Barangay San Jose</span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {/* Desktop/laptop only: closes the feed so the map gets full width.
                The rail's ☰ brings it back. Hidden on phones/tablets. */}
            <button
              type="button"
              id="btn-close-incident-feeds"
              onClick={() => onCloseDesktop?.()}
              aria-label="Close incident feeds"
              title="Close incident feeds"
              className="hidden lg:inline-flex h-8 w-8 items-center justify-center rounded-full text-[#5f6368] transition-colors hover:bg-[#e8eaed] active:scale-95"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
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

        <label className="mt-2.5 flex h-10 items-center gap-2.5 rounded-full bg-white px-3.5 text-[#5f6368] shadow-[0_1px_2px_rgba(60,64,67,.2),0_1px_3px_1px_rgba(60,64,67,.1)] focus-within:outline focus-within:outline-2 focus-within:outline-[#1a73e8]">
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <input
            id="input-hazard-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search street, sitio, or incident"
            aria-label="Search incident feeds"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-[#1f1f1f] outline-none placeholder:text-[#5f6368]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[#5f6368] hover:bg-slate-100"
            >
              ×
            </button>
          )}
        </label>

        <div className="-mx-1 mt-2 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {([
            ['all', 'All'],
            ['fire', 'Fire'],
            ['flood', 'Flood'],
            ['power', 'No Power'],
            ['streetlight', 'Streetlight'],
            ['water', 'Water'],
            ['road', 'Road'],
          ] as Array<[HazardType | 'all', string]>).map(([type, label]) => {
            const selected = activeFilterType === type;
            return (
              <button
                key={type}
                id={`filter-${type}`}
                type="button"
                aria-pressed={selected}
                onClick={() => setActiveFilterType(type)}
                className={`flex h-7 shrink-0 items-center gap-1 rounded-[9px] border px-2.5 text-[10px] font-semibold whitespace-nowrap transition-colors ${
                  selected
                    ? 'border-transparent bg-[#e8f0fe] text-[#1a73e8]'
                    : 'border-[#e3e6ec] bg-white text-[#1f1f1f] hover:bg-slate-50'
                }`}
              >
                {type !== 'all' && getTypeIcon(type)}
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 text-[8px] font-semibold uppercase tracking-wider text-[#8a9099]">Status:</span>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setActiveFilterStatus('all')}
              aria-pressed={activeFilterStatus === 'all'}
              className={`rounded-md px-1.5 py-1 text-[9px] font-medium ${activeFilterStatus === 'all' ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'text-[#5f6368] hover:bg-white'}`}
            >
              All ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterStatus('active')}
              aria-pressed={activeFilterStatus === 'active'}
              className={`rounded-md px-1.5 py-1 text-[9px] font-medium ${activeFilterStatus === 'active' ? 'bg-red-50 text-red-700' : 'text-[#5f6368] hover:bg-white'}`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterStatus('monitoring')}
              aria-pressed={activeFilterStatus === 'monitoring'}
              className={`rounded-md px-1.5 py-1 text-[9px] font-medium ${activeFilterStatus === 'monitoring' ? 'bg-amber-50 text-amber-800' : 'text-[#5f6368] hover:bg-white'}`}
            >
              Mon ({monitoringCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterStatus('resolved')}
              aria-pressed={activeFilterStatus === 'resolved'}
              className={`rounded-md px-1.5 py-1 text-[9px] font-medium ${activeFilterStatus === 'resolved' ? 'bg-slate-200 text-slate-700' : 'text-[#5f6368] hover:bg-white'}`}
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

      {/* Alert Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar bg-slate-50/30">
        {filteredAlerts.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">No matching incidents</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
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
                className="text-[11px] text-blue-600 font-semibold underline hover:text-blue-700"
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
                className={`group relative overflow-hidden p-3 rounded-xl border bg-white transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-300 shadow-md'
                    : isResolved
                    ? 'border-slate-200/80 opacity-70 hover:opacity-100 hover:border-slate-300'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                {/* Photo Proof Thumbnail if present */}
                {alert.photoUrl && (
                  <div className="relative -mx-3 -mt-3 mb-2 h-24 overflow-hidden rounded-t-[11px] bg-slate-100">
                    <img
                      src={alert.photoUrl}
                      alt={alert.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <span className={`absolute left-1 top-1 rounded-md bg-white/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide shadow-sm ${
                      alert.severity === 'critical' || alert.severity === 'high'
                        ? 'text-red-700'
                        : 'text-amber-800'
                    }`}>
                      {alert.severity}
                    </span>
                    <div className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded bg-slate-900/75 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-xs">
                      <Camera className="h-2.5 w-2.5 text-emerald-400" />
                      <span>Photo attached</span>
                    </div>
                  </div>
                )}

                {/* Type, severity, and status now sit directly below the photo. */}
                {/* Top Row: Icon + Type + Status */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${getTypeBg(alert.type)}`}>
                      {getTypeIcon(alert.type)}
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        {alert.type === 'streetlight' ? 'STREETLIGHT' : alert.type.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {isResolved ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-200 text-slate-700">
                        Resolved
                      </span>
                    ) : alert.status === 'monitoring' ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-800">
                        Monitoring
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-100 text-red-700">
                        Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xs font-bold leading-snug line-clamp-2 mb-1 text-slate-900">
                  {alert.title}
                </h3>

                {/* Location & Sitio */}
                <div className="flex items-center gap-1 text-[11px] mb-1 text-slate-600">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate font-medium">{alert.streetName}</span>
                </div>


                {/* Footer info: time & action */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1 font-mono text-[10px]">
                    <Clock className="w-3 h-3" />
                    <span>{alert.timeReported}</span>
                  </div>

                  <button
                    id={`btn-card-toggle-${alert.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleAlertStatus(alert.id);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                      isResolved
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        : 'bg-[#1a73e8] text-white hover:bg-blue-700'
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {isResolved ? 'Reopen' : 'Resolve'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Compact footer status bar from the supplied reference. */}
      <footer
        className="shrink-0 bg-slate-50 px-3 pt-2"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 shadow-[0_1px_2px_rgba(60,64,67,.25),0_1px_3px_1px_rgba(60,64,67,.12)]">
          <div className="min-w-0">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">Streetlights</span>
            <span className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-slate-800">
              <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
              Active survey
            </span>
          </div>
          <button
            type="button"
            disabled
            aria-label="Hotlines temporarily unavailable"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-red-600 px-3 text-[10px] font-bold text-white shadow-sm cursor-not-allowed"
          >
            <PhoneCall className="h-3.5 w-3.5" />
            <span>Hotlines</span>
          </button>
        </div>
      </footer>
    </aside>
  );
};
