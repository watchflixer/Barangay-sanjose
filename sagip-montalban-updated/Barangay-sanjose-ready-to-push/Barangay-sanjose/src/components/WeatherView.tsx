import React from 'react';

/**
 * Weather view: the AuraCast realtime weather map & radar app.
 *
 * The app lives in its own document (weather.html, source in
 * src/weather-app/) and is embedded here at full size. That keeps its
 * Tailwind styles, fonts and Leaflet CSS isolated from the rest of this app.
 * It mounts only while the view is open, so closing it unloads the app.
 */
export const WeatherView: React.FC = () => {
  return (
    <div role="region" aria-label="Weather" className="absolute inset-0 z-30 bg-slate-950">
      <iframe
        title="AuraCast weather map and radar"
        src={`${import.meta.env.BASE_URL}weather.html`}
        allow="geolocation; fullscreen"
        allowFullScreen
        className="block h-full w-full border-0"
      />
    </div>
  );
};
