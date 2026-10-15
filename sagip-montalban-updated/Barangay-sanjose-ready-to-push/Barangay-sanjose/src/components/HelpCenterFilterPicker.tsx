import React, { useMemo, useState } from 'react';
import { Check, Search, Sparkles, X, Zap } from 'lucide-react';
import {
  CATEGORIES_BY_GROUP,
  CATEGORY_PRESETS,
  CURATED_COUNT_BY_CATEGORY,
  HELP_CENTER_PLACES,
  PLACE_GROUPS,
  type PlaceCategoryId,
} from '../data/helpCenterPlaces';

interface HelpCenterFilterPickerProps {
  /** Currently ticked categories (pre-filled from the previous visit). */
  selected: PlaceCategoryId[];
  onToggleCategory: (id: PlaceCategoryId) => void;
  onSetSelection: (ids: PlaceCategoryId[]) => void;
  /** Opens the map with the current selection. */
  onOpenMap: () => void;
  /** "Live OSM" switch state (real OpenStreetMap pins on top of community data). */
  liveOsm: boolean;
  onToggleLiveOsm: (next: boolean) => void;
  /** Closes the whole Help Center view. */
  onClose: () => void;
  /** True when a selection from a previous visit is available. */
  hasMemory: boolean;
  /** Few names of the remembered selection, for the resume hint. */
  memoryLabel: string;
}

