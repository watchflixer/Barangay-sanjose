import React from 'react';

/**
 * Donate button — ang pill button na itim-puti, uppercase na may 0.22em
 * letter-spacing (galing sa standalone snippet).
 *
 * Nasa Navbar, sa dating pwesto ng ●●● button sa portrait phone
 * (at sa tabi ng Report/Hotlines sa desktop).
 *
 * Ang lahat ng style ay nasa `.donate-btn` sa `src/index.css`, sukat lang ang
 * pinaliit para pumasok sa 32px-tall navbar — ibalik lang ang mga orihinal na
 * value (nakalista sa komento doon) kung gusto ng buong laki.
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
    className={`donate-btn shrink-0 ${className}`}
    href={href}
    target="_blank"
    rel="noopener noreferrer"
  >
    Donate
  </a>
);
