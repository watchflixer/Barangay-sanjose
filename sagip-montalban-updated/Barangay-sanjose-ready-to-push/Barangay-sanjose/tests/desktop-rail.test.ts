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
  for (const [block] of css.matchAll(/@media \((?:orientation: portrait\) and \(max-width: 640px|max-width: 400px)\)\s*\{[\s\S]*?\n\}/g)) {
    assert.doesNotMatch(block, /desktop-rail/, 'a phone-only media query must not style the rail');
  }
});

test('the rail is mounted on the desktop layout, with only the feed toggle wired', () => {
  // Mounted once, at the top of the workspace row (left of the incident feed).
  assert.match(app, /<DesktopRail/);
  assert.ok(
    app.indexOf('<DesktopRail />') < app.indexOf('<Sidebar'),
    'the rail must come before the Sidebar in the flex row',
  );
  // No Tailwind visibility utilities that would leak it into small screens.
  assert.doesNotMatch(rail, /className="[^"]*\b(?:flex|block|grid)\b[^"]*"/, 'the rail must not opt into a display utility');
  // The only wired control is the hamburger, which toggles the feed panel.
  const wired = rail.match(/onClick=\{[^}]*\}/g) ?? [];
  assert.equal(wired.length, 1, 'only the hamburger may be wired');
  assert.match(wired[0], /onToggleFeed/);
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
  for (const [block] of css.matchAll(/@media \((?:orientation: portrait\) and \(max-width: 640px|max-width: 400px)\)\s*\{[\s\S]*?\n\}/g)) {
    assert.doesNotMatch(block, /app-navbar/, 'a phone-only media query must not touch the navbar');
  }

  // The desktop hide rule is the ONLY navbar display rule in the stylesheet.
  const displayRules = css.match(/#app-navbar[\s\S]{0,40}display:/g) ?? [];
  assert.equal(displayRules.length, 1, 'navbar display must be driven by exactly one desktop rule');
});

test('the incident feed is ONE flush card on desktop, like the Google panel', () => {
  assert.match(app, /id="app-sidebar-panel"/);
  assert.match(app, /className="app-feed-inner"/);

  const card = css.slice(css.indexOf('THE INCIDENT FEED IS ONE FLOATING CARD'));

  // Flush with the rail, the top and the bottom, with only the map-side top
  // corner rounded — no floating margins, no second card inside.
  assert.match(card, /#app-sidebar-panel \{[\s\S]*?margin: 0;[\s\S]*?height: 100%;[\s\S]*?border-radius: 0 24px 0 0;/);
  assert.doesNotMatch(card, /margin: 8px 10px 8px 8px/);
  assert.match(card, /#app-sidebar-panel > \.app-feed-inner > aside \{[\s\S]*?border: 0;[\s\S]*?box-shadow: none;/);
  // The single card lives behind the desktop media query.
  assert.ok(card.indexOf('@media (min-width: 1024px)') < card.indexOf('margin: 0;'));
});

test('the ‹ tab collapses the feed and exists only on laptop/desktop', () => {
  // Markup: a real button wired to the open state.
  assert.match(app, /id="btn-collapse-incident-feeds"/);
  assert.match(app, /onClick=\{\(\) => setDesktopFeedOpen\(false\)\}/);
  assert.match(app, /className="app-feed-collapse"/);

  // CSS: hidden by default, shown only from 1024px, sitting on the card edge.
  assert.match(css, /\.app-feed-collapse \{\s*display: none;\s*\}/);
  const card = css.slice(css.indexOf('THE INCIDENT FEED IS ONE FLOATING CARD'));
  assert.match(card, /\.app-feed-collapse \{[\s\S]*?right: -15px;[\s\S]*?border-radius: 999px;/);
  assert.match(card, /@media \(min-width: 1024px\) \{\s*\.app-feed-collapse \{\s*display: flex;\s*\}/);

  // The inner wrapper keeps full height at every width, so phones are unchanged.
  assert.match(css, /\.app-feed-inner \{\s*height: 100%;\s*min-height: 0;\s*\}/);
});

test('the bottom-left coordinate badge is hidden on laptop/desktop only', () => {
  const mapViewer = read('../src/components/MapViewer.tsx');
  assert.match(mapViewer, /id="map-coord-badge"/);

  // Hidden from 1024px up…
  const badgeBlock = css.slice(css.indexOf('NO COORDINATE BADGE ON THE MAP'));
  assert.match(badgeBlock, /@media \(min-width: 1024px\) \{\s*#map-coord-badge \{\s*display: none;\s*\}\s*\}/);

  // …and no phone/portrait breakpoint may start hiding or restyling it.
  for (const [phoneBlock] of css.matchAll(/@media \((?:orientation: portrait\) and \(max-width: 640px|max-width: 400px)\)\s*\{[\s\S]*?\n\}/g)) {
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

test('the feed collapses from the ‹ tab and comes back from the rail', () => {
  assert.match(app, /id="btn-collapse-incident-feeds"/);
  assert.match(app, /onClick=\{\(\) => setDesktopFeedOpen\(false\)\}/);
  assert.match(app, /const \[desktopFeedOpen, setDesktopFeedOpen\] = useState\(true\)/);
  assert.match(app, /desktopFeedOpen \? '' : 'lg:hidden'/);
  assert.match(app, /onToggleFeed=\{\(\) => setDesktopFeedOpen\(\(open\) => !open\)\}/);
  assert.match(rail, /onToggleFeed\?\.\(\)/);
  // The old header X is gone; nothing closes the feed on phones.
  assert.doesNotMatch(sidebar, /btn-close-incident-feeds/);
  assert.doesNotMatch(sidebar, /onCloseDesktop/);
});

test('the desktop panel chrome mirrors the Google Maps Lists panel', () => {
  // Search pill, underlined status tabs, light-blue CTA, category chips.
  assert.match(sidebar, /id="input-hazard-search-desktop"/);
  assert.match(sidebar, /flex h-12 items-center gap-3 rounded-full border border-\[#dadce0\]/);
  assert.match(sidebar, /id=\{`filter-status-\$\{status\}-desktop`\}/);
  assert.match(sidebar, /h-\[3px\] rounded-t-sm bg-\[#1a73e8\]/);
  assert.match(sidebar, /id="btn-report-hazard-desktop"[\s\S]{0,300}?bg-\[#c2e7ff\]/);
  assert.match(sidebar, /New report/);
  assert.match(sidebar, /id=\{`filter-\$\{type\}-desktop`\}/);

  // Rows are Google-style: leading icon, title + muted meta, actions.
  assert.match(sidebar, /id=\{`alert-row-\$\{alert\.id\}`\}/);
  assert.match(sidebar, /truncate text-\[14px\] font-medium leading-5 text-\[#202124\]/);

  // …and the whole chrome is desktop-only, built twice: phones keep the old
  // compact header (lg:hidden) and the photo cards (lg:hidden).
  assert.match(sidebar, /className="hidden shrink-0 bg-white lg:block"/);
  assert.match(sidebar, /bg-\[#f6f8fc\][^"]*lg:hidden/);
  assert.match(sidebar, /cursor-pointer lg:hidden/);
  assert.match(sidebar, /hidden cursor-pointer items-center gap-3 rounded-lg px-3 py-2\.5 transition-colors lg:flex/);
});
