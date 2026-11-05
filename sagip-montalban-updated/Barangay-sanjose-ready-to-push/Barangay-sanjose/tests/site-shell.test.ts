import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Regression guards for the site shell:
 *  - the map Layers button must not be hijacked by page-level scripts (that
 *    blocked Traffic / Flood Prone / Weather / Help Center),
 *  - no hardcoded alert counts or fake status text,
 *  - phone ●●● menu is enabled from the feed header and carries Guide/Donate,
 *  - Guide and Hotlines are wired to real dialogs.
 */
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const indexHtml = read('../index.html');
const sidebar = read('../src/components/Sidebar.tsx');
const navbar = read('../src/components/Navbar.tsx');
const optionsMenu = read('../src/components/OptionsMenu.tsx');
const app = read('../src/App.tsx');
const rail = read('../src/components/DesktopRail.tsx');
const guide = read('../src/components/GuideModal.tsx');

test('index.html carries no Live Status hijack or fake alert badge', () => {
  assert.doesNotMatch(indexHtml, /hazardsync-live-open/);
  assert.doesNotMatch(indexHtml, /hs-live-panel/);
  assert.doesNotMatch(indexHtml, /hs-live-layers-hook/);
  assert.doesNotMatch(indexHtml, /unread critical alerts/);
  assert.doesNotMatch(indexHtml, /addEventListener\('click'[\s\S]{0,200}stopImmediatePropagation/);
});

test('the ?style= deep-link router is kept', () => {
  assert.match(indexHtml, /san-jose-refresh-view/);
  assert.match(indexHtml, /get\('style'\)/);
});

test('no hardcoded fake status text in the feed footer', () => {
  assert.doesNotMatch(sidebar, /Active survey/);
  assert.doesNotMatch(sidebar, /disabled\s*\n?\s*aria-label="Hotlines temporarily unavailable"/);
});

test('phone Options menu is driven by real state, not a hard-coded disabled', () => {
  // The bare `disabled` JSX attribute used to make ●●● permanently inert.
  assert.doesNotMatch(sidebar, /anchor="row"\s*\n\s*disabled\s*\n/);
  assert.match(sidebar, /disabled=\{optionsDisabled\}/);
  assert.match(navbar, /disabled=\{floodProneOpen \|\| trafficOpen \|\| helpCenterOpen \|\| weatherOpen\}/);
  assert.match(sidebar, /<div className="relative flex shrink-0 items-center gap-1\.5">/);
});

test('phone menu offers Guide and Donate alongside the existing entries', () => {
  for (const label of ['Guide', 'Donate', 'Updates', 'Evacuation Centers', 'Resolved / Cleared', 'History']) {
    assert.ok(optionsMenu.includes(label), `OptionsMenu is missing ${label}`);
  }
  assert.match(app, /onOpenDonate=\{\(\) => setIsDonateOpen\(true\)\}/);
  assert.match(app, /<DonateButton open=\{isDonateOpen\}/);
  assert.match(app, /donateDisabled=\{reportPopupOpen \|\| helpPopupOpen\}/);
});

test('Guide, Get app and Hotlines are wired to real handlers', () => {
  assert.match(rail, /aria-label="Guide"[^>]*onClick=\{onOpenGuide\}/);
  assert.match(rail, /aria-label="Get app"[^>]*onClick=\{onOpenGuide\}/);
  assert.match(navbar, /<GuideButton\s+onClick=\{onOpenGuide\}/);
  assert.match(navbar, /id="btn-emergency-hotlines"\s+onClick=\{onOpenHotlinesModal\}/);
  assert.match(app, /<GuideModal isOpen=\{isGuideOpen\}/);
  assert.match(guide, /role="dialog"/);
});

test('Escape closes the guide dialog with the other dialogs', () => {
  assert.match(app, /setIsGuideOpen\(false\);\s*\n\s*setIsAdminOpen\(false\);/);
});

test('map tile attribution is kept on (required by OSM and Esri terms)', () => {
  const mapViewer = read('../src/components/MapViewer.tsx');
  assert.match(mapViewer, /attributionControl: true/);
  assert.doesNotMatch(mapViewer, /attributionControl: false/);
});
