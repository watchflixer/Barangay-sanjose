import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Guard for the Panahon (Weather) overlay widths.
 *
 * The mode bar and the bottom overlay stack were far too wide on a laptop
 * screen, so they are capped to a compact centred column — ON LAPTOP/DESKTOP
 * ONLY. The Android/iPhone portrait layouts must keep the original full-width
 * cards, which means every width constraint has to be `lg:`-prefixed (the same
 * 1024px media query the rest of the app uses).
 */
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const app = read('../weather-source/src/App.tsx');
const topBar = read('../weather-source/src/components/TopBar.tsx');
const playback = read('../weather-source/src/components/PlaybackControls.tsx');
const legend = read('../weather-source/src/components/LegendCard.tsx');

/** className of the first opening tag containing `marker`. */
function classNameOf(source: string, marker: string): string {
  const at = source.indexOf(marker);
  assert.notEqual(at, -1, `could not find ${marker}`);
  // Widen to the whole opening tag around the marker: some markers (the
  // aria-label, a colour utility) are not the first attribute/class.
  const start = source.lastIndexOf('<', at);
  const tag = source.slice(start === -1 ? at : start, source.indexOf('>', at));
  const match = tag.match(/className=(?:"([^"]*)"|\{`([^`]*)`\})/);
  assert.ok(match, `no className on the tag containing ${marker}`);
  return match![1] ?? match![2] ?? '';
}

/** Utilities that apply below the `lg` breakpoint — i.e. what phones see. */
const phoneUtilities = (classes: string) =>
  classes.split(/\s+/).filter(cls => cls && !/^(?:lg|xl|2xl):/.test(cls));

const widthCap = (classes: string) => classes.match(/lg:max-w-\[([^\]]+)\]/)?.[1];

test('the mode bar is width-capped on laptop/desktop only', () => {
  const nav = classNameOf(topBar, 'aria-label="Weather modes"');
  assert.equal(widthCap(nav), '26rem');

  // Phones keep the original edge-to-edge bar: same width formula, no cap.
  const phone = phoneUtilities(nav);
  assert.ok(phone.includes('w-[calc(100%-12px)]'), 'portrait keeps its full-width formula');
  assert.deepEqual(phone.filter(cls => cls.startsWith('max-w-')), [], 'no cap may leak into portrait');
});

test('the bottom overlay stack is width-capped on laptop/desktop only', () => {
  const stack = classNameOf(app, 'Floating Bottom Overlays');
  const nav = classNameOf(topBar, 'aria-label="Weather modes"');

  // Same 26rem column as the mode bar, so the two line up on desktop…
  assert.equal(widthCap(stack), '26rem');
  assert.equal(widthCap(stack), widthCap(nav));
  // …and it is centred rather than pinned to the left edge.
  assert.match(stack, /\blg:mx-auto\b/);

  // Phones keep the original edge-to-edge positioning, untouched.
  const phone = phoneUtilities(stack);
  assert.deepEqual(phone.filter(cls => cls.startsWith('max-w-')), [], 'no cap may leak into portrait');
  for (const cls of ['absolute', 'bottom-4', 'left-3', 'right-3']) {
    assert.ok(phone.includes(cls), `portrait must keep ${cls}`);
  }
});

test('the overlay cards fill that column and never size themselves', () => {
  const cases: Array<[string, string]> = [
    ['PlaybackControls', classNameOf(playback, 'bg-white rounded-xl')],
    ['LegendCard', classNameOf(legend, 'bg-white border border-slate-200')],
  ];
  for (const [name, classes] of cases) {
    assert.doesNotMatch(classes, /\bmax-w-/, `${name} must not cap its own width`);
    assert.doesNotMatch(classes, /\bw-(?:full|screen)\b|\bw-\[/, `${name} must fill its parent`);
  }
});
