import React from 'react';

/**
 * Weather view: the complete Panahon weather map & radar project.
 *
 * The app lives in its own document (weather.html, source in
 * weather-source/src/) and is embedded here at full size. That keeps its
 * Tailwind styles, fonts and Leaflet CSS isolated from the rest of this app.
 * It mounts only while the view is open, so closing it unloads the app.
 */
export const WeatherView: React.FC<{ frameRef?: React.Ref<HTMLIFrameElement> }> = ({ frameRef }) => {
  return (
    <div role="region" aria-label="Weather" className="absolute inset-0 z-30 min-w-0 bg-slate-950">
      <iframe
        ref={frameRef}
        title="Panahon weather map and radar"
        src={`${import.meta.env.BASE_URL}weather.html`}
        allow="geolocation; fullscreen"
        allowFullScreen
        className="block h-full w-full min-w-0 max-w-none border-0"
      />
    </div>
  );
};
