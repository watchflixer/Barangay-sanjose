import {
  AirQualityInfo,
  CurrentWeather,
  DailyForecastItem,
  HourlyForecastItem,
  Language,
  LocationCoordinates,
  WeatherDetails,
} from '../types/weather';

export interface WeatherCodeInfo {
  labelEn: string;
  labelFil: string;
  icon: string; // Lucide icon identifier
  isRain: boolean;
  isSnow: boolean;
  isThunder: boolean;
}

export function getWeatherCodeInfo(code: number): WeatherCodeInfo {
  switch (code) {
    case 0:
      return { labelEn: 'Clear Sky', labelFil: 'Maaliwalas', icon: 'Sun', isRain: false, isSnow: false, isThunder: false };
    case 1:
      return { labelEn: 'Mainly Clear', labelFil: 'Bahagyang Maulap', icon: 'SunMedium', isRain: false, isSnow: false, isThunder: false };
    case 2:
      return { labelEn: 'Partly Cloudy', labelFil: 'Kalahating Maulap', icon: 'CloudSun', isRain: false, isSnow: false, isThunder: false };
    case 3:
      return { labelEn: 'Overcast', labelFil: 'Makulimlim', icon: 'Cloud', isRain: false, isSnow: false, isThunder: false };
    case 45:
    case 48:
      return { labelEn: 'Foggy / Haze', labelFil: 'Mahamog / Makapal na Hamog', icon: 'CloudFog', isRain: false, isSnow: false, isThunder: false };
    case 51:
    case 53:
    case 55:
      return { labelEn: 'Drizzle', labelFil: 'Ambon', icon: 'CloudDrizzle', isRain: true, isSnow: false, isThunder: false };
    case 56:
    case 57:
      return { labelEn: 'Freezing Drizzle', labelFil: 'Nagyeyelong Ambon', icon: 'CloudSnow', isRain: true, isSnow: true, isThunder: false };
    case 61:
      return { labelEn: 'Slight Rain', labelFil: 'Magaang Ulan', icon: 'CloudRain', isRain: true, isSnow: false, isThunder: false };
    case 63:
      return { labelEn: 'Moderate Rain', labelFil: 'Katamtamang Ulan', icon: 'CloudRain', isRain: true, isSnow: false, isThunder: false };
    case 65:
      return { labelEn: 'Heavy Rain', labelFil: 'Malakas na Ulan', icon: 'CloudRain', isRain: true, isSnow: false, isThunder: false };
    case 66:
    case 67:
      return { labelEn: 'Freezing Rain', labelFil: 'Nagyeyelong Ulan', icon: 'CloudSnow', isRain: true, isSnow: true, isThunder: false };
    case 71:
    case 73:
    case 75:
      return { labelEn: 'Snowfall', labelFil: 'Pag-ulan ng Niyebe', icon: 'Snowflake', isRain: false, isSnow: true, isThunder: false };
    case 77:
      return { labelEn: 'Snow Grains', labelFil: 'Maliit na Niyebe', icon: 'Snowflake', isRain: false, isSnow: true, isThunder: false };
    case 80:
      return { labelEn: 'Slight Rain Showers', labelFil: 'Magaang Pabugsong Ulan', icon: 'CloudRain', isRain: true, isSnow: false, isThunder: false };
    case 81:
      return { labelEn: 'Moderate Showers', labelFil: 'Pabugsong Ulan', icon: 'CloudRain', isRain: true, isSnow: false, isThunder: false };
    case 82:
      return { labelEn: 'Violent Showers', labelFil: 'Napakalakas na Pabugsong Ulan', icon: 'CloudLightning', isRain: true, isSnow: false, isThunder: false };
    case 85:
    case 86:
      return { labelEn: 'Snow Showers', labelFil: 'Pabugsong Niyebe', icon: 'CloudSnow', isRain: false, isSnow: true, isThunder: false };
    case 95:
      return { labelEn: 'Thunderstorm', labelFil: 'Kulog at Kidlat (Bagyo)', icon: 'CloudLightning', isRain: true, isSnow: false, isThunder: true };
    case 96:
    case 99:
      return { labelEn: 'Severe Thunderstorm w/ Hail', labelFil: 'Malubhang Bagyo na may Ulan at Yelo', icon: 'CloudLightning', isRain: true, isSnow: false, isThunder: true };
    default:
      return { labelEn: 'Varied Conditions', labelFil: 'Pabago-bagong Panahon', icon: 'CloudSun', isRain: false, isSnow: false, isThunder: false };
  }
}

