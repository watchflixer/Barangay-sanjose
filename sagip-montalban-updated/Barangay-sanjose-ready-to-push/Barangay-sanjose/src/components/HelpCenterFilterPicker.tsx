import React, { useMemo, useState } from 'react';
import { Bus, Check, Layers, Moon, Search, Siren, Store, Users, Wallet, X, type LucideIcon } from 'lucide-react';
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
 * map exists. The screen is built from the Traffic page's own panel styling
 * (#dir-panel / #rt-sheet in public/rizal_traffic_map.html): white sheet,
 * #dadce0 hairlines, round icon buttons, .rt-chip pills and the #00697a "go"
 * pill for the primary action — so the Help Center and Traffic stay one
 * product. No emoji anywhere.
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
  /** Traffic-style live-traffic layer (Street mode) switch. */
  trafficOn: boolean;
  onToggleTraffic: () => void;
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
  trafficOn,
  onToggleTraffic,
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
    <div id="hc-picker">
      {/* ------------------------------------------------------------- header */}
      <div className="hc-picker-top">
        <div className="hc-picker-head">
          <h2 className="hc-picker-title">Pumili muna ng gusto mong i-filter</h2>
          <p className="hc-picker-sub">
            I-tap ang mga kategoryang kailangan (7-Eleven, botika, water, ATM, evacuation). Bubukas
            ang mapa pagkatapos pumili — may live traffic layer ito gaya ng Traffic view.
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Isara ang Help Center" className="hc-icon-btn">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Search across the filter buttons — Traffic's .dir-fields input. */}
      <div className="hc-picker-search">
        <Search className="h-4 w-4 shrink-0 text-[#5f6368]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Hanapin ang filter (7-Eleven, botika, tubig, ATM)"
          aria-label="Hanapin ang filter"
        />
        {query && (
          <button type="button" className="hc-picker-clear" onClick={() => setQuery('')}>
            Burahin
          </button>
        )}
      </div>

      {/* ---------------------------------------------------- quick pick bundles */}
      <div className="hc-picker-sec">
        <h3>Preset</h3>
        <span>Isang tap para sa buong grupo</span>
        {hasMemory && (
          <button type="button" onClick={onOpenMap} className="hc-picker-resume">
            Dating pinili: {memoryLabel}
          </button>
        )}
      </div>
      <div className="hc-picker-chips">
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
              className={`hc-pill${active ? ' go' : ''}`}
            >
              <Icon className="h-4 w-4" />
              {preset.label}
              <span className="hc-switch-state">{preset.categories.length}</span>
            </button>
          );
        })}
        <button type="button" onClick={() => onSetSelection([])} className="hc-pill">
          <X className="h-4 w-4" /> Burahin lahat
        </button>
      </div>

      {/* --------------------------------------------------------- filter grid */}
      <div className="hc-picker-scroll custom-scrollbar">
        {matchCount === 0 && (
          <p className="hc-picker-note">
            Walang tumugmang filter. Subukan ang “7-Eleven”, “botika”, “water”, “ATM” o
            “evacuation”.
          </p>
        )}

        {groups.map(({ meta, categories }) => (
          <section key={meta.id}>
            <div className="hc-picker-sec">
              <h3>{meta.label}</h3>
              <span>{meta.caption}</span>
            </div>
            <div className="hc-picker-grid">
              {categories.map((category) => {
                const isOn = selectedSet.has(category.id);
                const count = CURATED_COUNT_BY_CATEGORY[category.id] ?? 0;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onToggleCategory(category.id)}
                    aria-pressed={isOn}
                    className={`hc-cat${isOn ? ' on' : ''}`}
                  >
                    <span className="hc-cat-ic" aria-hidden="true">
                      {category.code}
                    </span>
                    <span className="hc-cat-tx">
                      <span className="hc-cat-title">{category.label}</span>
                      <span className="hc-cat-sub">{category.caption}</span>
                      <span className="hc-cat-meta">
                        {count} PIN{category.osm?.length ? ' / LIVE OSM' : ''}
                      </span>
                    </span>
                    {isOn && (
                      <span className="hc-cat-check" aria-hidden="true">
                        <Check className="h-3 w-3" strokeWidth={3.5} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <p className="hc-picker-note">
          <strong>Paalala:</strong> ang listahan ay community-mapped na pin (pwedeng ilang metro ang
          layo). I-on ang Live OSM para makuha ang aktwal na lokasyong naka-map sa OpenStreetMap.
        </p>
      </div>

      {/* ------------------------------------------------------------- footer */}
      <footer className="hc-picker-foot">
        <div className="hc-picker-foot-row">
          <button
            type="button"
            onClick={() => onToggleLiveOsm(!liveOsm)}
            role="switch"
            aria-checked={liveOsm}
            className={`hc-switch${liveOsm ? ' on' : ''}`}
          >
            <span className="hc-knob" aria-hidden="true" />
            Live OSM pins
            <span className="hc-switch-state">{liveOsm ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleTraffic}
            role="switch"
            aria-checked={trafficOn}
            className={`hc-switch${trafficOn ? ' on' : ''}`}
          >
            <span className="hc-knob" aria-hidden="true" />
            Live traffic
            <span className="hc-switch-state">{trafficOn ? 'ON' : 'OFF'}</span>
          </button>

          <span className="hc-picker-foot-count">
            {selected.length} filter &middot; {pinCount} community pin
            {liveOsm ? ' + live osm' : ''}
          </span>
        </div>

        <div className="hc-picker-actions">
          <button type="button" onClick={() => onSetSelection([])} className="hc-pill">
            Burahin
          </button>
          <button type="button" disabled={selected.length === 0} onClick={onOpenMap} className="hc-pill go">
            {selected.length === 0
              ? 'Pumili muna ng kahit isang filter'
              : `Buksan ang mapa (${selected.length} filter)`}
          </button>
        </div>
      </footer>
    </div>
  );
};
