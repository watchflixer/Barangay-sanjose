import React, { useEffect, useRef, useState } from 'react';
import { BellRing, Building2, CheckCircle2, History } from 'lucide-react';

interface OptionsMenuProps {
  /** Disabled while the Flood Prone or Traffic map is open (all devices). */
  disabled?: boolean;
  onOpenUpdates: () => void;
  onOpenEvacuationCenters: () => void;
  onOpenResolvedCleared: () => void;
  onOpenHistory: () => void;
  /**
   * Placement classes for the wrapper. The Navbar shows the button on
   * desktop/landscape only (`shrink-0 portrait:hidden`); the Incident Feeds
   * header shows it on mobile portrait only (`hidden portrait:inline-flex`),
   * where the ●●● sits at the end of the "Incident Feeds" text.
   */
  className?: string;
  /**
   * Where the 14rem dropdown is anchored:
   *  - 'button' (default): to the ●●● button itself. The Navbar has room, so
   *    the panel gets the little speech-bubble arrow pointing up at the button.
   *  - 'row': to a positioned ancestor row. Used inside the Incident Feeds
   *    header: the drawer is only 20rem wide, so the panel is anchored to the
   *    header row (whose right edge is flush with the ●●● button) to keep the
   *    whole menu inside the panel instead of being clipped.
   */
  anchor?: 'button' | 'row';
}

/**
 * ●●● options button + its dropdown (Updates, Evacuation Centers,
 * Resolved / Cleared, History). Shared by the Navbar and the Incident Feeds
 * header so both keep exactly the same menu and behaviour.
 */
export const OptionsMenu: React.FC<OptionsMenuProps> = ({
  disabled = false,
  onOpenUpdates,
  onOpenEvacuationCenters,
  onOpenResolvedCleared,
  onOpenHistory,
  className = '',
  anchor = 'button',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the dropdown whenever Flood Prone or Traffic disables it (all devices).
  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pick = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  const wrapperPosition = anchor === 'row' ? '' : 'relative';
  // Same offsets/arrow as the original Navbar dropdown so the desktop menu
  // looks exactly as it did before it moved into this component.
  const menuPosition =
    anchor === 'row' ? 'absolute right-0 top-full mt-1' : 'absolute right-0 mt-7';

  return (
    <div className={`${wrapperPosition} ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        title="Options"
        aria-label="Options"
        aria-expanded={isOpen}
        className={`inline-flex h-8 w-9 items-center justify-center rounded-md border border-slate-200 transition-colors ${disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-slate-100 cursor-pointer'}`}
      >
        {/* CSS dots, not text: Chrome Android/iOS font-boosts text glyphs
            (●●●) and blows the button up in mobile portrait. Plain
            rounded spans are immune to font inflation. */}
        <span className="flex items-center gap-[2.5px]" aria-hidden="true">
          <span className="w-1 h-1 rounded-full bg-slate-900" />
          <span className="w-1 h-1 rounded-full bg-slate-900" />
          <span className="w-1 h-1 rounded-full bg-slate-900" />
        </span>
      </button>

      {isOpen && (
        <div
          className={`${menuPosition} w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100`}
        >
          {/* Speech-bubble arrow pointing up at the ●●● button (which sits at
              the right end of the row in the Incident Feeds header too). */}
          <div className="absolute -top-2 right-3 h-4 w-4 rotate-45 rounded-[2px] border-l border-t border-slate-200 bg-white" />
          <div className="py-1">
            <button
              onClick={() => pick(onOpenUpdates)}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
            >
              <BellRing className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Updates</span>
            </button>

            <button
              onClick={() => pick(onOpenEvacuationCenters)}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
            >
              <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Evacuation Centers</span>
            </button>

            <button
              onClick={() => pick(onOpenResolvedCleared)}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Resolved / Cleared</span>
            </button>

            <button
              onClick={() => pick(onOpenHistory)}
              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
            >
              <History className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>History</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
