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
const mapViewer = read('../src/components/MapViewer.tsx');

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

test('the feed card floats over the map and nothing paints behind it', () => {
  assert.match(app, /id="app-sidebar-panel"/);
  assert.match(app, /className="app-feed-inner"/);

  const card = css.slice(css.indexOf('THE INCIDENT FEEDS CARD FLOATS OVER THE MAP'));

  // The wrapper is out of the flow, transparent, and lets map clicks through.
  assert.match(card, /#app-sidebar-panel \{[\s\S]*?position: absolute;[\s\S]*?left: 92px;[\s\S]*?width: 25rem;[\s\S]*?background: none;[\s\S]*?border: 0;[\s\S]*?box-shadow: none;[\s\S]*?pointer-events: none;/);
  assert.doesNotMatch(card, /#app-sidebar-panel \{[\s\S]{0,500}?background: #ffffff/);

  // Only the feed is a card, and it is the thing you can click.
  assert.match(card, /#app-sidebar-panel > \.app-feed-inner > aside \{[\s\S]*?pointer-events: auto;[\s\S]*?border: 1px solid #e6e8eb;[\s\S]*?border-radius: 24px;[\s\S]*?box-shadow:/);

  // Map controls step aside for the card, and come back when it is hidden.
  assert.match(app, /data-feed-open=\{desktopFeedOpen \? 'true' : 'false'\}/);
  assert.match(card, /#map-control-stack \{\s*left: calc\(25rem \+ 1\.5rem\);\s*\}/);
  assert.match(card, /\[data-feed-open='false'\] #map-control-stack \{\s*left: 1rem;\s*\}/);
  assert.match(mapViewer, /id="map-control-stack"/);

  // Everything is behind the desktop media query.
  assert.ok(card.indexOf('@media (min-width: 1024px)') < card.indexOf('position: absolute;'));
});

test('the feed has no floating ‹ tab on desktop', () => {
  // The tab was removed on request; the rail is the only feed control.
  assert.doesNotMatch(app, /btn-collapse-incident-feeds/);
  assert.doesNotMatch(app, /app-feed-collapse/);
  assert.doesNotMatch(app, /ChevronLeft/);
  assert.doesNotMatch(css, /\.app-feed-collapse/);
  assert.doesNotMatch(css, /overflow-clip-margin/);
  // The card still clips its content to the rounded corners.
  assert.match(css, /#app-sidebar-panel \{[\s\S]*?border-radius: 24px;[\s\S]*?overflow: hidden;/);
});

test('the bottom-left coordinate badge is hidden on laptop/desktop only', () => {
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

test('the rail is the only way to show/hide the feed on desktop', () => {
  // No ✕ and no ‹ tab: the rail's ☰ toggles the panel.
  assert.doesNotMatch(sidebar, /btn-close-incident-feeds/);
  assert.doesNotMatch(sidebar, /onCloseDesktop/);
  assert.doesNotMatch(app, /onCloseDesktop/);
  assert.doesNotMatch(app, /btn-collapse-incident-feeds/);

  assert.match(app, /const \[desktopFeedOpen, setDesktopFeedOpen\] = useState\(true\)/);
  assert.match(app, /desktopFeedOpen \? '' : 'lg:hidden'/);
  assert.match(rail, /onToggleFeed\?\.\(\)/);
  assert.match(app, /onToggleFeed=\{\(\) => setDesktopFeedOpen\(\(open\) => !open\)\}/);
});

test('the feed surfaces share the rail white on laptop/desktop', () => {
  // Rail and the floating card are white…
  assert.match(css, /\.desktop-rail \{[\s\S]{0,400}?background: #ffffff;/);
  assert.match(css, /#app-sidebar-panel > \.app-feed-inner > aside \{[\s\S]{0,200}?border: 1px solid #e6e8eb;/);

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

test('a round chevron under the zoom pair collapses the feed on desktop', () => {
  // The button lives at the bottom of the map control stack…
  assert.match(mapViewer, /id="btn-toggle-feed-round"/);
  assert.match(mapViewer, /className="hidden lg:flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/);
  assert.match(mapViewer, /<ChevronRight/);
  // …sits after the zoom pair…
  const stack = mapViewer.slice(mapViewer.indexOf('id="map-control-stack"'));
  assert.ok(stack.indexOf('id="btn-zoom-out"') < stack.indexOf('id="btn-toggle-feed-round"'));
  // …is desktop-only…
  assert.match(mapViewer, /hidden lg:flex h-9 w-9/);
  // …and toggles the floating card.
  assert.match(mapViewer, /onClick=\{\(\) => onToggleFeed\?\.\(\)\}/);
  assert.match(mapViewer, /aria-expanded=\{desktopFeedOpen\}/);
  assert.match(app, /onToggleFeed=\{\(\) => setDesktopFeedOpen\(\(open\) => !open\)\}/);
});
