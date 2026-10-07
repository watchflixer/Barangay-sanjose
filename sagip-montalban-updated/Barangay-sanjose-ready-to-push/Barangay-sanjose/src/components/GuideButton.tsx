import React from 'react';

/**
 * Guide button — puting button na may itim na bilog (circle) sa loob na may
 * puting question mark, tapos itim na text na "Guide" sa tabi.
 * Nasa Navbar, katabi ng Donate button (sa dulo).
 */
interface GuideButtonProps {
  onClick?: () => void;
  className?: string;
}

export const GuideButton: React.FC<GuideButtonProps> = ({ onClick, className = '' }) => (
  <button
    id="btn-guide"
    type="button"
    onClick={onClick}
    aria-label="Guide"
    className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-black transition-colors hover:bg-slate-50 ${className}`}
  >
    <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-black text-[10px] font-bold leading-none text-white">
      ?
    </span>
    <span>Guide</span>
  </button>
);