export const HelpCenterFilterPicker: React.FC<HelpCenterFilterPickerProps> = ({
  selected,
  onToggleCategory,
  onSetSelection,
  onOpenMap,
  liveOsm,
  onToggleLiveOsm,
  onClose,
  hasMemory,
  memoryLabel,
}) => {
  const [query, setQuery] = useState('');
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const needle = query.trim().toLowerCase();
  const groups = useMemo(
    () =>
      CATEGORIES_BY_GROUP.map(({ group, categories }) => ({
        meta: PLACE_GROUPS.find((item) => item.id === group)!,
        categories: needle
          ? categories.filter(
              (category) =>
                category.label.toLowerCase().includes(needle) ||
                category.caption.toLowerCase().includes(needle),
            )
          : categories,
      })).filter((entry) => entry.categories.length > 0),
    [needle],
  );

  const matchCount = groups.reduce((total, entry) => total + entry.categories.length, 0);
  const pinCount = useMemo(
    () => HELP_CENTER_PLACES.filter((place) => selectedSet.has(place.category)).length,
    [selectedSet],
  );

  const presets = CATEGORY_PRESETS.filter((preset) => preset.id !== 'lahat');

  return (
    <div className="absolute inset-0 z-[60] flex flex-col bg-slate-950 text-slate-100">
      {/* Decorative header backdrop */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-blue-600/30 via-slate-900/10 to-transparent" />

      {/* ------------------------------------------------------------- header */}
      <header className="relative z-10 shrink-0 pb-3 pl-16 pr-4 pt-4 sm:pl-20 sm:pr-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-blue-300">
              <Sparkles className="h-3.5 w-3.5" /> Help Center · Barangay San Jose
            </p>
            <h2 className="mt-1 truncate text-[19px] font-extrabold leading-tight text-white sm:text-2xl">
              Pumili muna ng gusto mong i-filter
            </h2>
            <p className="mt-1 max-w-xl text-[11.5px] font-medium leading-snug text-slate-300 sm:text-xs">
              I-tap ang mga kategoryang kailangan mo — 7-Eleven, botika, water refilling, ATM,
              evacuation center at iba pa. Pagkatapos lang bubukas ang mapa.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Isara ang Help Center"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-slate-200 transition-colors hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search across the filter buttons */}
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 focus-within:border-blue-400/60 focus-within:bg-white/10">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Hanapin ang filter… (7-Eleven, botika, tubig, ATM)"
            className="h-6 w-full bg-transparent text-[13px] font-medium text-white placeholder:text-slate-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Burahin ang hinahanap"
              className="shrink-0 text-[11px] font-bold text-slate-400 hover:text-white"
            >
              Burahin
            </button>
          )}
        </div>
      </header>

      {/* ------------------------------------------------- quick pick bundles */}
      <div className="relative z-10 shrink-0 pl-16 pr-4 sm:pl-20 sm:pr-6">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Mabilisan (1 tap)
          </p>
          {hasMemory && (
            <button
              type="button"
              onClick={onOpenMap}
              className="truncate text-[10.5px] font-bold text-blue-300 hover:text-blue-200"
            >
              Tuloy sa dating pinili ({memoryLabel})
            </button>
          )}
        </div>
        <div className="hc-chip-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {presets.map((preset) => {
            const active =
              preset.categories.length === selected.length &&
              preset.categories.every((id) => selectedSet.has(id));
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSetSelection(active ? [] : preset.categories)}
                aria-pressed={active}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-colors ${
                  active
                    ? 'border-blue-400 bg-blue-500 text-white'
                    : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                }`}
              >
                <span aria-hidden="true">{preset.emoji}</span>
                {preset.label}
                <span className="rounded-full bg-black/25 px-1.5 text-[10px] font-extrabold">
                  {preset.categories.length}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onSetSelection([])}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-transparent px-3 py-1.5 text-[11.5px] font-bold text-slate-300 transition-colors hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" /> Burahin lahat
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------- filter grid */}
      <div className="custom-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto pb-4 pl-4 pr-4 pt-2 sm:pl-6 sm:pr-6">
        {matchCount === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center">
            <p className="text-sm font-bold text-white">Walang tumugmang filter</p>
            <p className="mt-1 text-xs text-slate-400">
              Subukan ang “7-Eleven”, “botika”, “water”, “ATM” o “evacuation”.
            </p>
          </div>
        )}

        {groups.map(({ meta, categories }) => (
          <section key={meta.id} className="mb-4">
            <div className="mb-2 flex items-baseline gap-2">
              <h3 className="text-[12.5px] font-extrabold text-white">{meta.label}</h3>
              <span className="truncate text-[10.5px] font-medium text-slate-400">{meta.caption}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((category) => {
                const isOn = selectedSet.has(category.id);
                const count = CURATED_COUNT_BY_CATEGORY[category.id] ?? 0;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onToggleCategory(category.id)}
                    aria-pressed={isOn}
                    className={`relative flex items-start gap-2 rounded-2xl border p-2.5 text-left transition-all active:scale-[.97] ${
                      isOn
                        ? 'border-white/30 text-white shadow-lg'
                        : 'border-white/10 bg-white/5 text-slate-100 hover:border-white/20 hover:bg-white/10'
                    }`}
                    style={isOn ? { backgroundColor: category.color } : undefined}
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[17px] leading-none"
                      style={{ backgroundColor: isOn ? 'rgba(0,0,0,.22)' : `${category.color}22` }}
                      aria-hidden="true"
                    >
                      {category.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-bold leading-tight">
                        {category.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[10.5px] font-medium text-slate-300/90">
                        {category.caption}
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-black/25 px-1.5 py-[1px] text-[9.5px] font-bold text-white/90">
                        {count} pin
                        {category.osm?.length ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-300">
                            <Zap className="h-2.5 w-2.5" /> live
                          </span>
                        ) : null}
                      </span>
                    </span>
                    {isOn && (
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-black">
                        <Check className="h-3 w-3" strokeWidth={3.5} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <p className="mt-2 rounded-xl border border-white/10 bg-white/5 p-2.5 text-[10.5px] leading-snug text-slate-400">
          <strong className="text-slate-300">Paalala:</strong> ang nasa listahan ay community-mapped
          na pin (pwedeng ilang metro ang layo). I-on ang{' '}
          <strong className="text-emerald-300">Live OSM</strong> para makuha ang aktwal na lokasyong
          naka-map sa OpenStreetMap.
        </p>
      </div>

      {/* ------------------------------------------------------------- footer */}
      <footer className="relative z-10 shrink-0 border-t border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onToggleLiveOsm(!liveOsm)}
            role="switch"
            aria-checked={liveOsm}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11.5px] font-bold text-slate-200 transition-colors hover:bg-white/10"
          >
            <span
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                liveOsm ? 'bg-emerald-500' : 'bg-slate-600'
              }`}
            >
              <span
                className={`absolute h-3 w-3 rounded-full bg-white transition-all ${
                  liveOsm ? 'left-3.5' : 'left-0.5'
                }`}
              />
            </span>
            Live OSM pins
            <Zap className={`h-3.5 w-3.5 ${liveOsm ? 'text-emerald-300' : 'text-slate-500'}`} />
          </button>

          <p className="text-[11px] font-semibold text-slate-300">
            {selected.length} kategorya · {pinCount} community pin
            {liveOsm ? ' + live OSM' : ''}
          </p>
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSetSelection([])}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-[12px] font-bold text-slate-200 transition-colors hover:bg-white/10"
          >
            Burahin
          </button>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={onOpenMap}
            className={`flex-1 rounded-xl px-4 py-2.5 text-[13px] font-extrabold transition-all ${
              selected.length === 0
                ? 'cursor-not-allowed bg-slate-800 text-slate-500'
                : 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 hover:bg-blue-500 active:scale-[.99]'
            }`}
          >
            {selected.length === 0
              ? 'Pumili muna ng kahit isang filter'
              : `Buksan ang mapa (${selected.length} filter)`}
          </button>
        </div>
      </footer>
    </div>
  );
};
