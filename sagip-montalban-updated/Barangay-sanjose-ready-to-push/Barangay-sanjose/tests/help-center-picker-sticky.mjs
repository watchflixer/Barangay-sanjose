import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

/*
 * Help Center filter picker — the phone-portrait scroll behaviour.
 *
 * The picker's title, X, search and footer stay fixed outside the category
 * scroll pane. Its scrollbar starts at the Emergency section, and section labels
 * pin to the top of that pane while their group is on screen.
 *
 * This suite needs no backend: it only measures geometry, so it runs against
 * the plain app with no Supabase credentials and no mocked providers.
 *
 *   npm run preview            # or npm run dev
 *   BROWSER_PATH=/path/to/chromium TEST_BASE_URL=http://localhost:4173 \
 *     node tests/help-center-picker-sticky.mjs
 */
const base = process.env.TEST_BASE_URL || 'http://localhost:4173';
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const top = async (page, selector) =>
  Math.round(await page.locator(selector).first().evaluate((node) => node.getBoundingClientRect().top));

try {
  // Phone portrait (Android + both iPhone sizes) and one desktop width.
  const viewports = [
    { width: 360, height: 800, label: 'Android 360x800' },
    { width: 375, height: 667, label: 'iPhone SE 375x667' },
    { width: 393, height: 852, label: 'iPhone 14 Pro 393x852' },
    { width: 1280, height: 900, label: 'desktop 1280x900' },
  ];

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.getByTitle('Layers', { exact: true }).first().click();
    await page.getByRole('button', { name: 'Help Center', exact: true }).first().click();
    await page.getByRole('heading', { name: 'Choose what you want to filter' }).waitFor();

    const barBefore = {
      title: await top(page, '.hc-picker-title'),
      search: await top(page, '.hc-picker-search'),
      x: await top(page, '[aria-label="Close Help Center filters"]'),
    };
    const alignment = await page.evaluate(() => {
      const header = document.querySelector('.hc-picker-sticky');
      const scroll = document.querySelector('.hc-picker-scroll');
      const emergency = document.querySelector('.hc-picker-sec');
      return {
        headerBottom: Math.round(header.getBoundingClientRect().bottom),
        scrollTop: Math.round(scroll.getBoundingClientRect().top),
        emergencyTop: Math.round(emergency.getBoundingClientRect().top),
      };
    });
    assert.equal(alignment.headerBottom, alignment.scrollTop, 'list starts just below the fixed search header');
    assert.equal(alignment.scrollTop, alignment.emergencyTop, 'scrollbar starts level with the Emergency section');
    const emergencyOverlay = await page.locator('.hc-picker-sec').evaluate((node) =>
      getComputedStyle(node, '::after').content,
    );
    assert.equal(emergencyOverlay, 'none', 'section decoration does not cover the first card border');
    const cardGap = await page.evaluate(() => {
      const heading = document.querySelector('.hc-picker-sec');
      const firstGrid = document.querySelector('.hc-picker-grid');
      return Math.round(firstGrid.getBoundingClientRect().top - heading.getBoundingClientRect().bottom);
    });
    assert.ok(cardGap >= 11, `the Police card has a visible gap above it (${cardGap}px)`);
    assert.equal((await page.locator('#hc-picker').getAttribute('class')) ?? '', '', 'bar starts flat at the top of the list');

    const police = await page.locator('.hc-cat').first().boundingBox();
    const list = await page.locator('.hc-picker-scroll').boundingBox();
    assert.ok(police.y >= list.y && police.y + police.height <= list.y + list.height,
      `${viewport.label}: the Police card is fully visible in the scroll area`);
    await page.locator('.hc-cat').first().click();
    const policeOutline = await page.locator('.hc-cat').first().evaluate((node) => {
      const style = getComputedStyle(node);
      return { style: style.outlineStyle, color: style.outlineColor };
    });
    assert.ok(
      policeOutline.style === 'none' || policeOutline.color === 'rgb(0, 105, 122)',
      `${viewport.label}: pointer selection never adds a black outline (${JSON.stringify(policeOutline)})`,
    );

    // Scroll the list the way a thumb does — far enough to leave section one.
    await page.locator('.hc-picker-scroll').evaluate((node) => node.scrollTo({ top: 1500 }));
    await page.waitForTimeout(250);

    const scrolledBy = await page.locator('.hc-picker-scroll').evaluate((node) => node.scrollTop);
    assert.ok(scrolledBy > 500, `${viewport.label}: the list itself scrolls (scrollTop ${scrolledBy})`);

    const barAfter = {
      title: await top(page, '.hc-picker-title'),
      search: await top(page, '.hc-picker-search'),
      x: await top(page, '[aria-label="Close Help Center filters"]'),
    };
    assert.deepEqual(barAfter, barBefore, `${viewport.label}: title, X and search stay pinned while the list scrolls`);
    assert.equal(await page.locator('#hc-picker').getAttribute('class'), 'is-scrolled', 'bar lifts once the list moves');
    assert.equal(await page.evaluate(() => window.scrollY), 0, 'the page behind the picker never scrolls');

    // The label of whichever group is on screen pins itself to the bar's lower
    // edge. Which label that is depends on where the list stops (the desktop
    // list is short), so sweep a few offsets and require that at least one
    // position shows a pinned label — while the bar never budges.
    const sweep = await page.evaluate(async () => {
      const scroll = document.querySelector('.hc-picker-scroll');
      const bar = document.querySelector('.hc-picker-sticky');
      const title = document.querySelector('.hc-picker-title');
      const results = [];
      const max = scroll.scrollHeight - scroll.clientHeight;
      for (const fraction of [0.2, 0.4, 0.6, 0.8]) {
        scroll.scrollTop = Math.round(max * fraction);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const barBottom = Math.round(bar.getBoundingClientRect().bottom);
        const tops = [...document.querySelectorAll('.hc-picker-sec')]
          .map((node) => Math.round(node.getBoundingClientRect().top));
        results.push({
          title: Math.round(title.getBoundingClientRect().top),
          stuck: tops.filter((top) => Math.abs(top - barBottom) <= 2).length,
        });
      }
      return results;
    });
    assert.ok(
      sweep.some((entry) => entry.stuck > 0),
      `${viewport.label}: the active section label sits under the bar (${JSON.stringify(sweep)})`,
    );
    assert.ok(
      sweep.every((entry) => entry.title === barBefore.title),
      `${viewport.label}: the title never moves during the sweep (${JSON.stringify(sweep)})`,
    );

    // Back to the top: the hairline and shadow disappear again.
    await page.locator('.hc-picker-scroll').evaluate((node) => node.scrollTo({ top: 0 }));
    await page.waitForTimeout(250);
    assert.equal((await page.locator('#hc-picker').getAttribute('class')) ?? '', '', 'bar goes flat again at the top');

    assert.deepEqual(errors, []);
    console.log(`PASS pinned picker bar: list scrolls under title/X/search, section labels pin (${viewport.label})`);
    await context.close();
  }
} finally {
  await browser.close();
}
