import React, { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import {
  CATEGORIES_BY_GROUP,
  CURATED_COUNT_BY_CATEGORY,
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
 *
 * Categories are picked one by one. Closing the picker returns to the
 * existing directory map, or exits Help Center before a map has been opened.
 */
interface HelpCenterFilterPickerProps {
  /** Currently ticked categories (pre-filled from the previous visit). */
  selected: PlaceCategoryId[];
  onToggleCategory: (id: PlaceCategoryId) => void;
  onSetSelection: (ids: PlaceCategoryId[]) => void;
  /** Opens the map with the current selection. */
  onOpenMap: () => void;
  onClose?: () => void;
}

export const HelpCenterFilterPicker: React.FC<HelpCenterFilterPickerProps> = ({
  selected,
  onToggleCategory,
  onSetSelection,
  onOpenMap,
  onClose,
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
  return (
    // A full white screen, with its content in one centred column: the column
    // is a little narrower than the viewport so the header, search field,
    // sections and footer keep a comfortable measure and stay aligned with
    // each other — no card, no border, nothing floating.
    <div id="hc-picker">
      <div className="hc-picker-body">
        {/* ----------------------------------------------------------- header */}
        <div className="hc-picker-top">
          {onClose && <button type="button" onClick={onClose} aria-label="Close Help Center filters"
            className="hc-pill shrink-0"><X className="h-4 w-4" /></button>}
          <div className="hc-picker-head">
            <h2 className="hc-picker-title">Choose what you want to filter</h2>
            <p className="hc-picker-sub">
              Tap the categories you need (7-Eleven, pharmacy, water, ATM,
              evacuation). The map opens once you pick — it carries a live traffic layer, just
              like the Traffic view.
            </p>
          </div>
        </div>

        {/* Search across the filter buttons — Traffic's .dir-fields input. */}
        <div className="hc-picker-search">
          <Search className="h-4 w-4 shrink-0 text-[#5f6368]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search filters (7-Eleven, pharmacy, water, ATM)"
            aria-label="Search filters"
          />
          {query && (
            <button type="button" className="hc-picker-clear" onClick={() => setQuery('')}>
              Clear
            </button>
          )}
        </div>

        {/* ------------------------------------------------------- filter grid */}
        <div className="hc-picker-scroll custom-scrollbar">
          {matchCount === 0 && (
            <p className="hc-picker-note">
              No matching filter. Try “7-Eleven”, “pharmacy”, “water”, “ATM”
              or “evacuation”.
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
            <strong>Note:</strong> some pins are community-mapped and may be a few metres off. We
            also add the live location from OpenStreetMap whenever it is available, and the Street
            map carries a live traffic layer, just like the Traffic view.
          </p>
        </div>

        {/* ----------------------------------------------------------- footer */}
        <footer className="hc-picker-foot">
          <div className="hc-picker-actions">
            <button type="button" onClick={() => onSetSelection([])} className="hc-pill">
              Clear
            </button>
            <button type="button" disabled={selected.length === 0} onClick={onOpenMap} className="hc-pill go">
              {selected.length === 0
                ? 'Pick at least one filter'
                : `Open the map (${selected.length} ${selected.length === 1 ? 'filter' : 'filters'})`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
