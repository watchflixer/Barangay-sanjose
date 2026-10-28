import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

/**
 * Android == Pixel 7, pixel for pixel where it counts.
 *
 * The app is loaded at the Pixel 7 portrait width (412 x 915) and at the
 * common Android widths (360, 384, 393). Every metric that the old 360px
 * profile used to shrink — brand mark, Guide/Donate pills, incident-feed
 * drawer, floating map controls and weather card — must compute to the exact
 * same value on all of them. The 320-class iPhone keeps its own compact rules.
 */

const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const IPHONE_SE1_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1';

const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const readMetrics = (page) =>
  page.evaluate(() => {
    const style = (el, prop) => (el ? getComputedStyle(el)[prop] : null);
    const brand = document.querySelector('#btn-brand-refresh');
    const guide = document.querySelector('#btn-guide');
    const donate = document.querySelector('#btn-donate');
    const panel = document.querySelector('#app-sidebar-panel');
    const zoomIn = document.querySelector('#btn-zoom-in');
    const stack = document.querySelector('#map-control-stack');
    const weather = document.querySelector('#weather-card');
    const box = (el) => (el ? el.getBoundingClientRect() : null);
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      brandIcon: brand ? style(brand.querySelector('svg'), 'width') : null,
      brandText: brand ? style(brand.querySelector('[role="heading"]'), 'fontSize') : null,
      guideHeight: guide ? style(guide, 'height') : null,
      guideFont: guide ? style(guide, 'fontSize') : null,
      donateHeight: donate ? style(donate, 'height') : null,
      drawerWidth: panel ? Math.round(box(panel).width) : null,
      zoomBox: zoomIn ? `${Math.round(box(zoomIn).width)}x${Math.round(box(zoomIn).height)}` : null,
      zoomIcon: zoomIn ? style(zoomIn.querySelector('svg'), 'width') : null,
      stackGap: stack ? style(stack, 'gap') : null,
      stackLeft: stack ? style(stack, 'left') : null,
      weatherWidth: weather ? style(weather, 'width') : null,
    };
  });

async function measure({ width, height, ua }) {
  const context = await browser.newContext({
    viewport: { width, height },
    userAgent: ua,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort(),
  );
  await page.addInitScript(() => {
    try {
      localStorage.setItem('hazardsync:visits-offline', '1');
    } catch {}
  });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const openFeed = page.getByRole('button', { name: 'Open incident feeds', exact: true });
  if (await openFeed.isVisible().catch(() => false)) await openFeed.click();
  await page.waitForTimeout(350);
  const metrics = await readMetrics(page);
  assert.deepEqual(errors, [], `no page errors at ${width}px`);
  assert.equal(metrics.overflow, false, `no horizontal overflow at ${width}px`);
  await context.close();
  return metrics;
}

async function measureView(view, width) {
  const context = await browser.newContext({
    viewport: { width, height: 820 },
    userAgent: ANDROID_UA,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  // These standalone documents pull basemap/weather SDKs from public CDNs,
  // which this sandbox blocks; only the layout metrics matter here.
  await page.route('**/*', (route) =>
    new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort(),
  );
  await page.goto(`${base}${view.path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(view.wait ?? 1100);
  const metrics = await page.evaluate(view.measure);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
    `no horizontal overflow in ${view.path} at ${width}px`,
  );
  await context.close();
  return metrics;
}

try {
  const pixel7 = await measure({ width: 412, height: 915, ua: ANDROID_UA });

  for (const [width, height] of [
    [360, 800],
    [384, 854],
    [393, 873],
    [412, 915],
  ]) {
    const android = await measure({ width, height, ua: ANDROID_UA });
    const { overflow: _pixel7Overflow, ...pixel7Metrics } = pixel7;
    const { overflow: androidOverflow, ...androidMetrics } = android;
    assert.equal(androidOverflow, false, `no horizontal overflow at ${width}px`);
    assert.deepEqual(
      androidMetrics,
      pixel7Metrics,
      `Android ${width}px must compute exactly like the Pixel 7 profile`,
    );
    console.log(`Android ${width}×${height} matches the Pixel 7 profile`);
  }

  // Weather, Traffic and Flood Prone are separate documents inside the app;
  // they must agree with the Pixel 7 profile too.
  const views = [
    {
      path: '/rizal_traffic_map.html',
      measure: () => {
        const title = document.querySelector('#rt-title');
        const ctrl = document.querySelector('#host-map-controls .host-map-control');
        return {
          title: title ? getComputedStyle(title).fontSize : null,
          ctrl: ctrl ? `${Math.round(ctrl.getBoundingClientRect().width)}x${Math.round(ctrl.getBoundingClientRect().height)}` : null,
        };
      },
    },
    {
      path: '/rizal_flood_100yr_map.html',
      measure: () => {
        const ctrl = document.querySelector('#host-map-controls .host-map-control');
        return {
          ctrl: ctrl ? `${Math.round(ctrl.getBoundingClientRect().width)}x${Math.round(ctrl.getBoundingClientRect().height)}` : null,
        };
      },
    },
    {
      path: '/weather.html',
      wait: 2200,
      measure: () => {
        const stack = document.querySelector('.ph-map-controls');
        const ctrl = document.querySelector('.ph-map-controls .ph-ctrl');
        return {
          gap: stack ? getComputedStyle(stack).gap : null,
          left: stack ? getComputedStyle(stack).left : null,
          ctrl: ctrl ? `${Math.round(ctrl.getBoundingClientRect().width)}x${Math.round(ctrl.getBoundingClientRect().height)}` : null,
        };
      },
    },
  ];
  for (const view of views) {
    const at412 = await measureView(view, 412);
    for (const width of [360, 384, 393]) {
      assert.deepEqual(
        await measureView(view, width),
        at412,
        `${view.path} must render the Pixel 7 profile at ${width}px`,
      );
    }
    console.log(`${view.path} matches the Pixel 7 profile on Android widths`);
  }

  // The compact profile is still there for genuine 320-class phones.
  const se1 = await measure({ width: 320, height: 568, ua: IPHONE_SE1_UA });
  assert.notEqual(se1.brandIcon, pixel7.brandIcon, '320px keeps its compact brand mark');
  assert.notEqual(se1.drawerWidth, pixel7.drawerWidth, '320px keeps its own drawer width');
  assert.ok(Number.parseInt(se1.zoomBox, 10) < Number.parseInt(pixel7.zoomBox, 10), '320px keeps compact map controls');
  console.log('320×568 keeps its compact profile');

  console.log('All Android widths render the Pixel 7 profile');
} finally {
  await browser.close();
}
