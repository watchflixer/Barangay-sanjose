import React, { useState } from 'react';
import { BookOpen, Heart, Menu, Smartphone } from 'lucide-react';
import { DonateButton } from './DonateButton';

/**
 * DESKTOP / LAPTOP RAIL — Google-Maps-style icon rail on the far left.
 *
 * The narrow strip: the hamburger, then "Guide", "Donate" and "Get app" at the
 * bottom. ("Ask Maps" was removed from the rail; the Donate item is the only
 * one wired to anything — it opens the donate dialog.)
 *
 * The hamburger is DECORATIVE — kept for the Google-Maps look, wired to
 * nothing. The incident feed card beside the rail is opened by default and
 * closed/reopened from the round chevron under the zoom-out button, not here.
 *
 * IMPORTANT: this renders ONLY on laptop/desktop widths. Every rule lives in
 * index.css behind `@media (min-width: 1024px)` and the base state is
 * `display: none`, so Android/iPhone portrait views (and tablets) are
 * untouched — no markup, no width, no behaviour changes there.
 */
export const DesktopRail: React.FC<{
  /**
   * A report card is open on the map: the rail's Donate item greys out until
   * it is closed, so the card is never knocked off screen by the dialog.
   */
  donateDisabled?: boolean;
}> = ({ donateDisabled = false }) => {
  // The Donate item drives the SAME dialog the navbar/phone build shows —
  // DonateButton in controlled mode, rendered here without its own trigger.
  const [donateOpen, setDonateOpen] = useState(false);

  return (
  <nav className="desktop-rail" aria-label="Map shortcuts">
    {/* Hamburger — purely decorative, exactly where Google Maps puts its rail
        menu. It is wired to nothing and touches no state: the incident feed is
        permanently docked, so there is nothing here to open or close.
        It is a span, not a button, and hidden from assistive tech — so it is
        not focusable and nobody thinks it is a broken control. */}
    <span className="desktop-rail__item desktop-rail__item--static" aria-hidden="true">
      <span className="desktop-rail__icon">
        <Menu className="h-5 w-5" strokeWidth={2} />
      </span>
    </span>

    {/* Guide — replaced the old "Recents" slot. Same treatment as the Navbar's
        Guide button (decorative for now, no handler), just as a rail item. */}
    <button type="button" className="desktop-rail__item" aria-label="Guide" title="Guide">
      <span className="desktop-rail__icon">
        <BookOpen className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="desktop-rail__label">Guide</span>
    </button>

    {/* Donate — opens the very same QR/GCash card the navbar (and therefore
        the phone build) shows, via DonateButton in controlled mode. */}
    <button
      type="button"
      className="desktop-rail__item"
      aria-label="Donate"
      aria-haspopup="dialog"
      title={donateDisabled ? 'Close the report first' : 'Donate'}
      disabled={donateDisabled}
      onClick={() => setDonateOpen(true)}
    >
      <span className="desktop-rail__icon">
        <Heart className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="desktop-rail__label">Donate</span>
    </button>

    {/* Everything above hugs the top; "Get app" sits at the bottom. */}
    <span className="desktop-rail__spacer" aria-hidden="true" />

    <button type="button" className="desktop-rail__item" aria-label="Get app" title="Get app">
      <span className="desktop-rail__icon">
        <Smartphone className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="desktop-rail__label">Get app</span>
    </button>

    {/* The dialog itself (portals to <body>). No trigger button of its own —
        the rail item above opens it. */}
    <DonateButton open={donateOpen} onOpenChange={setDonateOpen} showTrigger={false} />
  </nav>
  );
};
