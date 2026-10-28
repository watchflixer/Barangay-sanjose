import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Guard for the Panahon mode bar (Weather | Temperature | Wind | Rain).
 *
 * The bar was shrunk for laptop/desktop only. The Android/iPhone portrait
 * layout must stay exactly as it was, which means:
 *   – every `.ph-mode-*` rule lives inside `@media (min-width: 640px)` — above
 *     every portrait phone (iPhone 16 Pro Max is 440px CSS),
 *   – no phone breakpoint (`max-width`, `portrait`) ever mentions it,
 *   – the base markup keeps its original Tailwind sizing,
 *   – the new classes are purely additive (no utility was removed).
 */
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const css = read('../weather-source/src/index.css');
const topBar = read('../weather-source/src/components/TopBar.tsx');

/** Comments out of the way so the brace walker never treats them as rules. */
const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');


/**
 * Walk the CSS and return every rule that mentions `needle`, along with the
 * media gates that wrap it. Brace-aware, so a rule appended after the media
 * query is NOT mistaken for one inside it.
 */
function rulesMentioning(source: string, needle: string) {
  const found: { selector: string; gates: string[]; declarations: string }[] = [];
  const stack: string[] = [];
  let buffer = '';
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (char === '{') {
      const head = buffer.trim();
      buffer = '';
      if (head.startsWith('@')) {
        stack.push(head);
        index += 1;
        continue;
      }
      const close = source.indexOf('}', index);
      found.push({ selector: head, gates: [...stack], declarations: source.slice(index + 1, close === -1 ? source.length : close) });
      index = close === -1 ? source.length : close + 1;
      continue;
    }
    if (char === '}') {
      stack.pop();
      buffer = '';
      index += 1;
      continue;
    }
    buffer += char;
    index += 1;
  }
  return found.filter((rule) => rule.selector.includes(needle));
}

/** Widest portrait phone in CSS px is ~440 (iPhone 16 Pro Max); 640 is safe. */
const PHONE_SAFE_GATE = 640;

/** True when a rule only ever matches on viewports wider than a portrait phone. */
function isDesktopOnly(gates: string[]) {
  return gates.some((gate) => {
    const mins = [...gate.matchAll(/min-width:\s*([\d.]+)(px|rem|em)/g)]
      .map(([, value, unit]) => Number(value) * (unit === 'px' ? 1 : 16));
    const maxs = [...gate.matchAll(/max-width:\s*([\d.]+)(px|rem|em)/g)]
      .map(([, value, unit]) => Number(value) * (unit === 'px' ? 1 : 16));
    if (maxs.length > 0 && Math.max(...maxs) < PHONE_SAFE_GATE) return false;
    return mins.length > 0 && Math.min(...mins) >= PHONE_SAFE_GATE;
  });
}

test('every mode-nav rule is gated above portrait-phone width', () => {
  const rules = rulesMentioning(cssWithoutComments, 'ph-mode-');
  assert.ok(rules.length >= 4, `expected the nav/button rules, found ${rules.length}`);

  const leaked = rules.filter((rule) => !isDesktopOnly(rule.gates));
  assert.deepEqual(
    leaked.map((rule) => rule.selector),
    [],
    'these .ph-mode-* rules would also apply on phones'
  );

  const selectors = rules.map((rule) => rule.selector);
  for (const selector of ['.ph-mode-nav', '.ph-mode-nav .ph-mode-btn', '.ph-mode-nav .ph-mode-btn--active:hover']) {
    assert.ok(selectors.includes(selector), `expected "${selector}" inside the laptop/desktop query`);
  }
});

