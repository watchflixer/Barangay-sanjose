export type WeatherMode = 'weather' | 'temperature' | 'storm' | 'rain';

export interface CityWeather {
  id: string;
  name: string;
  region: string;
  islandGroup: 'Luzon' | 'Visayas' | 'Mindanao';
  lat: number;
  lng: number;
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  conditionText: string;
  conditionIcon: string;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  cloudCover: number;
  precipitation: number;
  precipitationProbability: number;
  minZoom?: number;
  hourly?: {
    time: string[];
    temperature: number[];
    precipitationProbability: number[];
    weatherCode: number[];
    cloudCover: number[];
  };
  daily?: {
    time: string[];
    weatherCode: number[];
    maxTemp: number[];
    minTemp: number[];
  };
}

export interface RainViewerFrame {
  time: number;
  path: string;
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

export interface StormData {
  tropicalCycloneWarning: boolean;
  activeStormName?: string;
  parStatus: string;
  bulletinSummary: string;
  maxWindSpeedKmh: number;
  atmosphericPressureHpa: number;
}
