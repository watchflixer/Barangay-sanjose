/**
 * Edge middleware for every request the site serves.
 *
 * WHAT THIS DOES
 * --------------
 * 1. Blocks declared AI crawlers and headless scrapers before they reach the
 *    app (by `User-Agent`).
 * 2. Stamps anti-index / anti-archive / no-AI headers on every response.
 * 3. Adds baseline security headers (nosniff, referrer, frame, permissions).
 * 4. Applies a per-IP request budget so a single client cannot walk the site.
 *
 * WHAT THIS CANNOT DO — read this before trusting it
 * --------------------------------------------------
 * A `User-Agent` is chosen by the client, so a determined scraper simply sends
 * a browser UA and is not blocked here. This layer stops honest crawlers and
 * casual harvesting, NOT an adversary. The enforced controls live in the
 * Cloudflare dashboard (Bot Fight Mode, WAF managed rules, rate limiting,
 * Cloudflare Access); see the README section "Scraping, bots and downloads".
 *
 * It also cannot stop a human from copying what the browser renders: anything a
 * visitor can see on screen has already been downloaded to their device.
 *
 * Environment switches (Pages -> Settings -> Variables):
 *   SHIELD_DISABLED=1           turn the whole filter off (emergency)
 *   SHIELD_ALLOW_HTTP_CLIENTS=1 keep curl/wget/python-requests working
 *                               (uptime monitors, smoke tests, link previews)
 */

/** Crawlers that declare themselves. Matching is case-insensitive substring. */
const AI_AND_SCRAPER_AGENTS = [
  // Generative-AI crawlers (training + answer engines)
  'gptbot', 'chatgpt-user', 'oai-searchbot', 'claude-web', 'claudebot', 'anthropic-ai',
  'perplexitybot', 'perplexity-user', 'google-extended', 'applebot-extended',
  'ccbot', 'bytespider', 'amazonbot', 'meta-externalagent', 'facebookbot',
  'youbot', 'cohere-ai', 'diffbot', 'imagesiftbot', 'omgili', 'timpibot',
  'velenpublicwebcrawler', 'webzio-extended', 'ai2bot', 'friendlycrawler',
  // SEO / marketing harvesters that re-publish content
  'ahrefsbot', 'semrushbot', 'mj12bot', 'dotbot', 'dataforseobot', 'blexbot',
  'petalbot', 'serpstatbot', 'seokicks', 'screaming frog',
  // Automation / headless stacks used for bulk scraping
  'headlesschrome', 'puppeteer', 'playwright', 'selenium', 'phantomjs',
  'scrapy',
];

/**
 * Generic HTTP clients. Blocked by default because the most common "AI agent
 * scrapes a site" pattern is `curl | parse`. They are also what uptime
 * monitors, link previews and your own smoke tests use, so a deployment can
 * opt out with SHIELD_ALLOW_HTTP_CLIENTS=1.
 */
const HTTP_CLIENT_AGENTS = [
  'python-requests', 'python-urllib', 'aiohttp', 'httpx', 'go-http-client',
  'node-fetch', 'axios', 'wget', 'curl/', 'libwww-perl', 'okhttp',
];

/** Nothing legitimate here: these are always refused. */
const NEVER_ALLOW = ['sqlmap', 'nikto', 'nmap', 'masscan', 'nuclei', 'zgrab', 'nessus'];

/** Assets and routes that must keep working even for a blocked-looking client. */
const ALWAYS_ALLOW_PREFIXES = ['/api/admin/login', '/api/admin/session', '/api/admin/logout', '/api/admin/rpc'];

function userAgent(request) {
  return (request.headers.get('User-Agent') || '').toLowerCase();
}

/**
 * @param {string} ua              the User-Agent header
 * @param {{ allowHttpClients?: boolean }} [options]
 */
export function classifyAgent(ua, options = {}) {
  const agent = String(ua || '').toLowerCase();
  if (!agent) return 'empty';
  if (NEVER_ALLOW.some((needle) => agent.includes(needle))) return 'scanner';
  if (AI_AND_SCRAPER_AGENTS.some((needle) => agent.includes(needle))) return 'bot';
  if (!options.allowHttpClients && HTTP_CLIENT_AGENTS.some((needle) => agent.includes(needle))) {
    return 'bot';
  }
  return 'allow';
}

/** Reads the two escape hatches so a mis-fire cannot take the site down. */
function shieldOptions(env) {
  return {
    disabled: String(env?.SHIELD_DISABLED ?? '') === '1',
    allowHttpClients: String(env?.SHIELD_ALLOW_HTTP_CLIENTS ?? '') === '1',
  };
}

export function clientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/* --------------------------------------------------------------- rate limit */

const budgets = new Map();
const WINDOW_MS = 60_000;
/** Generous: one page load needs ~12 assets, and the app polls Supabase directly. */
const REQUESTS_PER_WINDOW = 90;

export function noteRequest(ip, limit = REQUESTS_PER_WINDOW) {
  const now = Date.now();
  const entry = budgets.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    budgets.set(ip, { start: now, count: 1 });
    return { allowed: true, remaining: limit - 1 };
  }
  entry.count += 1;
  // Keep the map from growing without bound in a long-lived isolate.
  if (budgets.size > 5000) {
    for (const [key, value] of budgets) {
      if (now - value.start > WINDOW_MS) budgets.delete(key);
    }
  }
  return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
}

/* ------------------------------------------------------------------ headers */

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(self), camera=(), microphone=(), payment=()',
  // Ask search engines and AI crawlers not to index, cache or train on the site.
  'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet, noimageindex, noai, noimageai',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

function withHeaders(response, extra = {}) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function refusal(status, message, extra = {}) {
  return withHeaders(
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    }),
    extra,
  );
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const options = shieldOptions(env);

  // Emergency switch: one variable turns the filter off without a code change.
  if (options.disabled) return next();

  // The admin API authenticates itself; never second-guess its clients.
  if (ALWAYS_ALLOW_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return withHeaders(await next());
  }

  const kind = classifyAgent(userAgent(request), options);
  if (kind === 'scanner') {
    return refusal(403, 'Automated tooling is not permitted.');
  }
  if (kind === 'bot') {
    // 403 with no body detail: nothing here helps a crawler improve.
    return refusal(403, 'Automated collection is not permitted on this site.', {
      'X-Robots-Tag': 'noindex, nofollow, noarchive, noai, noimageai',
    });
  }

  const ip = clientIp(request);
  const budget = noteRequest(ip);
  if (!budget.allowed) {
    return refusal(429, 'Too many requests. Please slow down.', {
      'Retry-After': String(Math.ceil(WINDOW_MS / 1000)),
    });
  }

  const response = await next();
  return withHeaders(response, {
    'X-RateLimit-Limit': String(REQUESTS_PER_WINDOW),
    'X-RateLimit-Remaining': String(budget.remaining),
  });
}