export function getAirQualityLevel(aqi: number) {
  if (aqi <= 50) {
    return { label: 'Good', labelFil: 'Maganda / Ligtas', color: '#10b981' };
  } else if (aqi <= 100) {
    return { label: 'Moderate', labelFil: 'Katamtaman', color: '#f59e0b' };
  } else if (aqi <= 150) {
    return { label: 'Unhealthy for Sensitive', labelFil: 'Di-mabuti sa May Sakit', color: '#f97316' };
  } else if (aqi <= 200) {
    return { label: 'Unhealthy', labelFil: 'Di-Malusog', color: '#ef4444' };
  } else if (aqi <= 300) {
    return { label: 'Very Unhealthy', labelFil: 'Napakapanganib', color: '#8b5cf6' };
  } else {
    return { label: 'Hazardous', labelFil: 'Kritikal / Mapanganib', color: '#7c2d12' };
  }
}

export async function fetchWeatherData(lat: number, lon: number, locationName?: string, countryName?: string): Promise<WeatherDetails> {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=7`;

  const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5,ozone,nitrogen_dioxide&timezone=auto`;

  const [weatherRes, aqiRes] = await Promise.allSettled([
    fetch(weatherUrl).then((r) => r.json()),
    fetch(aqiUrl).then((r) => r.json()),
  ]);

  if (weatherRes.status !== 'fulfilled' || !weatherRes.value?.current) {
    throw new Error('Failed to fetch weather data');
  }

  const wData = weatherRes.value;
  const currentRaw = wData.current;

  const current: CurrentWeather = {
    temperature: currentRaw.temperature_2m ?? 0,
    apparentTemperature: currentRaw.apparent_temperature ?? currentRaw.temperature_2m ?? 0,
    weatherCode: currentRaw.weather_code ?? 0,
    windSpeed: currentRaw.wind_speed_10m ?? 0,
    windDirection: currentRaw.wind_direction_10m ?? 0,
    windGusts: currentRaw.wind_gusts_10m ?? currentRaw.wind_speed_10m ?? 0,
    relativeHumidity: currentRaw.relative_humidity_2m ?? 50,
    surfacePressure: currentRaw.surface_pressure ?? 1013,
    uvIndex: currentRaw.uv_index ?? 0,
    precipitation: currentRaw.precipitation ?? 0,
    visibility: 10, // default km
    cloudCover: currentRaw.cloud_cover ?? 0,
    isDay: Boolean(currentRaw.is_day),
    time: currentRaw.time,
  };

  // Hourly (next 24 hours)
  const hourly: HourlyForecastItem[] = [];
  if (wData.hourly?.time) {
    const count = Math.min(24, wData.hourly.time.length);
    for (let i = 0; i < count; i++) {
      hourly.push({
        time: wData.hourly.time[i],
        temperature: wData.hourly.temperature_2m?.[i] ?? 0,
        precipitationProbability: wData.hourly.precipitation_probability?.[i] ?? 0,
        weatherCode: wData.hourly.weather_code?.[i] ?? 0,
        windSpeed: wData.hourly.wind_speed_10m?.[i] ?? 0,
      });
    }
  }

  // Daily (7 days)
  const daily: DailyForecastItem[] = [];
  if (wData.daily?.time) {
    for (let i = 0; i < wData.daily.time.length; i++) {
      daily.push({
        date: wData.daily.time[i],
        temperatureMax: wData.daily.temperature_2m_max?.[i] ?? 0,
        temperatureMin: wData.daily.temperature_2m_min?.[i] ?? 0,
        precipitationProbability: wData.daily.precipitation_probability_max?.[i] ?? 0,
        weatherCode: wData.daily.weather_code?.[i] ?? 0,
        sunrise: wData.daily.sunrise?.[i] ?? '',
        sunset: wData.daily.sunset?.[i] ?? '',
        uvIndexMax: wData.daily.uv_index_max?.[i] ?? 0,
        windSpeedMax: wData.daily.wind_speed_10m_max?.[i] ?? 0,
      });
    }
  }

  // Air Quality
  let airQuality: AirQualityInfo | undefined;
  if (aqiRes.status === 'fulfilled' && aqiRes.value?.current) {
    const aqCurrent = aqiRes.value.current;
    const aqiVal = Math.round(aqCurrent.us_aqi ?? 40);
    airQuality = {
      aqi: aqiVal,
      pm2_5: Math.round((aqCurrent.pm2_5 ?? 10) * 10) / 10,
      pm10: Math.round((aqCurrent.pm10 ?? 15) * 10) / 10,
      ozone: Math.round((aqCurrent.ozone ?? 30) * 10) / 10,
      nitrogenDioxide: Math.round((aqCurrent.nitrogen_dioxide ?? 15) * 10) / 10,
      status: getAirQualityLevel(aqiVal),
    };
  }

  return {
    location: {
      lat,
      lon,
      name: locationName || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
      country: countryName || '',
    },
    current,
    hourly,
    daily,
    airQuality,
    fetchedAt: new Date(),
  };
}

