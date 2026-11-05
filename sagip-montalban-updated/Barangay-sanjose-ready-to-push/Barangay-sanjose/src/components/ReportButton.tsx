import React, { useEffect, useRef, useState } from 'react';
import { BellRing, Building2, CheckCircle2, History } from 'lucide-react';

interface OptionsMenuProps {
  disabled?: boolean;
  onOpenUpdates: () => void;
  onOpenEvacuationCenters: () => void;
  onOpenResolvedCleared: () => void;
  onOpenHistory: () => void;
  className?: string;
  anchor?: 'button' | 'row';
}

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

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

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
  const menuPosition = anchor === 'row' ? 'absolute right-0 top-full mt-1' : 'absolute right-0 mt-7';

  return (
    <div className={`${wrapperPosition} ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        title="Options"
        aria-label="Options"
        aria-expanded={isOpen}
        className={`inline-flex h-8 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'}`}
      >
        <span className="flex items-center gap-[2.5px]" aria-hidden="true">
          <span className="h-1 w-1 rounded-full bg-slate-900" />
          <span className="h-1 w-1 rounded-full bg-slate-900" />
          <span className="h-1 w-1 rounded-full bg-slate-900" />
        </span>
      </button>

      {isOpen && (
        <div
          className={`${menuPosition} z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-[0_24px_45px_rgba(15,23,42,0.14)]`}
        >
          <div className="absolute -top-2 right-3 h-4 w-4 rotate-45 rounded-[2px] border-l border-t border-slate-200 bg-white" />
          <div className="py-1">
            <button
              onClick={() => pick(onOpenUpdates)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              <BellRing className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Updates</span>
            </button>

            <button
              onClick={() => pick(onOpenEvacuationCenters)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
              <span>Evacuation Centers</span>
            </button>

            <button
              onClick={() => pick(onOpenResolvedCleared)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Resolved / Cleared</span>
            </button>

            <button
              onClick={() => pick(onOpenHistory)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              <History className="h-4 w-4 shrink-0 text-indigo-600" />
              <span>History</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};














