import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchPhilippineWeather, fetchLocationWeather, PHILIPPINE_CITIES } from '../weather-source/src/services/openMeteoService';
import { fetchRainViewerData } from '../weather-source/src/services/rainViewerService';
import { forecastFixture, radarFixture } from './weather-fixture.mjs';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('all cities use provider forecasts and valid timestamps, not sample values', async () => {
  globalThis.fetch = async (url) => {
    const params = new URL(String(url)).searchParams;
    assert.ok(params.get('hourly')?.includes('precipitation_probability'));
    assert.ok(params.get('daily')?.includes('temperature_2m_max'));
    assert.equal(params.get('forecast_hours'), '24');
    return Response.json(PHILIPPINE_CITIES.map(() => forecastFixture()));
  };
  const cities = await fetchPhilippineWeather();
  assert.equal(cities.length, PHILIPPINE_CITIES.length);
  assert.equal(cities[0].temperature, 29);
  assert.equal(cities[0].hourly?.temperature.length, 24);
  assert.equal(cities[0].hourly?.weatherCode[1], 61);
  assert.equal(cities[0].daily?.maxTemp[0], 32);
  assert.ok(Number.isFinite(Date.parse(cities[0].hourly!.time[0])));
  assert.ok(Number.isFinite(Date.parse(cities[0].observedAt!)));
});

test('HTTP errors and missing/invalid data reject instead of displaying fictional weather', async () => {
  for (const response of [new Response('', { status: 429 }), Response.json([]),
    Response.json(PHILIPPINE_CITIES.map(() => ({ current: {} })))]) {
    globalThis.fetch = async () => response;
    await assert.rejects(fetchPhilippineWeather());
  }
  const fixture = forecastFixture();
  fixture.hourly.temperature_2m[0] = null;
  globalThis.fetch = async () => Response.json(fixture);
  await assert.rejects(fetchLocationWeather(14.7, 121.1));
});

test('single-location weather uses the same real forecasts', async () => {
  globalThis.fetch = async () => Response.json(forecastFixture());
  const weather = await fetchLocationWeather(14.7, 121.1);
  assert.equal(weather.id, 'user-location');
  assert.equal(weather.lat, 14.7);
  assert.equal(weather.daily?.time.length, 7);
});

test('radar accepts valid frames and handles failed or malformed responses', async () => {
  globalThis.fetch = async () => Response.json(radarFixture());
  assert.equal((await fetchRainViewerData())?.radar.past.length, 2);
  globalThis.fetch = async () => Response.json({ host: 'invalid' });
  assert.equal(await fetchRainViewerData(), null);
});
