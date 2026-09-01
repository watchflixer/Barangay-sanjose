import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const PAGE_URL = 'https://pasig-marikina-tullahanffws.pagasa.dost.gov.ph/water/table.do';
const STATION_MATCH = /rodriguez/i;
const OUTPUT_PATH = path.join('public', 'data', 'flood-status.json');

function tryParseStationsFromJson(json) {
  const candidates = Array.isArray(json)
    ? json
    : json.list || json.rows || json.data || json.result || [];

  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const matches = candidates.filter((row) => {
    const text = JSON.stringify(row);
    return STATION_MATCH.test(text);
  });

  if (matches.length === 0) return null;

  return matches.map(normalizeRow);
}

function normalizeRow(row) {
  const get = (...keys) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
    }
    return null;
  };
  return {
    name: get('stnNm', 'stationName', 'obsNm', 'name') || 'Rodriguez',
    currentLevel: get('wl', 'nowWl', 'currentWl', 'current'),
    alertLevel: get('alertWl', 'alert', 'wl1'),
    alarmLevel: get('alarmWl', 'alarm', 'wl2'),
    criticalLevel: get('seriousWl', 'critical', 'wl3'),
    raw: row,
  };
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const capturedJson = [];
  page.on('response', async (response) => {
    try {
      const ct = response.headers()['content-type'] || '';
      const url = response.url();
      if (ct.includes('application/json') || url.match(/\.(do|json)(\?|$)/i)) {
        const body = await response.text();
        if (body && body.trim().startsWith('{') || body.trim().startsWith('[')) {
          try {
            capturedJson.push(JSON.parse(body));
          } catch {
            // not JSON, ignore
          }
        }
      }
    } catch {
      // ignore failed reads
    }
  });

  await page.goto(PAGE_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);

  let stations = null;

  for (const json of capturedJson) {
    const found = tryParseStationsFromJson(json);
    if (found) {
      stations = found;
      break;
    }
  }

  if (!stations) {
    const rows = await page.$$eval('table tr', (trs) =>
      trs.map((tr) =>
        Array.from(tr.querySelectorAll('td,th')).map((cell) => cell.textContent?.trim() || '')
      )
    );
    const matched = rows.filter((r) => r.some((cell) => /rodriguez/i.test(cell)));
    if (matched.length > 0) {
      stations = matched.map((r) => ({
        name: r[0] || 'Rodriguez',
        currentLevel: r[1] || null,
        alertLevel: r[5] || null,
        alarmLevel: r[6] || null,
        criticalLevel: r[7] || null,
        raw: r,
      }));
    }
  }

  await browser.close();

  if (!stations || stations.length === 0) {
    console.error('Could not find Rodriguez station data this run. Leaving existing file untouched.');
    process.exit(1);
  }

  const existing = fs.existsSync(OUTPUT_PATH)
    ? JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'))
    : null;

  const result = {
    fetchedAt: new Date().toISOString(),
    source: PAGE_URL,
    barangay: 'Barangay San Jose, Rodriguez, Rizal',
    stations,
  };

  const hasLevel = stations.some((s) => s.currentLevel !== null && s.currentLevel !== '');
  if (!hasLevel && existing) {
    console.error('Fetched row(s) but no readable water level value. Keeping previous data.');
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  console.log('Saved flood-status.json:', JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error('fetch-flood-data failed:', err);
  process.exit(1);
});
