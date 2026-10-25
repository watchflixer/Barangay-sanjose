import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

/*
 * Help Center filter picker — the phone-portrait scroll behaviour.
 *
 * The picker's title, X and search field are pinned: flicking the category
 * list must slide the rows UNDER that bar, never take the bar off screen, and
 * never scroll the page itself. Section labels (Emergency, Everyday essentials,
 * …) pin themselves right below the bar while their group is on screen.
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
    assert.equal((await page.locator('#hc-picker').getAttribute('class')) ?? '', '', 'bar starts flat at the top of the list');

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

  // ---------------------------------------------------------------- touches
  // A finger tap must not leave Chrome's black focus ring around the tile, and
  // the tile the user taps must end up whole on screen (never sliced by the
  // pinned bar above it or the footer action bar below it).
  for (const viewport of [
    { width: 390, height: 844, label: 'Android 390x844' },
    { width: 1280, height: 900, label: 'desktop 1280x900' },
  ]) {
    const context = await browser.newContext({ viewport, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.getByTitle('Layers', { exact: true }).first().click();
    await page.getByRole('button', { name: 'Help Center', exact: true }).first().click();
    await page.getByRole('heading', { name: 'Choose what you want to filter' }).waitFor();

    // 1) tap -> selected, teal border, and NO black outline.
    await page.locator('.hc-cat').first().tap();
    await page.waitForTimeout(300);
    const tapped = await page.evaluate(() => {
      const card = document.querySelector('.hc-cat');
      const style = getComputedStyle(card);
      return {
        selected: card.getAttribute('aria-pressed'),
        focused: document.activeElement === card,
        outlineStyle: style.outlineStyle,
        borderColor: style.borderColor,
      };
    });
    assert.equal(tapped.selected, 'true', `${viewport.label}: the tapped tile is selected`);
    if (tapped.focused) {
      assert.equal(tapped.outlineStyle, 'none', `${viewport.label}: a tap paints no focus ring`);
    }
    assert.equal(tapped.borderColor, 'rgb(0, 105, 122)', `${viewport.label}: the selected tile keeps its teal border`);

    // 2) tap a tile that a flick has left sliced at the bottom edge -> whole.
    const cut = await page.evaluate(() => {
      const pane = document.querySelector('.hc-picker-scroll');
      const foot = document.querySelector('.hc-picker-foot').getBoundingClientRect();
      const card = [...document.querySelectorAll('.hc-cat')].find((node) => {
        const box = node.getBoundingClientRect();
        return box.top < foot.top && box.bottom > foot.top + 4;
      });
      if (!card) return null;
      card.dataset.tapped = 'yes';
      const box = card.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: (box.top + foot.top) / 2 };
    });
    if (cut) {
      await page.touchscreen.tap(cut.x, cut.y);
      await page.waitForTimeout(700);
      const whole = await page.evaluate(() => {
        const card = document.querySelector('.hc-cat[data-tapped="yes"]');
        const box = card.getBoundingClientRect();
        const pane = document.querySelector('.hc-picker-scroll');
        const barBottom = document.querySelector('.hc-picker-sticky').getBoundingClientRect().bottom;
        const footTop = document.querySelector('.hc-picker-foot').getBoundingClientRect().top;
        return { top: Math.round(box.top), bottom: Math.round(box.bottom),
          barBottom: Math.round(barBottom), footTop: Math.round(footTop),
          fullyVisible: box.top >= barBottom - 1 && box.bottom <= footTop + 1,
          paneBottom: Math.round(pane.getBoundingClientRect().bottom) };
      });
      assert.ok(
        whole.fullyVisible,
        `${viewport.label}: the tapped tile scrolls fully into view (${JSON.stringify(whole)})`,
      );
    }

    assert.deepEqual(errors, []);
    console.log(`PASS tapped tiles: no black focus ring, tapped tile revealed whole (${viewport.label})`);
    await context.close();
  }
} finally {
  await browser.close();
}
