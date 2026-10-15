import React, { useMemo, useState } from 'react';
import {
  Bus,
  Check,
  Layers,
  Moon,
  Search,
  Siren,
  Store,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  CATEGORIES_BY_GROUP,
  CATEGORY_PRESETS,
  CURATED_COUNT_BY_CATEGORY,
  HELP_CENTER_PLACES,
  PLACE_GROUPS,
  type PlaceCategoryId,
} from '../data/helpCenterPlaces';

/**
 * Step 1 of the Help Center: the user answers the filter question before the
 * map exists. Monochrome (white on near-black) on purpose — no colour coding,
 * no emoji: categories are identified by their label, caption and cartographic
 * code instead.
 */
const PRESET_ICONS: Record<string, LucideIcon> = {
  siren: Siren,
  cart: Store,
  moon: Moon,
  wallet: Wallet,
  bus: Bus,
  users: Users,
  layers: Layers,
};

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
                category.caption.toLowerCase().includes(needle) ||
                category.code.toLowerCase().includes(needle),
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
    <div className="absolute inset-0 z-[60] flex flex-col bg-[#0b0b0b] text-neutral-100">
      {/* ------------------------------------------------------------- header */}
      <header className="relative shrink-0 border-b border-neutral-800 pb-3 pl-16 pr-4 pt-4 sm:pl-20 sm:pr-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-neutral-400">
              Help Center <span className="text-neutral-600">/</span> Barangay San Jose
            </p>
            <h2 className="mt-1 truncate text-[19px] font-semibold leading-tight text-white sm:text-2xl">
              Pumili muna ng gusto mong i-filter
            </h2>
            <p className="mt-1 max-w-xl text-[11.5px] font-medium leading-snug text-neutral-400 sm:text-xs">
              I-tap ang mga kategoryang kailangan (7-Eleven, botika, water, ATM, evacuation).
              Bubukas ang mapa pagkatapos pumili.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Isara ang Help Center"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-neutral-700 text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search across the filter buttons */}
        <div className="mt-3 flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 focus-within:border-neutral-500">
          <Search className="h-4 w-4 shrink-0 text-neutral-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Hanapin ang filter (7-Eleven, botika, tubig, ATM)"
            className="h-6 w-full bg-transparent text-[13px] font-medium text-white placeholder:text-neutral-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-neutral-500 hover:text-white"
            >
              Burahin
            </button>
          )}
        </div>
      </header>

      {/* ------------------------------------------------- quick pick bundles */}
      <div className="shrink-0 border-b border-neutral-800 pl-16 pr-4 py-2.5 sm:pl-20 sm:pr-6">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-neutral-500">
            Preset
          </p>
          {hasMemory && (
            <button
              type="button"
              onClick={onOpenMap}
              className="truncate text-[10.5px] font-bold text-neutral-300 underline decoration-neutral-600 underline-offset-2 hover:text-white"
            >
              Dating pinili: {memoryLabel}
            </button>
          )}
        </div>
        <div className="hc-chip-scroll -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {presets.map((preset) => {
            const Icon = PRESET_ICONS[preset.icon] ?? Layers;
            const active =
              preset.categories.length === selected.length &&
              preset.categories.every((id) => selectedSet.has(id));
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSetSelection(active ? [] : preset.categories)}
                aria-pressed={active}
                className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors ${
                  active
                    ? 'border-white bg-white text-black'
                    : 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-neutral-500 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {preset.label}
                <span
                  className={`font-mono text-[10px] font-bold ${
                    active ? 'text-neutral-600' : 'text-neutral-500'
                  }`}
                >
                  {preset.categories.length}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onSetSelection([])}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-800 px-2.5 py-1.5 text-[11.5px] font-semibold text-neutral-400 transition-colors hover:border-neutral-600 hover:text-white"
          >
            <X className="h-3.5 w-3.5" /> Burahin lahat
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------- filter grid */}
      <div className="custom-scrollbar-dark min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3 sm:px-6">
        {matchCount === 0 && (
          <div className="mt-8 rounded-md border border-dashed border-neutral-700 p-6 text-center">
            <p className="text-sm font-semibold text-white">Walang tumugmang filter</p>
            <p className="mt-1 text-xs text-neutral-400">
              Subukan ang “7-Eleven”, “botika”, “water”, “ATM” o “evacuation”.
            </p>
          </div>
        )}

        {groups.map(({ meta, categories }) => (
          <section key={meta.id} className="mb-4">
            <div className="mb-2 flex items-baseline gap-2 border-b border-neutral-800 pb-1.5">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-neutral-200">
                {meta.label}
              </h3>
              <span className="truncate text-[10.5px] font-medium text-neutral-500">
                {meta.caption}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((category) => {
                const isOn = selectedSet.has(category.id);
                const count = CURATED_COUNT_BY_CATEGORY[category.id] ?? 0;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onToggleCategory(category.id)}
                    aria-pressed={isOn}
                    className={`relative flex items-start gap-2.5 rounded-md border p-2.5 text-left transition-colors ${
                      isOn
                        ? 'border-white bg-white text-black'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-100 hover:border-neutral-600'
                    }`}
                  >
                    <span
                      className={`mt-[1px] grid h-7 w-9 shrink-0 place-items-center rounded border font-mono text-[11px] font-bold tracking-tight ${
                        isOn
                          ? 'border-neutral-400 bg-neutral-100 text-black'
                          : 'border-neutral-700 bg-neutral-950 text-neutral-300'
                      }`}
                      aria-hidden="true"
                    >
                      {category.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold leading-tight">
                        {category.label}
                      </span>
                      <span
                        className={`mt-0.5 block truncate text-[10.5px] font-medium ${
                          isOn ? 'text-neutral-600' : 'text-neutral-400'
                        }`}
                      >
                        {category.caption}
                      </span>
                      <span
                        className={`mt-1 block font-mono text-[9.5px] font-bold ${
                          isOn ? 'text-neutral-600' : 'text-neutral-500'
                        }`}
                      >
                        {count} PIN{category.osm?.length ? ' / LIVE OSM' : ''}
                      </span>
                    </span>
                    {isOn && (
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-black text-white">
                        <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <p className="mt-2 border-l-2 border-neutral-700 py-1 pl-2.5 text-[10.5px] leading-snug text-neutral-500">
          <strong className="font-bold text-neutral-300">Paalala:</strong> ang listahan ay
          community-mapped na pin (pwedeng ilang metro ang layo). I-on ang{' '}
          <strong className="font-bold text-neutral-200">Live OSM</strong> para makuha ang aktwal
          na lokasyong naka-map sa OpenStreetMap.
        </p>
      </div>

      {/* ------------------------------------------------------------- footer */}
      <footer className="shrink-0 border-t border-neutral-800 bg-[#0b0b0b] px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onToggleLiveOsm(!liveOsm)}
            role="switch"
            aria-checked={liveOsm}
            className="flex items-center gap-2 rounded-md border border-neutral-800 px-2.5 py-1.5 text-[11.5px] font-semibold text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white"
          >
            <span
              className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full border transition-colors ${
                liveOsm ? 'border-white bg-white' : 'border-neutral-600 bg-neutral-900'
              }`}
            >
              <span
                className={`absolute h-2.5 w-2.5 rounded-full transition-all ${
                  liveOsm ? 'left-[15px] bg-black' : 'left-[3px] bg-neutral-500'
                }`}
              />
            </span>
            Live OSM pins
            <span className="font-mono text-[10px] font-bold text-neutral-500">
              {liveOsm ? 'ON' : 'OFF'}
            </span>
          </button>

          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-wide text-neutral-400">
            {selected.length} filter &middot; {pinCount} community pin
            {liveOsm ? ' + live osm' : ''}
          </p>
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSetSelection([])}
            className="rounded-md border border-neutral-700 px-3 py-2.5 text-[12px] font-semibold text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
          >
            Burahin
          </button>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={onOpenMap}
            className={`flex-1 rounded-md px-4 py-2.5 text-[13px] font-bold transition-colors ${
              selected.length === 0
                ? 'cursor-not-allowed border border-neutral-800 bg-neutral-900 text-neutral-600'
                : 'bg-white text-black hover:bg-neutral-200'
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
