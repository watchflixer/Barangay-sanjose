import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Guard for the laptop/desktop layout: the Google-Maps-style left rail, and
 * the removed top navbar.
 *
 * The rail is a laptop/desktop-only strip. The Android/iPhone portrait layout
 * must stay exactly as it is, which means:
 *   – base state is `display: none` (nothing renders below 1024px),
 *   – every visual rule lives inside `@media (min-width: 1024px)`,
 *   – no Tailwind utilities sneak the rail into phone widths,
 *   – the phone-specific breakpoints (`portrait`, `max-width: 640px`) never
 *     mention the rail.
 */
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const css = read('../src/index.css');
const app = read('../src/App.tsx');
const rail = read('../src/components/DesktopRail.tsx');
const navbar = read('../src/components/Navbar.tsx');
const sidebar = read('../src/components/Sidebar.tsx');

/** The rail section of index.css (everything after the section banner). */
const railSection = css.slice(css.indexOf('DESKTOP / LAPTOP LEFT RAIL'));

test('the rail renders nothing until the 1024px breakpoint', () => {
  assert.match(railSection, /\.desktop-rail\s*\{\s*display:\s*none;\s*\}/);
  const mediaIndex = railSection.indexOf('@media (min-width: 1024px)');
  const firstRule = railSection.indexOf('.desktop-rail {');
  assert.notEqual(mediaIndex, -1, 'the rail must be gated by a min-width: 1024px media query');
  assert.ok(mediaIndex < firstRule, 'the display: none base state must come before the media query');
  assert.match(railSection, /display:\s*flex;\s*flex:\s*0 0 84px/);
});

test('every visual rail rule lives inside the laptop/desktop media query', () => {
  const media = railSection.slice(railSection.indexOf('@media (min-width: 1024px)'));
  // The media block is the tail of the section, so it must contain them all.
  for (const selector of [
    '.desktop-rail__item',
    '.desktop-rail__icon',
    '.desktop-rail__label',
    '.desktop-rail__spacer',
  ]) {
    assert.ok(media.includes(selector), `${selector} must sit inside the 1024px media query`);
  }
});

test('no phone breakpoint touches the rail', () => {
  // matchAll yields the full match at index 0 (the pattern has no capture groups).
  for (const [block] of css.matchAll(/@media \((?:orientation: portrait\) and \(max-width: 640px|max-width: 344px)\)\s*\{[\s\S]*?\n\}/g)) {
    assert.doesNotMatch(block, /desktop-rail/, 'a phone-only media query must not style the rail');
  }
});

test('the rail is mounted on the desktop layout and is purely visual', () => {
  // Mounted once, at the top of the workspace row (left of the incident feed).
  assert.match(app, /<DesktopRail/);
  assert.ok(
    app.indexOf('<DesktopRail />') < app.indexOf('<Sidebar'),
    'the rail must come before the Sidebar in the flex row',
  );
  // No Tailwind visibility utilities that would leak it into small screens.
  assert.doesNotMatch(rail, /className="[^"]*\b(?:flex|block|grid)\b[^"]*"/, 'the rail must not opt into a display utility');
  // Nothing on the rail is wired: the incident feed is permanently docked, so
  // there is no panel to open or close from here.
  const wired = rail.match(/onClick=\{[^}]*\}/g) ?? [];
  assert.equal(wired.length, 0, 'the rail must stay purely visual');
  assert.doesNotMatch(rail, /onToggleFeed|feedOpen/);
  // The hamburger is back on request — but DECORATIVE: a span, not a
  // button, with no handler and hidden from assistive tech.
  assert.match(rail, /<Menu className=/);
  assert.match(rail, /desktop-rail__item--static/);
  assert.match(rail, /aria-hidden="true"/);
  const hamburger = rail.slice(rail.indexOf('Hamburger'), rail.indexOf('Active item'));
  assert.doesNotMatch(hamburger, /<button/, 'the hamburger must not be a button');
  assert.doesNotMatch(hamburger, /onClick|aria-label|tabIndex/, 'the hamburger must stay unwired');
  assert.match(hamburger, /<span className="desktop-rail__item desktop-rail__item--static"/);
  // The items the design calls for.
  for (const label of ['Menu', 'Ask Maps', 'Saved', 'Recents', 'Get app']) {
    assert.ok(rail.includes(label), `missing rail item: ${label}`);
  }
  // The location thumbnail chip was removed on request — it must not come back
  // without a new decision (and its CSS is gone too).
  assert.doesNotMatch(rail, /desktop-rail__thumb|San Jose/);
  assert.doesNotMatch(railSection, /desktop-rail__thumb|desktop-rail__divider/);
});

