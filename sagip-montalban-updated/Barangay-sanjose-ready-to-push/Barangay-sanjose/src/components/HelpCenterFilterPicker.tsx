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
 * Phone portrait: the page itself never scrolls. Only the filter list does —
 * and it scrolls UNDER a pinned top bar (title + X + search), so whichever way
 * you flick the list, "Choose what you want to filter" and the search field
 * stay exactly where they are, like the reference screenshot. Section labels
 * (Emergency, Everyday essentials, …) pin themselves right below that bar while
 * their group is on screen, and a hairline + soft shadow appears once the list
 * starts moving, so it is obvious that the list is a sheet under a fixed bar
 * and not the whole screen sliding away.
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
  // The scroll pane and the top bar that stays pinned inside it.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  // True once the list has been nudged: the pinned bar then shows its hairline
  // and shadow. Kept as state (not a class poked from a scroll listener) so
  // React and the DOM never disagree.
  const [scrolled, setScrolled] = useState(false);

  // Publish the pinned bar's real height as --hc-picker-bar, because the
  // section labels pin themselves right below it and the bar grows/shrinks
  // with the title wrapping (one line on desktop, two on a narrow phone) and
  // with the font the device actually has. ResizeObserver keeps it exact.
  // --hc-picker-label does the same for a section label, so a snapped card
  // (and the label that captures a tapped card's scroll) lands just below the
  // label instead of sliding underneath it.
  useEffect(() => {
    const scroll = scrollRef.current;
    const sticky = stickyRef.current;
    if (!scroll || !sticky) return;
    const label = scroll.querySelector<HTMLElement>('.hc-picker-sec');
    const sync = () => {
      scroll.style.setProperty('--hc-picker-bar', `${sticky.offsetHeight}px`);
      scroll.style.setProperty('--hc-picker-label', `${label?.offsetHeight ?? 0}px`);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(sticky);
    if (label) observer.observe(label);
    return () => observer.disconnect();
    // Re-measure when a search rewrites the list (labels can change size).
  }, [query]);

  // A new search rewrites the list, so jump back to its first result instead
  // of leaving the user parked at an old offset that now shows nothing.
  // The pinned bar is inside this pane, so it stays on screen either way.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [query]);

  /**
   * Keeps the card the user just tapped whole on screen. The list can come to
   * rest with a card sliced by the pinned bar above it or by the pane's lower
   * edge, and on Android a tap does not scroll the focused card into view by
   * itself — so the selected tile would stay half hidden. One short, smooth
   * nudge in whichever direction is needed fixes it; cards that are already
   * whole are left alone.
   */
  const revealCard = (card: HTMLElement) => {
    const pane = scrollRef.current;
    const sticky = stickyRef.current;
    if (!pane || !sticky) return;
    const paneBox = pane.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    // scroll-padding-top is the pinned bar + the section label under it.
    const topInset = parseFloat(getComputedStyle(pane).scrollPaddingTop) || sticky.offsetHeight;
    const topLimit = paneBox.top + topInset;
    const bottomLimit = paneBox.bottom - 8;
    let delta = 0;
    if (cardBox.top < topLimit) delta = cardBox.top - topLimit;
    else if (cardBox.bottom > bottomLimit) delta = Math.min(cardBox.bottom - bottomLimit, cardBox.top - topLimit);
    if (Math.abs(delta) < 2) return;
    pane.scrollBy({ top: delta, behavior: 'smooth' });
  };

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
        {/* One scroll pane for the whole list; the top bar is pinned inside it
            (sticky), so the header + search never leave the screen. */}
        <div
          className="hc-picker-scroll custom-scrollbar"
          ref={scrollRef}
          onScroll={handleScroll}
        >
          {/* ------------------------------------------------------ pinned bar */}
          <div className="hc-picker-sticky" ref={stickyRef}>
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
                      onClick={(event) => {
                        onToggleCategory(category.id);
                        const card = event.currentTarget;
                        requestAnimationFrame(() => revealCard(card));
                      }}
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
