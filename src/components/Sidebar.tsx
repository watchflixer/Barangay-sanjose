import React, { useState } from 'react';
import { 
  HazardAlert, 
  HazardType, 
  HazardStatus 
} from '../types';
import { WaterLevelLiveBanner } from './WaterLevelLiveBanner';
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
  Building2,
  Camera,
  Image as ImageIcon
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
    <aside className="w-full lg:w-96 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden shadow-xs shrink-0">
      {/* Top Header & Search */}
      <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span>Incident Feeds</span>
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-900 text-white">
                {filteredAlerts.length}
              </span>
            </h2>
            <p className="text-[10px] text-slate-500 font-medium">Verified reports in Barangay San Jose</p>
          </div>
          <button
            id="btn-sidebar-report"
            onClick={onOpenReportModal}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md shadow-2xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Report</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-hazard-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search street, sitio, or incident..."
            className="w-full pl-8 pr-4 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Hazard Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar text-xs">
          <button
            id="filter-all"
            onClick={() => setActiveFilterType('all')}
            className={`px-2.5 py-1 rounded-md font-semibold text-[11px] whitespace-nowrap transition-colors ${
              activeFilterType === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            All
          </button>
          <button
            id="filter-fire"
            onClick={() => setActiveFilterType('fire')}
            className={`px-2 py-1 rounded-md font-semibold text-[11px] whitespace-nowrap flex items-center gap-1 transition-colors ${
              activeFilterType === 'fire'
                ? 'bg-red-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-red-50'
            }`}
          >
            <Flame className="w-3 h-3 text-red-500" />
            <span>Fire</span>
          </button>
          <button
            id="filter-flood"
            onClick={() => setActiveFilterType('flood')}
            className={`px-2 py-1 rounded-md font-semibold text-[11px] whitespace-nowrap flex items-center gap-1 transition-colors ${
              activeFilterType === 'flood'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-blue-50'
            }`}
          >
            <Waves className="w-3 h-3 text-blue-500" />
            <span>Flood</span>
          </button>
          <button
            id="filter-power"
            onClick={() => setActiveFilterType('power')}
            className={`px-2 py-1 rounded-md font-semibold text-[11px] whitespace-nowrap flex items-center gap-1 transition-colors ${
              activeFilterType === 'power'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-50'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-500" />
            <span>No Power</span>
          </button>
          <button
            id="filter-streetlight"
            onClick={() => setActiveFilterType('streetlight')}
            className={`px-2 py-1 rounded-md font-semibold text-[11px] whitespace-nowrap flex items-center gap-1 transition-colors ${
              activeFilterType === 'streetlight'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-indigo-50'
            }`}
          >
            <LightbulbOff className="w-3 h-3 text-indigo-600" />
            <span>Streetlight</span>
          </button>
          <button
            id="filter-water"
            onClick={() => setActiveFilterType('water')}
            className={`px-2 py-1 rounded-md font-semibold text-[11px] whitespace-nowrap flex items-center gap-1 transition-colors ${
              activeFilterType === 'water'
                ? 'bg-cyan-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-cyan-50'
            }`}
          >
            <Droplets className="w-3 h-3 text-cyan-500" />
            <span>Water</span>
          </button>
        </div>

        {/* Status Filter Sub-bar */}
        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
          <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Status:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveFilterStatus('all')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                activeFilterStatus === 'all'
                  ? 'bg-slate-200 text-slate-800'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All ({alerts.length})
            </button>
            <button
              onClick={() => setActiveFilterStatus('active')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                activeFilterStatus === 'active'
                  ? 'bg-red-100 text-red-800'
                  : 'text-slate-500 hover:text-red-700'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setActiveFilterStatus('monitoring')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                activeFilterStatus === 'monitoring'
                  ? 'bg-amber-100 text-amber-800'
                  : 'text-slate-500 hover:text-amber-700'
              }`}
            >
              Mon ({monitoringCount})
            </button>
            <button
              onClick={() => setActiveFilterStatus('resolved')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                activeFilterStatus === 'resolved'
                  ? 'bg-slate-200 text-slate-700'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Done ({resolvedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Bayan ng Montalban FB Live Water Level Monitoring Banner (Only renders when liveUrl is present) */}
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
                onClick={() => onSelectAlert(alert)}
                className={`group relative p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-1 ring-slate-900'
                    : isResolved
                    ? 'bg-slate-50 border-slate-200/80 opacity-70 hover:opacity-100 hover:bg-white hover:border-slate-300'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                {/* Top Row: Icon + Type + Status */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${
                        isSelected ? 'bg-slate-800 border-slate-700' : getTypeBg(alert.type)
                      }`}
                    >
                      {getTypeIcon(alert.type)}
                    </div>
                    <div>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-widest ${
                          isSelected ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {alert.type === 'streetlight' ? 'STREETLIGHT' : alert.type.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {alert.severity === 'critical' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-red-500 text-white">
                        Critical
                      </span>
                    )}
                    {alert.severity === 'high' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-orange-500 text-white">
                        High
                      </span>
                    )}
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
                <h3
                  className={`text-xs font-bold leading-snug line-clamp-2 mb-1 ${
                    isSelected ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {alert.title}
                </h3>

                {/* Photo Proof Thumbnail if present */}
                {alert.photoUrl && (
                  <div className="mb-2 rounded-md overflow-hidden border border-slate-200/60 relative h-24 bg-slate-100">
                    <img 
                      src={alert.photoUrl} 
                      alt={alert.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                    />
                    <div className="absolute top-1 right-1 bg-slate-900/75 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                      <Camera className="w-2.5 h-2.5 text-emerald-400" />
                      <span>Proof Attached</span>
                    </div>
                  </div>
                )}

                {/* Location & Sitio */}
                <div
                  className={`flex items-center gap-1 text-[11px] mb-1 ${
                    isSelected ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate font-medium">{alert.streetName}</span>
                </div>

                {/* Subtitle / Sitio Tag */}
                <div
                  className={`text-[10px] truncate mb-2 ${
                    isSelected ? 'text-slate-400' : 'text-slate-400'
                  }`}
                >
                  Sitio: {alert.sitio}
                </div>

                {/* Footer info: time & action */}
                <div
                  className={`flex items-center justify-between pt-2 border-t text-[11px] ${
                    isSelected ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-400'
                  }`}
                >
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
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors ${
                      isSelected
                        ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        : isResolved
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    {isResolved ? 'Reopen' : 'Resolve'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Barangay Quick Reference Card */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50 space-y-2 shrink-0">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Rodriguez OpCen</span>
          </div>
          <button
            onClick={onOpenHotlinesModal}
            className="text-[10px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5 uppercase tracking-wider"
          >
            <PhoneCall className="w-3 h-3" />
            <span>Hotlines</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-white p-2 rounded-md border border-slate-200">
            <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Flood Watch</span>
            <span className="font-bold text-blue-600">Yellow (Alert 1)</span>
          </div>
          <div className="bg-white p-2 rounded-md border border-slate-200">
            <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-semibold">Streetlights</span>
            <span className="font-bold text-indigo-600">Active Survey</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
