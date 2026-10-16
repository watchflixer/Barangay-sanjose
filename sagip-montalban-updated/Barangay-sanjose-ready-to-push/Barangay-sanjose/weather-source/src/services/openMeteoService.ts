import { CityWeather } from '../types/weather';

export interface PhilippineCityDef {
  id: string;
  name: string;
  region: string;
  islandGroup: 'Luzon' | 'Visayas' | 'Mindanao';
  lat: number;
  lng: number;
  defaultTemp: number;
  defaultWeatherCode: number;
  minZoom: number; // Zoom level at which this city becomes visible
}

export const PHILIPPINE_CITIES: PhilippineCityDef[] = [
  // --- Tier 1: Major Metropolitan & National Hubs (minZoom: 5) ---
  { id: 'manila', name: 'Manila', region: 'Metro Manila (NCR)', islandGroup: 'Luzon', lat: 14.5995, lng: 120.9842, defaultTemp: 27, defaultWeatherCode: 2, minZoom: 5 },
  { id: 'baguio', name: 'Baguio', region: 'Cordillera', islandGroup: 'Luzon', lat: 16.4023, lng: 120.5960, defaultTemp: 18, defaultWeatherCode: 0, minZoom: 5 },
  { id: 'cebu', name: 'Cebu', region: 'Central Visayas', islandGroup: 'Visayas', lat: 10.3157, lng: 123.8854, defaultTemp: 28, defaultWeatherCode: 1, minZoom: 5 },
  { id: 'davao', name: 'Davao', region: 'Davao Region', islandGroup: 'Mindanao', lat: 7.1907, lng: 125.4504, defaultTemp: 27, defaultWeatherCode: 2, minZoom: 5 },
  { id: 'puerto-princesa', name: 'Puerto Princesa', region: 'Palawan', islandGroup: 'Luzon', lat: 9.7392, lng: 118.7353, defaultTemp: 28, defaultWeatherCode: 2, minZoom: 5 },
  { id: 'cagayan-de-oro', name: 'Cagayan de Oro', region: 'Northern Mindanao', islandGroup: 'Mindanao', lat: 8.4542, lng: 124.6319, defaultTemp: 27, defaultWeatherCode: 3, minZoom: 5 },

  // --- Tier 2: Regional Capitals & Major Centers (minZoom: 6) ---
  { id: 'tuguegarao', name: 'Tuguegarao', region: 'Cagayan Valley', islandGroup: 'Luzon', lat: 17.6132, lng: 121.7270, defaultTemp: 28, defaultWeatherCode: 0, minZoom: 6 },
  { id: 'laoag', name: 'Laoag', region: 'Ilocos Norte', islandGroup: 'Luzon', lat: 18.1960, lng: 120.5927, defaultTemp: 27, defaultWeatherCode: 1, minZoom: 6 },
  { id: 'baler', name: 'Baler', region: 'Aurora', islandGroup: 'Luzon', lat: 15.7589, lng: 121.5622, defaultTemp: 26, defaultWeatherCode: 61, minZoom: 6 },
  { id: 'batangas', name: 'Batangas City', region: 'CALABARZON', islandGroup: 'Luzon', lat: 13.7565, lng: 121.0583, defaultTemp: 28, defaultWeatherCode: 2, minZoom: 6 },
  { id: 'legazpi', name: 'Legazpi', region: 'Bicol Region', islandGroup: 'Luzon', lat: 13.1391, lng: 123.7438, defaultTemp: 27, defaultWeatherCode: 3, minZoom: 6 },
  { id: 'virac', name: 'Virac', region: 'Catanduanes', islandGroup: 'Luzon', lat: 13.5841, lng: 124.2378, defaultTemp: 26, defaultWeatherCode: 3, minZoom: 6 },
  { id: 'iloilo', name: 'Iloilo', region: 'Western Visayas', islandGroup: 'Visayas', lat: 10.7202, lng: 122.5621, defaultTemp: 28, defaultWeatherCode: 3, minZoom: 6 },
  { id: 'tacloban', name: 'Tacloban', region: 'Eastern Visayas', islandGroup: 'Visayas', lat: 11.2433, lng: 125.0047, defaultTemp: 27, defaultWeatherCode: 3, minZoom: 6 },
  { id: 'zamboanga', name: 'Zamboanga', region: 'Zamboanga Peninsula', islandGroup: 'Mindanao', lat: 6.9214, lng: 122.0790, defaultTemp: 28, defaultWeatherCode: 3, minZoom: 6 },
  { id: 'general-santos', name: 'General Santos', region: 'SOCCSKSARGEN', islandGroup: 'Mindanao', lat: 6.1164, lng: 125.1716, defaultTemp: 29, defaultWeatherCode: 2, minZoom: 6 },

  // --- Tier 3: Key Provincial Hubs (minZoom: 7) ---
  { id: 'vigan', name: 'Vigan', region: 'Ilocos Sur', islandGroup: 'Luzon', lat: 17.5705, lng: 120.3869, defaultTemp: 27, defaultWeatherCode: 1, minZoom: 7 },
  { id: 'san-fernando-lu', name: 'San Fernando', region: 'La Union', islandGroup: 'Luzon', lat: 16.6159, lng: 120.3209, defaultTemp: 28, defaultWeatherCode: 1, minZoom: 7 },
  { id: 'dagupan', name: 'Dagupan', region: 'Pangasinan', islandGroup: 'Luzon', lat: 16.0433, lng: 120.3340, defaultTemp: 29, defaultWeatherCode: 2, minZoom: 7 },
  { id: 'angeles', name: 'Angeles', region: 'Pampanga', islandGroup: 'Luzon', lat: 15.1450, lng: 120.5887, defaultTemp: 29, defaultWeatherCode: 2, minZoom: 7 },
  { id: 'lucena', name: 'Lucena', region: 'Quezon', islandGroup: 'Luzon', lat: 13.9314, lng: 121.6172, defaultTemp: 27, defaultWeatherCode: 2, minZoom: 7 },
  { id: 'calapan', name: 'Calapan', region: 'Oriental Mindoro', islandGroup: 'Luzon', lat: 13.4117, lng: 121.1803, defaultTemp: 28, defaultWeatherCode: 2, minZoom: 7 },
  { id: 'naga', name: 'Naga', region: 'Camarines Sur', islandGroup: 'Luzon', lat: 13.6218, lng: 123.1948, defaultTemp: 27, defaultWeatherCode: 3, minZoom: 7 },
  { id: 'bacolod', name: 'Bacolod', region: 'Negros Occidental', islandGroup: 'Visayas', lat: 10.6766, lng: 122.9510, defaultTemp: 28, defaultWeatherCode: 2, minZoom: 7 },
  { id: 'dumaguete', name: 'Dumaguete', region: 'Negros Oriental', islandGroup: 'Visayas', lat: 9.3068, lng: 123.3054, defaultTemp: 28, defaultWeatherCode: 1, minZoom: 7 },
  { id: 'tagbilaran', name: 'Tagbilaran', region: 'Bohol', islandGroup: 'Visayas', lat: 9.6729, lng: 123.8730, defaultTemp: 28, defaultWeatherCode: 1, minZoom: 7 },
  { id: 'roxas', name: 'Roxas City', region: 'Capiz', islandGroup: 'Visayas', lat: 11.5853, lng: 122.7511, defaultTemp: 28, defaultWeatherCode: 2, minZoom: 7 },
  { id: 'butuan', name: 'Butuan', region: 'Caraga', islandGroup: 'Mindanao', lat: 8.9492, lng: 125.5436, defaultTemp: 28, defaultWeatherCode: 2, minZoom: 7 },
  { id: 'iligan', name: 'Iligan', region: 'Northern Mindanao', islandGroup: 'Mindanao', lat: 8.2280, lng: 124.2452, defaultTemp: 27, defaultWeatherCode: 2, minZoom: 7 },
  { id: 'cotabato', name: 'Cotabato City', region: 'BARMM', islandGroup: 'Mindanao', lat: 7.2236, lng: 124.2464, defaultTemp: 29, defaultWeatherCode: 2, minZoom: 7 },

  // --- Tier 4: Towns, Islands & Municipalities (minZoom: 8+) ---
  { id: 'basco', name: 'Basco', region: 'Batanes', islandGroup: 'Luzon', lat: 20.4485, lng: 121.9705, defaultTemp: 24, defaultWeatherCode: 1, minZoom: 8 },
  { id: 'aparri', name: 'Aparri', region: 'Cagayan', islandGroup: 'Luzon', lat: 18.3567, lng: 121.6414, defaultTemp: 26, defaultWeatherCode: 1, minZoom: 8 },
  { id: 'ilagan', name: 'Ilagan', region: 'Isabela', islandGroup: 'Luzon', lat: 17.1489, lng: 121.8906, defaultTemp: 29, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'santiago', name: 'Santiago', region: 'Isabela', islandGroup: 'Luzon', lat: 16.6917, lng: 121.5478, defaultTemp: 29, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'tarlac', name: 'Tarlac City', region: 'Tarlac', islandGroup: 'Luzon', lat: 15.4802, lng: 120.5979, defaultTemp: 29, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'cabanatuan', name: 'Cabanatuan', region: 'Nueva Ecija', islandGroup: 'Luzon', lat: 15.4859, lng: 120.9673, defaultTemp: 30, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'olongapo', name: 'Olongapo', region: 'Zambales', islandGroup: 'Luzon', lat: 14.8386, lng: 120.2842, defaultTemp: 28, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'malolos', name: 'Malolos', region: 'Bulacan', islandGroup: 'Luzon', lat: 14.8433, lng: 120.8114, defaultTemp: 28, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'antipolo', name: 'Antipolo', region: 'Rizal', islandGroup: 'Luzon', lat: 14.5842, lng: 121.1763, defaultTemp: 26, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'tagaytay', name: 'Tagaytay', region: 'Cavite', islandGroup: 'Luzon', lat: 14.1153, lng: 120.9621, defaultTemp: 22, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'daet', name: 'Daet', region: 'Camarines Norte', islandGroup: 'Luzon', lat: 14.1167, lng: 122.9500, defaultTemp: 27, defaultWeatherCode: 3, minZoom: 8 },
  { id: 'sorsogon', name: 'Sorsogon City', region: 'Sorsogon', islandGroup: 'Luzon', lat: 12.9742, lng: 124.0058, defaultTemp: 27, defaultWeatherCode: 3, minZoom: 8 },
  { id: 'masbate', name: 'Masbate City', region: 'Masbate', islandGroup: 'Luzon', lat: 12.3719, lng: 123.6300, defaultTemp: 28, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'san-jose-mindoro', name: 'San Jose', region: 'Occidental Mindoro', islandGroup: 'Luzon', lat: 12.3528, lng: 121.0678, defaultTemp: 29, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'coron', name: 'Coron', region: 'Palawan', islandGroup: 'Luzon', lat: 12.0000, lng: 120.2000, defaultTemp: 29, defaultWeatherCode: 1, minZoom: 8 },
  { id: 'boracay', name: 'Boracay', region: 'Aklan', islandGroup: 'Visayas', lat: 11.9674, lng: 121.9248, defaultTemp: 29, defaultWeatherCode: 1, minZoom: 8 },
  { id: 'kalibo', name: 'Kalibo', region: 'Aklan', islandGroup: 'Visayas', lat: 11.7067, lng: 122.3644, defaultTemp: 28, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'ormoc', name: 'Ormoc', region: 'Leyte', islandGroup: 'Visayas', lat: 11.0050, lng: 124.6075, defaultTemp: 28, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'catbalogan', name: 'Catbalogan', region: 'Samar', islandGroup: 'Visayas', lat: 11.7753, lng: 124.8814, defaultTemp: 27, defaultWeatherCode: 3, minZoom: 8 },
  { id: 'calbayog', name: 'Calbayog', region: 'Samar', islandGroup: 'Visayas', lat: 12.0674, lng: 124.5956, defaultTemp: 27, defaultWeatherCode: 3, minZoom: 8 },
  { id: 'maasin', name: 'Maasin', region: 'Southern Leyte', islandGroup: 'Visayas', lat: 10.1333, lng: 124.8667, defaultTemp: 28, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'dipolog', name: 'Dipolog', region: 'Zamboanga del Norte', islandGroup: 'Mindanao', lat: 8.5878, lng: 123.3411, defaultTemp: 28, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'pagadian', name: 'Pagadian', region: 'Zamboanga del Sur', islandGroup: 'Mindanao', lat: 7.8257, lng: 123.4370, defaultTemp: 28, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'marawi', name: 'Marawi', region: 'Lanao del Sur', islandGroup: 'Mindanao', lat: 8.0033, lng: 124.2844, defaultTemp: 23, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'malaybalay', name: 'Malaybalay', region: 'Bukidnon', islandGroup: 'Mindanao', lat: 8.1575, lng: 125.1278, defaultTemp: 24, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'tagum', name: 'Tagum', region: 'Davao del Norte', islandGroup: 'Mindanao', lat: 7.4478, lng: 125.8078, defaultTemp: 28, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'digos', name: 'Digos', region: 'Davao del Sur', islandGroup: 'Mindanao', lat: 6.7578, lng: 125.3564, defaultTemp: 28, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'mati', name: 'Mati', region: 'Davao Oriental', islandGroup: 'Mindanao', lat: 6.9550, lng: 126.2167, defaultTemp: 28, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'koronadal', name: 'Koronadal', region: 'South Cotabato', islandGroup: 'Mindanao', lat: 6.5000, lng: 124.8500, defaultTemp: 28, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'surigao', name: 'Surigao City', region: 'Surigao del Norte', islandGroup: 'Mindanao', lat: 9.7892, lng: 125.4939, defaultTemp: 27, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'tandag', name: 'Tandag', region: 'Surigao del Sur', islandGroup: 'Mindanao', lat: 9.0789, lng: 126.1978, defaultTemp: 27, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'jolo', name: 'Jolo', region: 'Sulu', islandGroup: 'Mindanao', lat: 6.0528, lng: 121.0028, defaultTemp: 29, defaultWeatherCode: 2, minZoom: 8 },
  { id: 'bongao', name: 'Bongao', region: 'Tawi-Tawi', islandGroup: 'Mindanao', lat: 5.0294, lng: 119.7731, defaultTemp: 29, defaultWeatherCode: 2, minZoom: 8 }
];

