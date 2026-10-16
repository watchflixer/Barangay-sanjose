export function forecastFixture() {
  const now = Math.floor(Date.now() / 3600000) * 3600;
  const repeat = (value, count) => Array(count).fill(value);
  return {
    current: { time: now, temperature_2m: 29.4, apparent_temperature: 33.2,
      weather_code: 2, relative_humidity_2m: 78, wind_speed_10m: 14,
      wind_direction_10m: 80, cloud_cover: 55, precipitation: 0.2 },
    hourly: {
      time: Array.from({ length: 24 }, (_, i) => now + i * 3600),
      temperature_2m: Array.from({ length: 24 }, (_, i) => 29 + i / 10),
      precipitation_probability: repeat(45, 24), weather_code: repeat(61, 24),
      cloud_cover: repeat(70, 24)
    },
    daily: {
      time: Array.from({ length: 7 }, (_, i) => now + i * 86400),
      weather_code: repeat(61, 7), temperature_2m_max: repeat(32, 7),
      temperature_2m_min: repeat(24, 7)
    }
  };
}

export function radarFixture() {
  const now = Math.floor(Date.now() / 600000) * 600;
  return { version: '2.0', generated: now, host: 'https://tilecache.rainviewer.com',
    radar: { past: [now - 600, now].map(time => ({ time, path: `/v2/radar/${time}` })), nowcast: [] } };
}
