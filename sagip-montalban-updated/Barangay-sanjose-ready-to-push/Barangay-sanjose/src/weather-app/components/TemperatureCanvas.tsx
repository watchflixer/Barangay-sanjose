import React, { useEffect, useRef } from 'react';
import type L from 'leaflet';

interface TemperatureCanvasProps {
  map: L.Map | null;
  visible: boolean;
  opacity?: number;
}

interface ThermalPoint {
  lat: number;
  lon: number;
  temp: number; // Celsius
  radiusKm: number;
}

// Major Philippine thermal reference stations
const THERMAL_STATIONS: ThermalPoint[] = [
  // LUZON
  { lat: 18.2, lon: 120.6, temp: 31, radiusKm: 140 }, // Laoag
  { lat: 17.6, lon: 121.7, temp: 34, radiusKm: 170 }, // Tuguegarao (Hot valley)
  { lat: 16.4, lon: 120.6, temp: 19, radiusKm: 110 }, // Baguio (Cool highlands - green/yellow spot!)
  { lat: 15.8, lon: 120.3, temp: 32, radiusKm: 140 }, // Dagupan / Pangasinan
  { lat: 15.1, lon: 120.6, temp: 33, radiusKm: 130 }, // Central Luzon
  { lat: 14.6, lon: 121.0, temp: 32, radiusKm: 140 }, // Metro Manila
  { lat: 13.8, lon: 121.1, temp: 31, radiusKm: 130 }, // Batangas
  { lat: 13.6, lon: 123.2, temp: 30, radiusKm: 140 }, // Naga / Bicol
  { lat: 13.1, lon: 123.7, temp: 30, radiusKm: 130 }, // Legazpi
  { lat: 9.7, lon: 118.7, temp: 31, radiusKm: 180 },  // Palawan

  // VISAYAS
  { lat: 11.6, lon: 122.7, temp: 30, radiusKm: 140 }, // Roxas
  { lat: 10.7, lon: 122.6, temp: 31, radiusKm: 140 }, // Iloilo
  { lat: 10.3, lon: 123.9, temp: 31, radiusKm: 150 }, // Cebu
  { lat: 11.2, lon: 125.0, temp: 30, radiusKm: 150 }, // Tacloban
  { lat: 9.6, lon: 123.8, temp: 30, radiusKm: 130 },  // Bohol

  // MINDANAO
  { lat: 8.5, lon: 124.6, temp: 31, radiusKm: 160 },  // CDO
  { lat: 7.2, lon: 125.4, temp: 31, radiusKm: 180 },  // Davao
  { lat: 6.9, lon: 122.1, temp: 31, radiusKm: 150 },  // Zamboanga
  { lat: 6.1, lon: 125.2, temp: 32, radiusKm: 150 },  // General Santos
];

export const TemperatureCanvas: React.FC<TemperatureCanvasProps> = ({
  map,
  visible,
  opacity = 0.85,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!map || !visible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const size = map.getSize();
      if (canvas.width !== size.x || canvas.height !== size.y) {
        canvas.width = size.x;
        canvas.height = size.y;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Base sea background warmth (warm tropical sea ~30°C - vibrant orange)
      const seaGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      seaGrad.addColorStop(0, '#f97316'); // bright orange
      seaGrad.addColorStop(0.5, '#ea580c');
      seaGrad.addColorStop(1, '#ea580c');

      ctx.fillStyle = seaGrad;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render radial temperature gradients for land stations
      THERMAL_STATIONS.forEach((st) => {
        const pt = map.latLngToContainerPoint([st.lat, st.lon]);
        // Scale pixel radius by zoom level
        const zoom = map.getZoom();
        const basePixelRadius = Math.max(40, (st.radiusKm / 10) * Math.pow(1.8, zoom - 5));

        const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, basePixelRadius);

        if (st.temp <= 22) {
          // Cool highlands (Baguio - green/yellow signature look from screenshot!)
          grad.addColorStop(0, 'rgba(163, 230, 53, 0.95)'); // lime green
          grad.addColorStop(0.35, 'rgba(234, 179, 8, 0.9)'); // yellow
          grad.addColorStop(0.7, 'rgba(249, 115, 22, 0.7)');  // orange
          grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
        } else if (st.temp >= 33) {
          // Hot valley (Tuguegarao / Central Luzon - intense red-orange)
          grad.addColorStop(0, 'rgba(225, 29, 72, 0.85)'); // red
          grad.addColorStop(0.4, 'rgba(234, 88, 12, 0.85)');
          grad.addColorStop(0.8, 'rgba(249, 115, 22, 0.5)');
          grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
        } else {
          // Normal warm tropical land (yellow-orange)
          grad.addColorStop(0, 'rgba(250, 204, 21, 0.8)'); // warm yellow
          grad.addColorStop(0.5, 'rgba(249, 115, 22, 0.6)');
          grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
        }

        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, basePixelRadius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    render();

    map.on('move', render);
    map.on('zoom', render);
    map.on('resize', render);

    return () => {
      map.off('move', render);
      map.off('zoom', render);
      map.off('resize', render);
    };
  }, [map, visible, opacity]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{ opacity }}
      className="pointer-events-none absolute inset-0 z-[250] w-full h-full mix-blend-multiply"
    />
  );
};
