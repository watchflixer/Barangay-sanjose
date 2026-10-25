import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Banknote,
  Building2,
  Bus,
  Check,
  Church,
  Croissant,
  Droplets,
  Dumbbell,
  Flame,
  Fuel,
  HandCoins,
  Hammer,
  Hospital,
  Landmark,
  PawPrint,
  ParkingCircle,
  Pill,
  Scissors,
  School,
  Send,
  Shield,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Smile,
  Stethoscope,
  Store,
  TentTree,
  Trophy,
  Utensils,
  WashingMachine,
  Wheat,
  Wifi,
  Wrench,
  type LucideIcon,
  Search,
  X,
} from 'lucide-react';
import {
  CATEGORIES_BY_GROUP,
  PLACE_GROUPS,
  type PlaceCategoryId,
} from '../data/helpCenterPlaces';

const CATEGORY_ICONS: Record<PlaceCategoryId, LucideIcon> = {
  seven_eleven: Store,
  convenience: ShoppingBag,
  supermarket: ShoppingCart,
  market: ShoppingBasket,
  pharmacy: Pill,
  bigasan: Wheat,
  water: Droplets,
  lpg: Flame,
  bakery: Croissant,
  hardware: Hammer,
  laundry: WashingMachine,
  police: Shield,
  fire: Flame,
  hospital: Hospital,
  clinic: Stethoscope,
  evacuation: TentTree,
  barangay: Landmark,
  school: School,
  church: Church,
  court: Trophy,
  wifi: Wifi,
  food: Utensils,
  salon: Scissors,
  dental: Smile,
  vet: PawPrint,
  gym: Dumbbell,
  gas: Fuel,
  vulcanizing: Wrench,
  terminal: Bus,
  parking: ParkingCircle,
  atm: Banknote,
  bank: Building2,
  pawnshop: HandCoins,
  remittance: Send,
};

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
 *
 * Phone portrait: the page itself never scrolls. The title, search and footer
 * stay fixed while only the category list scrolls; the scrollbar therefore
 * starts beside the first section (Emergency), not beside the title. Section
 * labels pin to the top of that list as their group moves through it, while a
 * soft edge appears under the fixed header once scrolling starts.
 */
interface HelpCenterFilterPickerProps {
  /** Currently ticked categories (pre-filled from the previous visit). */
  selected: PlaceCategoryId[];
  onToggleCategory: (id: PlaceCategoryId) => void;
  onSetSelection: (ids: PlaceCategoryId[]) => void;
  /** Opens the map with the current selection. */
  onOpenMap: () => void;
  /** The X/back button — dismisses the picker onto the Help Center map. */
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
  // Only the category list scrolls; the title/search and footer stay outside it.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // True once the list has been nudged: the fixed header then shows its hairline
  // and shadow. Kept as state so React and the DOM never disagree.
  const [scrolled, setScrolled] = useState(false);

  // A new search rewrites the list, so jump back to its first result instead
  // of leaving the user parked at an old offset that now shows nothing.
  // The fixed header remains in place while the list resets to its first result.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [query]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    // setState bails out when the value is unchanged, so this stays cheap
    // across the hundreds of scroll events a flick produces.
    setScrolled(event.currentTarget.scrollTop > 2);
  };

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
    <div id="hc-picker" className={scrolled ? 'is-scrolled' : undefined}>
      <div className="hc-picker-body">
        {/* ------------------------------------------------------ pinned bar */}
        <div className="hc-picker-sticky">
          <div className="hc-picker-top">
            <div className="hc-picker-head">
              <h2 className="hc-picker-title">Choose what you want to filter</h2>
              <p className="hc-picker-sub">
                Tap the categories you need (7-Eleven, pharmacy, water, ATM,
                evacuation).
              </p>
            </div>
            {onClose && <button type="button" onClick={onClose} aria-label="Close Help Center filters"
              className="hc-pill shrink-0"><X className="h-4 w-4" /></button>}
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
        </div>

        {/* Scroll only the options so its scrollbar begins beside Emergency;
            the fixed title/search above and action footer below stay visible. */}
        <div
          className="hc-picker-scroll custom-scrollbar"
          ref={scrollRef}
          onScroll={handleScroll}
        >
            {/* --------------------------------------------------- filter grid */}
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
                    const CategoryIcon = CATEGORY_ICONS[category.id];
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => onToggleCategory(category.id)}
                        aria-pressed={isOn}
                        className={`hc-cat${isOn ? ' on' : ''}`}
                      >
                        <span className="hc-cat-ic" aria-hidden="true">
                          <CategoryIcon />
                        </span>
                        <span className="hc-cat-tx">
                          <span className="hc-cat-title">{category.label}</span>
                          <span className="hc-cat-sub">{category.caption}</span>
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
              <strong>Note:</strong> every pin on this map comes from the barangay's Supabase
              directory — one table per filter. The Street map also carries a live traffic layer,
              just like the Traffic view.
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