test('the top navbar exists for phones but is hidden on laptop/desktop', () => {
  // Still rendered (phones, tablets and portrait keep it and its functions).
  assert.match(navbar, /id="app-navbar"/);
  assert.match(app, /<Navbar/);

  // Hidden only from 1024px up.
  const rule = /@media \(min-width: 1024px\) \{\s*#app-navbar \{\s*display:\s*none;\s*\}\s*\}/;
  assert.match(css, rule);

  // No phone breakpoint may hide the navbar.
  for (const [block] of css.matchAll(/@media \((?:orientation: portrait\) and \(max-width: 640px|max-width: 344px)\)\s*\{[\s\S]*?\n\}/g)) {
    assert.doesNotMatch(block, /app-navbar/, 'a phone-only media query must not touch the navbar');
  }

  // The desktop hide rule is the ONLY navbar display rule in the stylesheet.
  const displayRules = css.match(/#app-navbar[\s\S]{0,40}display:/g) ?? [];
  assert.equal(displayRules.length, 1, 'navbar display must be driven by exactly one desktop rule');
});

test('the incident feed is ONE floating card on desktop', () => {
  assert.match(app, /id="app-sidebar-panel"/);
  assert.match(app, /className="app-feed-inner"/);

  const card = css.slice(css.indexOf('THE INCIDENT FEED IS ONE FLOATING CARD'));

  // One card: gap from the rail, rounded, hairline + shadow.
  assert.match(card, /#app-sidebar-panel \{[\s\S]*?margin: 8px 10px 8px 8px;[\s\S]*?border-radius: 24px;[\s\S]*?box-shadow:/);
  // The feed inside it adds no second card of its own…
  assert.match(card, /#app-sidebar-panel > \.app-feed-inner > aside \{[\s\S]*?border: 0;[\s\S]*?box-shadow: none;/);
  // …it is only clipped to the card's rounded corners.
  assert.match(app, /id="app-sidebar-panel"/);
  assert.match(sidebar, /lg:border-0 lg:shadow-none/);
  assert.doesNotMatch(sidebar, /lg:rounded-2xl/);
  // The single card lives behind the desktop media query.
  assert.ok(card.indexOf('@media (min-width: 1024px)') < card.indexOf('margin: 8px 10px 8px 8px;'));
});

test('the ‹ collapse tab is removed and stays gone', () => {
  // The tab that used to hang off the card's map-side edge was removed on
  // request — the feed is opened/closed from the rail's ☰ instead.
  // Nothing may bring the markup, the icon or the styles back.
  assert.doesNotMatch(app, /btn-collapse-incident-feeds/);
  assert.doesNotMatch(app, /app-feed-collapse/);
  assert.doesNotMatch(app, /<ChevronLeft/);
  assert.doesNotMatch(css, /app-feed-collapse/);

  // Nothing toggles the feed any more — it is permanently docked.
  assert.doesNotMatch(rail, /onToggleFeed|feedOpen/);
  assert.doesNotMatch(sidebar, /onCloseDesktop/);

  // The inner wrapper keeps full height at every width, so phones are unchanged.
  assert.match(css, /\.app-feed-inner \{\s*height: 100%;\s*min-height: 0;\s*\}/);
});

test('the decorative hamburger has no hover or pointer feedback', () => {
  // It looks like the other rail items but must not feel clickable.
  assert.match(css, /\.desktop-rail__item--static \{\s*cursor: default;\s*\}/);
  assert.match(css, /\.desktop-rail__item--static:hover \.desktop-rail__icon \{\s*background: transparent;\s*\}/);
  // The style lives behind the laptop/desktop media query, like the rest.
  const railSectionEnd = css.indexOf('NO COORDINATE BADGE ON THE MAP');
  const statics = css.indexOf('.desktop-rail__item--static');
  assert.ok(css.indexOf('@media (min-width: 1024px)') < statics && statics < railSectionEnd);
});

test('the bottom-left coordinate badge is hidden on laptop/desktop only', () => {
  const mapViewer = read('../src/components/MapViewer.tsx');
  assert.match(mapViewer, /id="map-coord-badge"/);

  // Hidden from 1024px up…
  const badgeBlock = css.slice(css.indexOf('NO COORDINATE BADGE ON THE MAP'));
  assert.match(badgeBlock, /@media \(min-width: 1024px\) \{\s*#map-coord-badge \{\s*display: none;\s*\}\s*\}/);

  // …and no phone/portrait breakpoint may start hiding or restyling it.
  for (const [phoneBlock] of css.matchAll(/@media \((?:orientation: portrait\) and \(max-width: 640px|max-width: 344px)\)\s*\{[\s\S]*?\n\}/g)) {
    assert.doesNotMatch(phoneBlock, /map-coord-badge/);
  }
});

test('the incident feed keeps a wide desktop panel (~400px)', () => {
  // Outer card 25rem (400px); the inner card fills it (minus the 6px padding).
  assert.match(app, /lg:w-\[25rem\]/);
  assert.match(sidebar, /lg:w-full/);
  // The phone drawer keeps its own widths: no un-prefixed width change.
  assert.match(app, / w-80 sm:w-96 /);
  assert.match(sidebar, /className="flex h-full w-full /);
  // …and the narrow desktop width must not linger anywhere.
  assert.doesNotMatch(app, /lg:w-72/);
  assert.doesNotMatch(sidebar, /lg:w-72/);
});

test('the incident feed is docked on the hazard map and nowhere else', () => {
  // The header X and its onCloseDesktop prop were removed on request, along
  // with the ‹ tab — the feed cannot be hidden by hand any more.
  assert.doesNotMatch(sidebar, /btn-close-incident-feeds/);
  assert.doesNotMatch(sidebar, /onCloseDesktop/);
  assert.doesNotMatch(app, /onCloseDesktop/);
  assert.doesNotMatch(app, /desktopFeedOpen/);

  // It is mounted ONLY on the hazard map: Traffic, Flood Prone, Help Center
  // and Weather replace the map, so the whole panel is conditional on that.
  assert.match(app, /const alternateMapOpen = floodProneOpen \|\| trafficOpen \|\| helpCenterOpen \|\| weatherOpen;/);
  assert.match(app, /const incidentFeedsVisible = !alternateMapOpen;/);
  assert.match(app, /\{incidentFeedsVisible && \(\s*<div\s*\n\s*id="app-sidebar-panel"/);
  // Nothing may mount it unconditionally again.
  assert.equal((app.match(/id="app-sidebar-panel"/g) ?? []).length, 1);

  // Its phone arrow lives inside that panel, so it exists exactly where the
  // panel does — and no longer hides itself on the satellite/dark/light layers.
  const panel = app.slice(app.indexOf('{incidentFeedsVisible && ('), app.indexOf('{/* Backdrop for Mobile Sidebar */}'));
  assert.match(panel, /id="btn-mobile-sidebar-toggle-arrow"/);
  assert.doesNotMatch(panel, /tileLayer === 'streets'/);

  // Leaving the hazard map drops the phone drawer state with it.
  assert.match(app, /if \(!incidentFeedsVisible\) setMobileMenuOpen\(false\);/);
  assert.match(app, /\{mobileMenuOpen && incidentFeedsVisible && \(/);

  // The panel is always docked while it is on screen, next to the rail.
  assert.match(app, /lg:w-\[25rem\]/);
  assert.match(app, /lg:relative/);
  assert.match(rail, /desktop-rail__item--static/);

  // Phones keep their own drawer logic untouched.
  assert.match(app, /mobileMenuOpen \? 'translate-x-0' : '-translate-x-full'/);
});

test('the navbar takes over ●●● and Report when the feed is not there', () => {
  // Those two buttons normally live in the feed header on phones, so the
  // navbar hides its copies — but only while the feed is actually mounted.
  assert.match(app, /feedsVisible=\{incidentFeedsVisible\}/);
  assert.match(navbar, /feedsVisible\?: boolean;/);
  assert.match(navbar, /feedsVisible = true/);
  assert.match(navbar, /className=\{`shrink-0 \$\{feedsVisible \? 'portrait:hidden' : ''\}`\}/);
  assert.match(navbar, /className=\{feedsVisible \? 'portrait:hidden' : ''\}/);
  // Neither button is hidden on portrait by a fixed class any more.
  const options = navbar.slice(navbar.indexOf('<OptionsMenu'), navbar.indexOf('<OptionsMenu') + 400);
  assert.doesNotMatch(options, /className="[^"]*portrait:hidden/);
  const report = navbar.slice(navbar.indexOf('id="btn-report-hazard"'), navbar.indexOf('id="btn-report-hazard"') + 400);
  assert.doesNotMatch(report, /className="[^"]*portrait:hidden/);
});

test('the feed surfaces share the rail white on laptop/desktop', () => {
  // Rail and the floating card are white…
  assert.match(css, /\.desktop-rail \{[\s\S]{0,400}?background: #ffffff;/);
  assert.match(css, /#app-sidebar-panel \{[\s\S]{0,300}?background: #ffffff;/);

  // …so every tinted strip inside the feed turns white from 1024px up:
  // header, scroll area and the footer bar.
  const whiteStrips = sidebar.match(/lg:bg-white/g) ?? [];
  assert.equal(whiteStrips.length, 3, 'header, list area and footer must all be lg:bg-white');
  assert.match(sidebar, /bg-\[#f6f8fc\][^"]*lg:bg-white/);
  assert.match(sidebar, /bg-slate-50\/30[^"]*lg:bg-white/);
  assert.match(sidebar, /class(Name)?="shrink-0 bg-slate-50 px-3 pt-2 lg:bg-white"/);

  // Phones keep their tinted strips: the tints are still the base colour.
  assert.doesNotMatch(sidebar, /\blg:bg-\[#f6f8fc\]\b/);
});