export function getMonsoonType(deg: number, month = new Date().getMonth() + 1): { nameFil: string; nameEn: string; desc: string; descEn: string } {
  // Northern Hemisphere / Philippines monsoons
  // May to Oct: Habagat (Southwest Monsoon)
  // Nov to April: Amihan (Northeast Monsoon)
  if (deg >= 180 && deg <= 270) {
    return {
      nameFil: 'Habagat (Southwest Monsoon)',
      nameEn: 'Southwest Monsoon (Habagat)',
      desc: 'May dalang mainit at basang hangin na nagdudulot ng mga pag-ulan sa kanlurang bahagi ng Pilipinas.',
      descEn: 'Warm and moist maritime air mass bringing moderate to heavy rainfall over the western sections of the Philippines.',
    };
  } else if ((deg >= 0 && deg <= 90) || deg >= 330) {
    return {
      nameFil: 'Amihan (Northeast Monsoon)',
      nameEn: 'Northeast Monsoon (Amihan)',
      desc: 'Malamig at tuyong hangin mula hilagang-silangan, nagdudulot ng malamig na simoy at maulap na kalangitan sa silangang Luzon.',
      descEn: 'Cool, dry continental air mass originating from Siberia/China bringing chilly breezes and cloudy skies over Luzon.',
    };
  } else {
    return {
      nameFil: 'Easterlies (Hanging Silangan)',
      nameEn: 'Easterlies',
      desc: 'Mainit at maalinsangang hangin mula sa Karagatang Pasipiko na nagdadala ng panaka-nakang pag-ulan at localized thunderstorms.',
      descEn: 'Warm and humid winds blowing from the Pacific Ocean, causing localized afternoon thunderstorms.',
    };
  }
}

export async function searchCities(query: string): Promise<LocationCoordinates[]> {
  if (!query || query.trim().length < 2) return [];

  // Prioritize Philippine cities first, or general search if none
  const phUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=10&language=en&format=json&country_code=ph`;
  const generalUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=8&language=en&format=json`;

  try {
    const phRes = await fetch(phUrl);
    const phData = await phRes.json();
    if (phData.results && Array.isArray(phData.results) && phData.results.length > 0) {
      return phData.results.map((item: any) => ({
        name: item.name,
        country: 'Pilipinas',
        admin1: item.admin1 || item.country,
        lat: item.latitude,
        lon: item.longitude,
      }));
    }

    // Fallback to general search if user searched for something specific
    const res = await fetch(generalUrl);
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map((item: any) => ({
      name: item.name,
      country: item.country,
      admin1: item.admin1,
      lat: item.latitude,
      lon: item.longitude,
    }));
  } catch (err) {
    console.error('City search failed', err);
    return [];
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<{ name: string; country: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
      },
    });
    if (!res.ok) throw new Error('Reverse geocode status ' + res.status);
    const data = await res.json();

    const name =
      data.address?.city ||
      data.address?.town ||
      data.address?.municipality ||
      data.address?.province ||
      data.address?.state ||
      data.name ||
      `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;

    const country = data.address?.country || '';
    return { name, country };
  } catch {
    return { name: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`, country: '' };
  }
}

export function formatTemperature(celsius: number, unit: 'celsius' | 'fahrenheit'): string {
  if (unit === 'fahrenheit') {
    return `${Math.round((celsius * 9) / 5 + 32)}°F`;
  }
  return `${Math.round(celsius)}°C`;
}

export function formatSpeed(kmh: number, unit: 'kmh' | 'mph' | 'ms' | 'knots'): string {
  switch (unit) {
    case 'mph':
      return `${Math.round(kmh * 0.621371)} mph`;
    case 'ms':
      return `${Math.round((kmh / 3.6) * 10) / 10} m/s`;
    case 'knots':
      return `${Math.round(kmh * 0.539957)} kts`;
    case 'kmh':
    default:
      return `${Math.round(kmh)} km/h`;
  }
}

export function getWindDirectionLabel(deg: number, lang: Language): string {
  const directionsEn = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const directionsFil = ['Hilaga (N)', 'Hilagang-Silangan', 'Silangan (E)', 'Timog-Silangan', 'Timog (S)', 'Timog-Kanluran', 'Kanluran (W)', 'Hilagang-Kanluran'];

  const index = Math.round(deg / 22.5) % 16;
  if (lang === 'fil') {
    const filIndex = Math.round(deg / 45) % 8;
    return directionsFil[filIndex];
  }
  return directionsEn[index];
}