export function getWeatherConditionInfo(code: number): { text: string; icon: string } {
  switch (code) {
    case 0:
      return { text: 'Clear Sky', icon: '☀️' };
    case 1:
      return { text: 'Mainly Clear', icon: '🌤️' };
    case 2:
      return { text: 'Partly Cloudy', icon: '⛅' };
    case 3:
      return { text: 'Overcast', icon: '☁️' };
    case 45:
    case 48:
      return { text: 'Foggy', icon: '🌫️' };
    case 51:
    case 53:
    case 55:
      return { text: 'Drizzle', icon: '🌦️' };
    case 61:
    case 63:
    case 65:
      return { text: 'Rain', icon: '🌧️' };
    case 80:
    case 81:
    case 82:
      return { text: 'Rain Showers', icon: '🌧️' };
    case 95:
    case 96:
    case 99:
      return { text: 'Thunderstorm', icon: '⛈️' };
    default:
      return { text: 'Partly Cloudy', icon: '⛅' };
  }
}

// Both current conditions and forecasts come from the provider. Never substitute
// sample temperatures when the network fails: callers retain their last good data.
interface ForecastResponse {
  current: Record<string, number>;
  hourly: Record<string, number[]>;
  daily: Record<string, number[]>;
}

function parseForecast(city: PhilippineCityDef, item: ForecastResponse): CityWeather {
  const currentFields = ['time', 'temperature_2m', 'apparent_temperature', 'weather_code',
    'relative_humidity_2m', 'wind_speed_10m', 'wind_direction_10m', 'cloud_cover', 'precipitation'];
  const hourlyFields = ['time', 'temperature_2m', 'precipitation_probability', 'weather_code', 'cloud_cover'];
  const dailyFields = ['time', 'weather_code', 'temperature_2m_max', 'temperature_2m_min'];
  if (!item?.current || currentFields.some(key => !Number.isFinite(item.current[key])) ||
      !item.hourly || hourlyFields.some(key => !Array.isArray(item.hourly[key]) ||
        item.hourly[key].length < 24 || !item.hourly[key].every(Number.isFinite)) ||
      !item.daily || dailyFields.some(key => !Array.isArray(item.daily[key]) ||
        item.daily[key].length < 7 || !item.daily[key].every(Number.isFinite))) {
    throw new Error(`Incomplete weather response for ${city.name}`);
  }
  const { current, hourly, daily } = item;
  const condition = getWeatherConditionInfo(current.weather_code);
  return {
    id: city.id, name: city.name, region: city.region, islandGroup: city.islandGroup,
    lat: city.lat, lng: city.lng, minZoom: city.minZoom,
    temperature: Math.round(current.temperature_2m),
    apparentTemperature: Math.round(current.apparent_temperature),
    weatherCode: current.weather_code,
    conditionText: condition.text, conditionIcon: condition.icon,
    humidity: Math.round(current.relative_humidity_2m),
    windSpeed: Math.round(current.wind_speed_10m),
    windDirection: Math.round(current.wind_direction_10m),
    cloudCover: Math.round(current.cloud_cover),
    precipitation: current.precipitation,
    precipitationProbability: hourly.precipitation_probability[0],
    observedAt: new Date(current.time * 1000).toISOString(),
    hourly: {
      time: hourly.time.slice(0, 24).map(time => new Date(time * 1000).toISOString()),
      temperature: hourly.temperature_2m.slice(0, 24).map(Math.round),
      precipitationProbability: hourly.precipitation_probability.slice(0, 24),
      weatherCode: hourly.weather_code.slice(0, 24),
      cloudCover: hourly.cloud_cover.slice(0, 24)
    },
    daily: {
      time: daily.time.slice(0, 7).map(time => new Date(time * 1000).toISOString()),
      weatherCode: daily.weather_code.slice(0, 7),
      maxTemp: daily.temperature_2m_max.slice(0, 7).map(Math.round),
      minTemp: daily.temperature_2m_min.slice(0, 7).map(Math.round)
    }
  };
}

