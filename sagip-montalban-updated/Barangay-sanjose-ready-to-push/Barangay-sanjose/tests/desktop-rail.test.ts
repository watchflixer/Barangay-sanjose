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

  // The rail still toggles the feed.
  assert.match(rail, /onToggleFeed\?\.\(\)/);

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

test('the feed header X is removed; the rail alone opens and closes the feed', () => {
  // The header X (and its onCloseDesktop prop) was removed on request along
  // with the ‹ tab — it must not come back anywhere.
  assert.doesNotMatch(sidebar, /btn-close-incident-feeds/);
  assert.doesNotMatch(sidebar, /onCloseDesktop/);
  assert.doesNotMatch(app, /onCloseDesktop/);
  assert.doesNotMatch(app, /btn-close-incident-feeds/);

  // App still tracks the open state, applied with an `lg:` utility only…
  assert.match(app, /const \[desktopFeedOpen, setDesktopFeedOpen\] = useState\(true\)/);
  assert.match(app, /desktopFeedOpen \? '' : 'lg:hidden'/);

  // …and the rail's hamburger is the one control that toggles it.
  assert.match(rail, /onToggleFeed\?\.\(\)/);
  assert.match(app, /onToggleFeed=\{\(\) => setDesktopFeedOpen\(\(open\) => !open\)\}/);

  // Phones keep their own drawer logic untouched.
  assert.match(app, /mobileMenuOpen \? 'translate-x-0' : '-translate-x-full'/);
  assert.doesNotMatch(sidebar, /lg:inline-flex[^"]*text-\[#5f6368\][^"]*rounded-full[^"]*hover:bg-\[#e8eaed\]/);
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
