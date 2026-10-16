import React, { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
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
 * The screen is a one-way step on purpose: there is no X / back button, and
 * no preset bundles either — the categories are picked one by one. It ends by
 * opening the map, and the whole view is left from there through the host's
 * Layers menu (or the app's own sidebar).
 */
interface HelpCenterFilterPickerProps {
  /** Currently ticked categories (pre-filled from the previous visit). */
  selected: PlaceCategoryId[];
  onToggleCategory: (id: PlaceCategoryId) => void;
  onSetSelection: (ids: PlaceCategoryId[]) => void;
  /** Opens the map with the current selection. */
  onOpenMap: () => void;
}

export const HelpCenterFilterPicker: React.FC<HelpCenterFilterPickerProps> = ({
  selected,
  onToggleCategory,
  onSetSelection,
  onOpenMap,
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
    // The screen is a dimmed backdrop with the sheet centred on it: the card
    // is a little narrower than the viewport and never taller than 86vh, so
    // it reads as one panel instead of a full-page wall (the same shape the
    // Traffic page gives its centred dialogs).
    <div id="hc-picker">
      <div className="hc-picker-card">
        {/* ----------------------------------------------------------- header */}
        <div className="hc-picker-top">
          <div className="hc-picker-head">
            <h2 className="hc-picker-title">Pumili muna ng gusto mong i-filter</h2>
            <p className="hc-picker-sub">
              I-tap ang mga kategoryang kailangan (7-Eleven, botika, water, ATM, evacuation). Bubukas
              ang mapa pagkatapos pumili — may live traffic layer ito gaya ng Traffic view.
            </p>
          </div>
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

        {/* ------------------------------------------------------- filter grid */}
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
            <strong>Paalala:</strong> community-mapped ang ilang pin (pwedeng ilang metro ang layo).
            Idinadagdag din namin ang live na lokasyon mula sa OpenStreetMap kapag may nahanap, at ang
            Street na mapa ay may live traffic layer gaya ng Traffic view.
          </p>
        </div>

        {/* ----------------------------------------------------------- footer */}
        <footer className="hc-picker-foot">
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
    </div>
  );
};