async function fetchForecasts(cities: PhilippineCityDef[]): Promise<CityWeather[]> {
  const params = new URLSearchParams({
    latitude: cities.map(city => city.lat.toFixed(4)).join(','),
    longitude: cities.map(city => city.lng.toFixed(4)).join(','),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m',
    hourly: 'temperature_2m,precipitation_probability,weather_code,cloud_cover',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    forecast_hours: '24', forecast_days: '7', timezone: 'Asia/Manila', timeformat: 'unixtime'
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      cache: 'no-cache', signal: controller.signal
    });
    if (!res.ok) throw new Error(`Weather service returned HTTP ${res.status}`);
    const data = await res.json();
    const results: ForecastResponse[] = Array.isArray(data) ? data : [data];
    if (results.length !== cities.length) throw new Error('Missing city weather data');
    return cities.map((city, index) => parseForecast(city, results[index]));
  } finally {
    clearTimeout(timeout);
  }
}

export function fetchPhilippineWeather(): Promise<CityWeather[]> {
  return fetchForecasts(PHILIPPINE_CITIES);
}

export async function fetchLocationWeather(lat: number, lng: number): Promise<CityWeather> {
  const [weather] = await fetchForecasts([{
    id: 'user-location', name: 'Your Location', region: 'GPS Coordinates',
    islandGroup: 'Luzon', lat, lng, defaultTemp: 0, defaultWeatherCode: 0, minZoom: 5
  }]);
  return weather;
}
