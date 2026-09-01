import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';

const PAGE_URL = 'https://pasig-marikina-tullahanffws.pagasa.dost.gov.ph/water/table.do';
const STATION_MATCH = /rodriguez/i;
const PORT = process.env.PORT || 3000;

const CACHE_MS = 12 * 1000;

let cache = { data: null, fetchedAtMs: 0 };
let inFlight = null;

function normalizeRow(row) {
  const get = (...keys) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
    }
    return null;
  };
  return {
    name: get('stnNm', 'stationName', 'obsNm', 'name') || 'Rodriguez',
    landmark: 'San Jose Bridge',
    river: 'Marikina River',
    currentLevel: get('wl', 'nowWl', 'currentWl', 'current'),
    alertLevel: get('alertWl', 'alert', 'wl1'),
    alarmLevel: get('alarmWl', 'alarm', 'wl2'),
    criticalLevel: get('seriousWl', 'critical', 'wl3'),
    unit: 'm',
  };
}

function tryParseStationsFromJson(json) {
  const candidates = Array.isArray(json)
    ? json
    : json.list || json.rows || json.data || json.result || [];
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const matches = candidates.filter((row) => STATION_MATCH.test(JSON.stringify(row)));
  if (matches.length === 0) return null;
  return matches.map(normalizeRow);
}

async function scrapeLive() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const capturedJson = [];
    page.on('response', async (response) => {
      try {
        const ct = response.headers()['content-type'] || '';
        const url = response.url();
        if (ct.includes('application/json') || url.match(/\.(do|json)(\?|$)/i)) {
          const body = await response.text();
          const trimmed = body.trim();
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try { capturedJson.push(JSON.parse(trimmed)); } catch { /* ignore */ }
          }
        }
      } catch { /* ignore */ }
    });

    await page.goto(PAGE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2500);

    let stations = null;
    for (const json of capturedJson) {
      const found = tryParseStationsFromJson(json);
      if (found) { stations = found; break; }
    }

    if (!stations) {
      const rows = await page.$$eval('table tr', (trs) =>
        trs.map((tr) => Array.from(tr.querySelectorAll('td,th')).map((c) => c.textContent?.trim() || ''))
      );
      const matched = rows.filter((r) => r.some((cell) => STATION_MATCH.test(cell)));
      if (matched.length > 0) {
        stations = matched.map((r) => ({
          name: r[0] || 'Rodriguez',
          landmark: 'San Jose Bridge',
          river: 'Marikina River',
          currentLevel: r[1] || null,
          alertLevel: r[5] || null,
          alarmLevel: r[6] || null,
          criticalLevel: r[7] || null,
          unit: 'm',
        }));
      }
    }

    if (!stations || stations.length === 0) {
      throw new Error('Rodriguez station row not found on this scrape');
    }

    return {
      fetchedAt: new Date().toISOString(),
      source: PAGE_URL,
      barangay: 'Barangay San Jose, Rodriguez, Rizal',
      stations,
    };
  } finally {
    await browser.close();
  }
}

async function getFreshData() {
  const age = Date.now() - cache.fetchedAtMs;
  if (cache.data && age < CACHE_MS) return cache.data;
  if (inFlight) return inFlight;

  inFlight = scrapeLive()
    .then((data) => {
      cache = { data, fetchedAtMs: Date.now() };
      return data;
    })
    .catch((err) => {
      if (cache.data) return cache.data;
      throw err;
    })
    .finally(() => { inFlight = null; });

  return inFlight;
}

const app = express();
app.use(cors());

app.get('/api/flood-status', async (req, res) => {
  try {
    const data = await getFreshData();
    res.set('Cache-Control', 'no-store');
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Could not reach PAGASA source', detail: String(err) });
  }
});

app.get('/health', (req, res) => res.send('ok'));

app.listen(PORT, () => {
  console.log(`Flood status live server listening on port ${PORT}`);
});
