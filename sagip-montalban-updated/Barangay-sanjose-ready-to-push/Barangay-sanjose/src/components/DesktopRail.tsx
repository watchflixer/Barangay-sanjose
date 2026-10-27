import React from 'react';
import { Bookmark, History, Menu, Search, Smartphone, Sparkles } from 'lucide-react';

/**
 * DESKTOP / LAPTOP RAIL — Google-Maps-style icon rail on the far left.
 *
 * Visual only for now (no handlers): it is the narrow strip with the
 * hamburger, "Ask Maps", "Saved", "Recents", the small location thumbnail and
 * "Get app" at the bottom.
 *
 * IMPORTANT: this renders ONLY on laptop/desktop widths. Every rule lives in
 * index.css behind `@media (min-width: 1024px)` and the base state is
 * `display: none`, so Android/iPhone portrait views (and tablets) are
 * untouched — no markup, no width, no behaviour changes there.
 */
export const DesktopRail: React.FC = () => (
  <nav className="desktop-rail" aria-label="Map shortcuts">
    {/* Hamburger — same spot as Google Maps' rail menu */}
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

    {/* Everything above hugs the top; the location chip sits at the bottom. */}
    <span className="desktop-rail__spacer" aria-hidden="true" />

    {/* Current place chip — tiny map thumbnail + label */}
    <button type="button" className="desktop-rail__item" aria-label="Barangay San Jose" title="Barangay San Jose">
      <span className="desktop-rail__thumb" aria-hidden="true">
        <svg viewBox="0 0 44 44" role="presentation" focusable="false">
          <rect width="44" height="44" fill="#e8f0e4" />
          <path d="M0 0h18l4 12-8 10-14-4z" fill="#d6e8cf" />
          <path d="M26 0h18v16l-9 5-11-7z" fill="#cfe4c7" />
          <path d="M0 30l14 3 5 11H0z" fill="#d9e9d2" />
          <path d="M18 44l6-14 20 6v8z" fill="#e2ecdc" />
          <path d="M0 22h44M22 0v44" stroke="#ffffff" strokeWidth="2.5" />
          <path d="M10 6l28 30" stroke="#f6d9a8" strokeWidth="2.5" />
        </svg>
      </span>
      <span className="desktop-rail__label">San Jose</span>
    </button>

    <span className="desktop-rail__divider" aria-hidden="true" />

    <button type="button" className="desktop-rail__item" aria-label="Get app" title="Get app">
      <span className="desktop-rail__icon">
        <Smartphone className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="desktop-rail__label">Get app</span>
    </button>
  </nav>
);
