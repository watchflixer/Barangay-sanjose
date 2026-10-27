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
