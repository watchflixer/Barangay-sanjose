import React from 'react';

/**
 * Donate button — simpleng normal na button lang (walang pill, walang
 * uppercase/letter-spacing, walang shine o hover-invert animation).
 * Kaparehong itsura ng ibang navbar buttons (Report / Hotlines).
 *
 * TODO: palitan ang DEFAULT_DONATE_URL ng totoong donation page / QR page mo.
 */
const DEFAULT_DONATE_URL = '#';

interface DonateButtonProps {
  /** Link ng donation page. Default: '#' (placeholder muna). */
  href?: string;
  className?: string;
}

export const DonateButton: React.FC<DonateButtonProps> = ({
  href = DEFAULT_DONATE_URL,
  className = '',
}) => (
  <a
    id="btn-donate"
    className={`inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 ${className}`}
    href={href}
    target="_blank"
    rel="noopener noreferrer"
  >
    Donate
  </a>
);
