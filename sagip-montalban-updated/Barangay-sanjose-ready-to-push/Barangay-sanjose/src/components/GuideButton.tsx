import React from 'react';
import { Plus } from 'lucide-react';

interface ReportButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const ReportButton: React.FC<ReportButtonProps> = ({
  onClick,
  disabled = false,
  className = '',
  id = 'btn-report-hazard',
}) => (
  <button
    id={id}
    onClick={onClick}
    disabled={disabled}
    title="Report Hazard"
    aria-label="Report a hazard"
    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-sm transition-all ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50'} ${className}`}
  >
    <Plus className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />
  </button>
);












