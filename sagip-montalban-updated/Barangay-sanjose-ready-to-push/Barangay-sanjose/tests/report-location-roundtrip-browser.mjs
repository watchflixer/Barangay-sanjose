import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { baseReport, createBackend } from './supabase-mock.mjs';

/**
 * STREET / SPECIFIC LOCATION — ROUND TRIP
 *
 * A resident types any free-form location text. Once an admin accepts the
 * report, the public feed and the map popup must show EXACTLY that text — no
 * rewrite, no nearest-street substitution, no truncation of the stored value.
 *
 * This is the guard for two regressions that already shipped once:
 *   - the field had a hard-coded default street, and
 *   - the pin picker overwrote whatever was typed.
 */
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
  'base64',
);

// Deliberately not one of the quick-pick streets: mixed casing, punctuation,
// Filipino text and an address detail no geocoder would produce.
const TYPED_LOCATION =
  'Purok 3, Blk 12 Lot 8 — likod ng covered court, katabi ng tulay (Sampaloc St.)';

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    reducedMotion: 'reduce',
    geolocation: { latitude: 14.744123, longitude: 121.135987, accuracy: 10 },
    permissions: ['geolocation'],
  });
  const backend = createBackend([baseReport('hz-001', { title: 'Existing riverside flooding' })]);
  await backend.install(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base);
  await page.locator('#alert-card-hz-001').waitFor();

  // ---------------------------------------------------------------- report in
  await page.locator('button[aria-label="Report a hazard"]:visible').first().click();
  await page.locator('#hazard-street').waitFor();
  assert.equal(
    await page.locator('#hazard-street').inputValue(),
    '',
    'the location field must start blank instead of pre-filling a street',
  );

  await page
    .getByPlaceholder('e.g. Waist-deep flood along river dike / Snapped electrical cable')
    .fill('Tulay sa Sampaloc, may baha');
  await page.locator('#hazard-street').fill(TYPED_LOCATION);
  await page.getByPlaceholder('e.g. Juan Dela Cruz').fill('Maria Santos');
  await page.getByPlaceholder('e.g. 09171234567').fill('09171234567');
  await page.getByPlaceholder('e.g. juan@gmail.com').fill('maria.santos@gmail.com');

  // Pick the pin on the map. The picker must not touch the typed street.
  await page.getByRole('button', { name: 'Click Pin On Map' }).click();
  const picker = page.locator('#location-picker');
  await picker.waitFor();
  await picker.getByRole('button', { name: 'Show your location' }).click();
  await picker.getByRole('button', { name: 'Use This Location' }).click();
  await page.locator('#hazard-street').waitFor();
  assert.equal(
    await page.locator('#hazard-street').inputValue(),
    TYPED_LOCATION,
    'choosing the pin must not overwrite the typed location',
  );

  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: 'proof.png', mimeType: 'image/png', buffer: png });
  await page.getByText('Photo Proof Attached', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Submit hazard report' }).click();
  await page.getByRole('status').filter({ hasText: 'Report received' }).waitFor();
  await page.getByRole('button', { name: 'Dismiss report confirmation' }).click();

  const submitted = backend.state.reports.find(
    (report) => report.title === 'Tulay sa Sampaloc, may baha',
  );
  assert.ok(submitted, 'the report reached the server');
  assert.equal(submitted.review_status, 'pending', 'it waits for an admin decision');
  assert.equal(submitted.street_name, TYPED_LOCATION, 'saved word-for-word on submit');
  assert.ok(Math.abs(submitted.lat - 14.744123) < 1e-5, 'pin latitude is the picked point');
  assert.ok(Math.abs(submitted.lng - 121.135987) < 1e-5, 'pin longitude is the picked point');

  // ------------------------------------------------------------ admin accepts
  // The admin UI calls exactly this RPC when it publishes a report; the SQL
  // body only touches review_status/reviewed_at/decline_reason.
  backend.rpc('admin_change', {
    p_password: 'admin',
    p_id: submitted.id,
    p_change: { type: 'review', value: 'accepted' },
  });
  const accepted = backend.state.reports.find((report) => report.id === submitted.id);
  assert.equal(accepted.review_status, 'accepted');
  assert.equal(accepted.street_name, TYPED_LOCATION, 'accepting must not rewrite the location');

  // Residents pick the published report up from the public feed.
  await page.reload();
  await page.locator('#alert-card-hz-001').waitFor();

  const openFeed = async () => {
    const button = page.getByRole('button', { name: 'Show incident feeds', exact: true });
    if (await button.isVisible()) await button.click();
  };
  await openFeed();

  // -------------------------------------------------- what residents now see
  const card = page.locator(`#alert-card-${submitted.id}`);
  await card.waitFor();
  const cardText = (await card.textContent()) ?? '';
  assert.ok(
    cardText.includes(TYPED_LOCATION),
    `the feed card must show the typed location, got: ${cardText.slice(0, 200)}`,
  );

  // The Leaflet popup on the map must show it too.
  await page.locator(`#map-pin-${submitted.id}`).click();
  const popup = page.locator('.leaflet-popup-content');
  await popup.waitFor();
  const popupText = (await popup.textContent()) ?? '';
  assert.ok(
    popupText.includes(TYPED_LOCATION),
    `the map popup must show the typed location, got: ${popupText.slice(0, 200)}`,
  );

  // The card must WRAP the location, not clip it with an ellipsis: a clipped
  // card made a long free-text location look like it was cut off on submit.
  const feedLocation = card.locator('span', { hasText: 'Purok 3' }).first();
  const fit = await feedLocation.evaluate((node) => ({
    text: node.textContent,
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
  }));
  assert.equal(fit.text, TYPED_LOCATION, 'the feed shows the full text, not a shortened one');
  assert.ok(
    fit.scrollWidth <= fit.clientWidth + 1,
    `the feed must wrap the location instead of clipping it (${fit.scrollWidth} > ${fit.clientWidth})`,
  );

  // Nothing was mangled along the way (no HTML escaping leaking into the UI).
  assert.ok(!cardText.includes('&amp;') && !popupText.includes('&amp;'), 'text renders cleanly');

  assert.deepEqual(errors, []);
  console.log('Free-text Street / Specific Location survives admin acceptance');
  await context.close();
} finally {
  await browser.close();
}
