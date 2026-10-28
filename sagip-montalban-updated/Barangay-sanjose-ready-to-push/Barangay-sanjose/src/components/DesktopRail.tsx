import React from 'react';
import { Bookmark, History, Menu, Search, Smartphone, Sparkles } from 'lucide-react';

/**
 * DESKTOP / LAPTOP RAIL — Google-Maps-style icon rail on the far left.
 *
 * Visual only (no handlers): the narrow strip with the hamburger, "Ask Maps",
 * "Saved", "Recents" and "Get app" at the bottom.
 *
 * The hamburger is DECORATIVE — kept for the Google-Maps look, wired to
 * nothing. The incident feed card beside the rail is permanently docked (no
 * X, no `‹` tab), so no control anywhere can hide it on laptop/desktop.
 *
 * IMPORTANT: this renders ONLY on laptop/desktop widths. Every rule lives in
 * index.css behind `@media (min-width: 1024px)` and the base state is
 * `display: none`, so Android/iPhone portrait views (and tablets) are
 * untouched — no markup, no width, no behaviour changes there.
 */
export const DesktopRail: React.FC = () => (
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

    {/* Active item, exactly like Google Maps' highlighted "Ask Maps" */}
    <button
      type="button"
      className="desktop-rail__item is-active"
      aria-label="Ask Maps"
      aria-current="page"
      title="Ask Maps"
    >
      <span className="desktop-rail__icon desktop-rail__icon--ask">
        <Search className="h-5 w-5" strokeWidth={2} />
        <Sparkles className="desktop-rail__sparkle" strokeWidth={2} />
      </span>
      <span className="desktop-rail__label">Ask Maps</span>
    </button>

    <button type="button" className="desktop-rail__item" aria-label="Saved" title="Saved">
      <span className="desktop-rail__icon">
        <Bookmark className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="desktop-rail__label">Saved</span>
    </button>

    <button type="button" className="desktop-rail__item" aria-label="Recents" title="Recents">
      <span className="desktop-rail__icon">
        <History className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="desktop-rail__label">Recents</span>
    </button>

    {/* Everything above hugs the top; "Get app" sits at the bottom. */}
    <span className="desktop-rail__spacer" aria-hidden="true" />

    <button type="button" className="desktop-rail__item" aria-label="Get app" title="Get app">
      <span className="desktop-rail__icon">
        <Smartphone className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="desktop-rail__label">Get app</span>
    </button>
  </nav>
);
