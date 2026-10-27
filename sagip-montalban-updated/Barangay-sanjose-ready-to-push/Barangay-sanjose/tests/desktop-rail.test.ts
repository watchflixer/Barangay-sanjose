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

test('the rail is mounted on the desktop layout, and is visual-only', () => {
  // Mounted once, at the top of the workspace row (left of the incident feed).
  assert.match(app, /<DesktopRail \/>/);
  assert.ok(
    app.indexOf('<DesktopRail />') < app.indexOf('<Sidebar'),
    'the rail must come before the Sidebar in the flex row',
  );
  // No Tailwind visibility utilities that would leak it into small screens.
  assert.doesNotMatch(rail, /className="[^"]*\b(?:flex|block|grid)\b[^"]*"/, 'the rail must not opt into a display utility');
  // Visual only for now: no handlers wired yet.
  assert.doesNotMatch(rail, /onClick=/);
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

test('the incident feed rounds exactly one corner, at every width except phone portrait', () => {
  assert.match(app, /id="app-sidebar-panel"/);

  const feed = css.slice(css.indexOf('ONE ROUNDED CORNER ON THE INCIDENT FEED'));

  // Exactly one corner: top-right, on the wrapper (which clips).
  assert.match(feed, /#app-sidebar-panel \{\s*border-top-right-radius:\s*24px;\s*overflow:\s*hidden;/);
  // …painted on the white surface and the header strip too.
  assert.match(feed, /#app-sidebar-panel > aside \{[\s\S]*?border-top-right-radius:\s*24px !important;/);
  assert.match(feed, /#app-sidebar-panel > aside > div:first-child \{[\s\S]*?border-top-right-radius:\s*24px !important;/);

  // No other corner is ever rounded.
  assert.doesNotMatch(feed, /border-top-left-radius/);
  assert.doesNotMatch(feed, /border-bottom-left-radius/);
  assert.doesNotMatch(feed, /border-bottom-right-radius/);

  // The radius must NOT be locked behind a desktop-only media query again —
  // that hid it in narrow preview panes.
  const radiusPart = feed.slice(0, feed.indexOf('#app-sidebar-panel {'));
  assert.doesNotMatch(radiusPart, /@media/, 'the corner must not be gated by a min-width query');

  // Phone portrait (Android/iPhone) is explicitly reset to square.
  assert.match(
    feed,
    /@media \(orientation: portrait\) and \(max-width: 640px\) \{\s*#app-sidebar-panel,[\s\S]*?border-top-right-radius:\s*0 !important;/,
  );

  // Flush + full height: no floating card, no Tailwind radius utilities.
  assert.doesNotMatch(feed, /margin:/);
  assert.doesNotMatch(feed, /height:\s*calc/);
  assert.doesNotMatch(app, /lg:rounded/);
  assert.doesNotMatch(sidebar, /lg:rounded/);
});

test('the rounded corner is also inline, so a stale stylesheet cannot hide it', () => {
  // Inline styles beat any stylesheet rule without !important — this is the
  // belt for the case where the built CSS the browser holds is older.
  // (the wrapper's inline style is a multi-line object carrying clipPath too)
  assert.match(app, /borderTopRightRadius: 24,\s*overflow: 'hidden',/);
  assert.match(sidebar, /style=\{\{ borderTopRightRadius: 24, borderRight: 0, boxShadow: 'none' \}\}/);
  assert.match(sidebar, /style=\{\{ borderTopRightRadius: 24 \}\}/);

  // …and phone portrait resets it with !important, which beats inline styles.
  const feed = css.slice(css.indexOf('ONE ROUNDED CORNER ON THE INCIDENT FEED'));
  assert.match(feed, /@media \(orientation: portrait\) and \(max-width: 640px\)/);
  assert.match(feed, /border-top-right-radius:\s*0 !important;/);

  // Only the top-right corner is ever rounded, anywhere.
  for (const source of [app, sidebar]) {
    assert.doesNotMatch(source, /borderTopLeftRadius|borderBottomLeftRadius|borderBottomRightRadius/);
  }
});

test('the corner is clipped with clip-path too, and phones opt out of it', () => {
  // clip-path cuts the shape itself — a child cannot paint over it.
  assert.match(app, /clipPath: 'inset\(0 0 0 0 round 0 24px 0 0\)'/);

  const feed = css.slice(css.indexOf('ONE ROUNDED CORNER ON THE INCIDENT FEED'));
  // Phone portrait must switch the clip (an inline style) back off.
  assert.match(feed, /@media \(orientation: portrait\) and \(max-width: 640px\)/);
  assert.match(feed, /clip-path:\s*none !important;/);
});
