import React from 'react';
import { Menu, Smartphone } from 'lucide-react';

/**
 * DESKTOP / LAPTOP RAIL — Google-Maps-style icon rail on the far left.
 *
 * Visual only for now (no handlers): the narrow strip keeps just the
 * hamburger at the top and "Get app" at the bottom. The Ask Maps / Saved /
 * Recents items were removed on request.
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
