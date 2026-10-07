import React from 'react';
import { Plus } from 'lucide-react';

interface ReportButtonProps {
  onClick: () => void;
  /** Flood Prone / Traffic map open — greys the button out (all devices). */
  disabled?: boolean;
  /**
   * Placement classes. Navbar: `shrink-0 portrait:hidden` (portrait phones
   * hide it — it moves to the Incident Feeds header). Incident Feeds header:
   * `hidden portrait:inline-flex`.
   */
  className?: string;
  /** Iba-iba ang id ng dalawang instance (Navbar at feed header). */
  id?: string;
}

/**
 * Report button — itim na plus sa puting bilog (32px, kasing-taas ng ●●●).
 * Kaparehas ng ●●● ang itsura para mukha silang magkapatid, at nakatabi ito
 * palagi sa ●●● button (Navbar sa desktop, Incident Feeds header sa portrait).
 */
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
    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200 shadow-xs transition-colors ${disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-slate-100 cursor-pointer active:scale-95'} ${className}`}
  >
    {/* Plain black plus — wala nang "Report" label, icon lang. */}
    <Plus className="h-4 w-4 text-slate-900" strokeWidth={2.75} aria-hidden="true" />
  </button>
);
