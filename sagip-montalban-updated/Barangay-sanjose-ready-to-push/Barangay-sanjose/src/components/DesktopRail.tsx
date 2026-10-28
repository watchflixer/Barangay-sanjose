import React from 'react';
import { Bookmark, History, Menu, Search, Smartphone, Sparkles } from 'lucide-react';

/**
 * DESKTOP / LAPTOP RAIL — Google-Maps-style icon rail on the far left.
 *
 * Visual only (no handlers): the narrow strip with the hamburger, "Ask Maps",
 * "Saved", "Recents" and "Get app" at the bottom. The incident feed card
 * next to it is permanently docked, so nothing here opens or closes it.
 *
 * IMPORTANT: this renders ONLY on laptop/desktop widths. Every rule lives in
 * index.css behind `@media (min-width: 1024px)` and the base state is
 * `display: none`, so Android/iPhone portrait views (and tablets) are
 * untouched — no markup, no width, no behaviour changes there.
 */
export const DesktopRail: React.FC = () => (
  <nav className="desktop-rail" aria-label="Map shortcuts">
    {/* Hamburger — same spot as Google Maps' rail menu. The incident feed
        panel beside it is permanently docked (no X, no `‹` tab, no toggle),
        so this is a static rail item like the rest. */}
    <button type="button" className="desktop-rail__item" aria-label="Menu" title="Menu">
      <span className="desktop-rail__icon">
        <Menu className="h-5 w-5" strokeWidth={2} />
      </span>
    </button>

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
