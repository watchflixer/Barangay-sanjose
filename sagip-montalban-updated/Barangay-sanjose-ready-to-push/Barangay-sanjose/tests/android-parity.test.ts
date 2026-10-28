import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * ANDROID PARITY GUARD
 *
 * Every Android phone is at least 360 CSS px wide, while the Pixel 7 profile is
 * 412 px. This suite makes sure no portrait media query separates that band:
 * a `max-width` between 345px and 411px would give a 360/384/393 Android a
 * different layout from the Pixel 7 and immediately fail here.
 *
 * The 320-class phones (iPhone 5/5s/SE1) keep their own compact profile behind
 * `max-width: 344px`.
 */

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PIXEL7_WIDTH = 412;
const SE1_WIDTH = 320;
const COMPACT_MAX = 344;

function cssFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) cssFiles(full, found);
    else if (/\.(css|html)$/.test(entry)) found.push(full);
  }
  return found;
}

/** Every stylesheet that can style the app, including the inline styles of the
 *  standalone Traffic / Flood Prone maps and the Weather (Panahon) app. */
const sheets = [
  ...cssFiles(path.join(APP, 'src')),
  ...cssFiles(path.join(APP, 'weather-source/src')),
  ...cssFiles(path.join(APP, 'public')),
  path.join(APP, 'index.html'),
  path.join(APP, 'weather.html'),
].map((file) => ({
  file: path.relative(APP, file),
  css: readFileSync(file, 'utf8'),
}));

test('no portrait media query splits Android phones (360–393px) from the Pixel 7', () => {
  const offenders: string[] = [];
  for (const { file, css } of sheets) {
    for (const match of css.matchAll(/@media([^{]+)\{/g)) {
      const condition = match[1];
      if (!condition.includes('portrait')) continue;
      for (const width of condition.matchAll(/max-width:\s*(\d+)px/g)) {
        const limit = Number(width[1]);
        if (limit > COMPACT_MAX && limit < PIXEL7_WIDTH) {
          offenders.push(`${file}: @media ${condition.trim()}`);
        }
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `Android phones must render the Pixel 7 profile; these breakpoints separate them:\n${offenders.join('\n')}`,
  );
});

test('the compact phone profile is limited to the 320-class screens', () => {
  for (const { file, css } of sheets) {
    for (const match of css.matchAll(/@media([^{]+)\{/g)) {
      const condition = match[1];
      if (!condition.includes('portrait')) continue;
      for (const width of condition.matchAll(/max-width:\s*(\d+)px/g)) {
        const limit = Number(width[1]);
        if (limit <= PIXEL7_WIDTH) {
          assert.ok(
            limit <= COMPACT_MAX,
            `${file}: portrait max-width ${limit}px must be <= ${COMPACT_MAX}px or >= ${PIXEL7_WIDTH}px`,
          );
        }
      }
    }
  }
  // 320px still gets its own tuned layout instead of inheriting the 412px one.
  assert.ok(SE1_WIDTH < COMPACT_MAX, 'the SE1 width must stay inside the compact profile');
});

test('the hazard map keeps one zoom profile for Android and the Pixel 7', () => {
  const map = readFileSync(path.join(APP, 'src/components/MapViewer.tsx'), 'utf8');
  const query = map.match(/SMALL_PORTRAIT_QUERY\s*=\s*'([^']+)'/);
  assert.ok(query, 'SMALL_PORTRAIT_QUERY must stay explicit');
  const limit = Number(query[1].match(/max-width:\s*(\d+)px/)?.[1]);
  assert.equal(limit, COMPACT_MAX, 'the map zoom profile must switch only on the 320-class screens');
  assert.ok(limit < 360, 'a 360px Android must keep the Pixel 7 zoom profile');

  // Every zoom knob that depends on the profile stays in one place.
  for (const fn of ['hazardStartZoom', 'hazardMinZoom', 'hazardZoomSnap']) {
    assert.ok(map.includes(fn), `${fn} must stay defined in MapViewer.tsx`);
  }
});

test('the Android preview frame is still 360x800, inside the Pixel 7 band', () => {
  const preview = readFileSync(path.join(APP, 'public/mobile-preview.html'), 'utf8');
  const frame = preview.match(/width="(\d+)" height="(\d+)" title="Android"/);
  assert.ok(frame, 'the Android preview frame must stay in mobile-preview.html');
  const width = Number(frame[1]);
  assert.ok(width >= 360 && width < PIXEL7_WIDTH, 'the Android frame must exercise the shared profile');
  assert.ok(width > COMPACT_MAX, 'the Android frame must not hit the 320-class profile');
});