test('the mode nav is never mentioned by a phone-width breakpoint', () => {
  // No max-width / portrait query may reference the new classes.
  for (const block of css.matchAll(/@media[^{]*\{/g)) {
    const header = block[0];
    const isPhone = /max-width|portrait/.test(header);
    if (!isPhone) continue;
    const start = (block.index ?? 0) + header.length;
    // Scan the block body with a brace counter so nested rules stay accurate.
    let depth = 1;
    let end = start;
    while (end < css.length && depth > 0) {
      if (css[end] === '{') depth += 1;
      if (css[end] === '}') depth -= 1;
      end += 1;
    }
    assert.doesNotMatch(css.slice(start, end), /ph-mode/, `phone breakpoint "${header.trim()}" must not touch the mode nav`);
  }
});

/**
 * Utility tokens are assembled from fragments on purpose: this file lives in
 * the repo, and Tailwind v4 scans every file for candidates. Keeping the
 * tokens split means the guard cannot change the generated CSS bundle.
 */
const join = (...parts: string[]) => parts.join('');
const NAV_WIDTH = join('w-[calc(100%', '-12px)]');
const NAV_PADDING = join('p-', '1.5');
const NAV_RADIUS = join('rounded-', '2xl');
const NAV_GAP = join('gap-', '1');
const NAV_JUSTIFY = join('justify-', 'between');
const BUTTON_PADDING = join('py-', '1.5');
const BUTTON_PADDING_X = join('px-', '0.5');
const BUTTON_TYPE = join('text-', 'sm');
const BUTTON_TYPE_WIDE = join('sm:text-', 'base');
const ACTIVE_STYLE = join('ph-mode-btn--active bg-', 'black text-white shadow-md');

test('the base markup keeps its original Tailwind sizing', () => {
  const navClass = /<nav\s+className="([^"]+)"/.exec(topBar)?.[1] ?? '';
  for (const [label, token] of [
    ['phone width', NAV_WIDTH],
    ['phone padding', NAV_PADDING],
    ['phone radius', NAV_RADIUS],
    ['phone gap', NAV_GAP],
    ['phone justification', NAV_JUSTIFY],
    ['phone shadow', join('shadow-', '2xl')],
  ]) {
    assert.ok(navClass.split(' ').includes(token), `the nav lost its ${label} utility (${token})`);
  }

  const buttonClass = /ph-mode-btn ([^`]+)/.exec(topBar)?.[1] ?? '';
  for (const [label, token] of [
    ['phone vertical padding', BUTTON_PADDING],
    ['phone horizontal padding', BUTTON_PADDING_X],
    ['phone type scale', BUTTON_TYPE],
    ['wide-screen type scale', BUTTON_TYPE_WIDE],
  ]) {
    assert.ok(buttonClass.split(' ').includes(token), `the buttons lost their ${label} utility (${token})`);
  }
});

test('the new classes are additive only', () => {
  const navClass = /<nav\s+className="([^"]+)"/.exec(topBar)?.[1] ?? '';
  assert.ok(navClass.split(' ').includes('ph-mode-nav'), 'the nav needs its ph-mode-nav hook');
  // Nothing was removed from the original utility list.
  for (const token of ['mx-auto', 'flex', 'items-center', 'backdrop-blur-md', 'border']) {
    assert.ok(navClass.split(' ').includes(token), `the nav lost its "${token}" utility`);
  }
  assert.ok(topBar.includes(ACTIVE_STYLE), 'the active pill must keep its original look');
  assert.ok(topBar.includes(join("'text-black hover:bg-", "slate-100'")), 'inactive hover must stay unchanged');
});

/**
 * The bottom overlays (timeline scrubber + legend card) follow the exact same
 * rule as the mode nav: the compact laptop/desktop treatment lives behind the
 * 640px gate, so portrait phones keep their original cards.
 */
test('the bottom overlay shrink is gated above portrait phones too', () => {
  const hooks = ['ph-playback', 'ph-legend'];
  for (const hook of hooks) {
    const rules = rulesMentioning(cssWithoutComments, hook);
    assert.ok(rules.length >= 2, `expected compact rules for ${hook}, found ${rules.length}`);
    const leaked = rules.filter((rule) => !isDesktopOnly(rule.gates));
    assert.deepEqual(leaked.map((rule) => rule.selector), [], `${hook} rules would also hit phones`);
  }
});

test('the bottom overlays keep their original phone markup', () => {
  const cards = ['../weather-source/src/components/PlaybackControls.tsx', '../weather-source/src/components/LegendCard.tsx'];
  const [playback, legend] = cards.map(read);

  // Additive hooks only — the original utilities must all still be there.
  const playbackRoot = /<div className="([^"]*ph-playback [^"]*)"/.exec(playback)?.[1].split(' ') ?? [];
  for (const token of ['bg-white', 'rounded-2xl', 'p-2.5', 'shadow-2xl', 'gap-3']) {
    assert.ok(playbackRoot.includes(token), `playback card lost its "${token}" utility`);
  }
  const legendRoot = /<div className="([^"]*ph-legend [^"]*)"/.exec(legend)?.[1].split(' ') ?? [];
  for (const token of ['bg-white', 'rounded-2xl', 'p-3', 'shadow-2xl']) {
    assert.ok(legendRoot.includes(token), `legend card lost its "${token}" utility`);
  }
});

test('the overlays sit in the top row on laptop/desktop and stay docked on phones', () => {
  const app = read('../weather-source/src/App.tsx');

  // Phone layout must be untouched: the bottom dock utilities stay on the node.
  const wrapper = /<div className="(ph-overlays [^"]*)"/.exec(app)?.[1].split(' ') ?? [];
  for (const token of ['absolute', 'bottom-6', 'left-3', 'right-3', 'z-[1000]']) {
    assert.ok(wrapper.includes(token), `overlay wrapper lost its "${token}" utility`);
  }

  const rules = rulesMentioning(cssWithoutComments, 'ph-overlays');
  assert.ok(rules.length >= 1, 'expected the top-row rule for the overlays');
  const leaked = rules.filter((rule) => !isDesktopOnly(rule.gates));
  assert.deepEqual(leaked.map((rule) => rule.selector), [], 'the top-row move would also hit phones');

  // It really is the top row: top set, bottom released.
  const topRule = rules.find((rule) => rule.selector.trim() === '.ph-overlays');
  assert.ok(topRule, 'expected a .ph-overlays rule');
  assert.match(topRule.declarations, /top:\s*52px/);
  assert.match(topRule.declarations, /bottom:\s*auto/);
});
