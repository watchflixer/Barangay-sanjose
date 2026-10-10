export type WeatherLayerType =
  | 'radar-reflectivity'
  | 'radar-rainrate'
  | 'himawari-ir'
  | 'himawari-bw'
  | 'rain'
  | 'storm'
  | 'rain-accumulation'
  | 'wind'
  | 'pressure'
  | 'temperature'
  | 'radar'
  | 'satellite'
  | 'clouds';

export type MapBaseStyle = 'satellite' | 'streets';

export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type SpeedUnit = 'kmh' | 'mph' | 'ms' | 'knots';
export type Language = 'fil' | 'en';

export interface LocationCoordinates {
  lat: number;
  lon: number;
  name?: string;
  country?: string;
  admin1?: string;
}

export interface RainViewerFrame {
  time: number;
  path: string;
  isPast: boolean;
}

export interface RainViewerData {
  version: string;
  generated: number;
  host: string;
  radar: {
    past: RainViewerFrame[];
    nowcast: RainViewerFrame[];
  };
  satellite?: {
    infrared: RainViewerFrame[];
  };
}

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  relativeHumidity: number;
  surfacePressure: number;
  uvIndex: number;
  precipitation: number;
  visibility: number;
  cloudCover: number;
  isDay: boolean;
  time: string;
}

export interface HourlyForecastItem {
  time: string;
  temperature: number;
  precipitationProbability: number;
  weatherCode: number;
  windSpeed: number;
}

export interface DailyForecastItem {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationProbability: number;
  weatherCode: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
  windSpeedMax: number;
}

export interface AirQualityInfo {
  aqi: number;
  pm2_5: number;
  pm10: number;
  ozone: number;
  nitrogenDioxide: number;
  status: {
    label: string;
    labelFil: string;
    color: string;
  };
}

export interface WeatherDetails {
  location: LocationCoordinates;
  current: CurrentWeather;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  airQuality?: AirQualityInfo;
  fetchedAt: Date;
}

export interface CityPreset {
  name: string;
  country: string;
  admin1?: string;
  lat: number;
  lon: number;
  temp?: number;
  code?: number;
}

export interface StormTrackPoint {
  time: string;
  lat: number;
  lon: number;
  category: string;
  windKts: number;
  pressureHpa: number;
}

export interface TropicalStorm {
  id: string;
  name: string;
  localName?: string;
  category: string;
  basin: string;
  status: string;
  currentLat: number;
  currentLon: number;
  maxWindKmh: number;
  gustsKmh: number;
  pressureHpa: number;
  movement: string;
  track: StormTrackPoint[];
  inPAR: boolean; // Philippine Area of Responsibility
}
