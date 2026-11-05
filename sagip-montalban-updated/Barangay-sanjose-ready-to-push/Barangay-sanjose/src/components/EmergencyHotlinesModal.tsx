import React from 'react';

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
    className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-900 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 ${className}`}
  >
    <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold leading-none text-white">
      ?
    </span>
    <span>Guide</span>
  </button>
);













