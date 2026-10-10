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

/** Pixel size of one sampled cell. Bigger = faster, slightly softer field. */
const GRID_STEP = 6;

/** Colour ramp for the whole-map temperature field (°C -> RGB). */
const TEMP_RAMP: { t: number; rgb: [number, number, number] }[] = [
  { t: 20, rgb: [132, 204, 22] }, // cool highlands: lime
  { t: 24, rgb: [250, 204, 21] }, // mild: yellow
  { t: 28, rgb: [251, 146, 60] }, // warm: orange
  { t: 31, rgb: [249, 115, 22] }, // hot: deep orange
  { t: 34, rgb: [225, 29, 72] },  // very hot: red
];

function rampColor(temp: number): [number, number, number] {
  if (temp <= TEMP_RAMP[0].t) return TEMP_RAMP[0].rgb;
  const last = TEMP_RAMP[TEMP_RAMP.length - 1];
  if (temp >= last.t) return last.rgb;
  for (let i = 1; i < TEMP_RAMP.length; i++) {
    const a = TEMP_RAMP[i - 1];
    const b = TEMP_RAMP[i];
    if (temp <= b.t) {
      const k = (temp - a.t) / (b.t - a.t);
      return [
        a.rgb[0] + (b.rgb[0] - a.rgb[0]) * k,
        a.rgb[1] + (b.rgb[1] - a.rgb[1]) * k,
        a.rgb[2] + (b.rgb[2] - a.rgb[2]) * k,
      ];
    }
  }
  return last.rgb;
}

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

    // Offscreen buffer holds the coarse temperature field; it is scaled up
    // onto the visible canvas so the whole map is coloured with few pixels.
    const offscreen = document.createElement('canvas');
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    let frameId: number | null = null;

    // Paint the full map: inverse-distance interpolation of the station
    // temperatures evaluated on a coarse grid (cheap even on big screens).
    const paint = () => {
      frameId = null;
      const size = map.getSize();
      if (canvas.width !== size.x || canvas.height !== size.y) {
        canvas.width = size.x;
        canvas.height = size.y;
      }

      const cols = Math.max(1, Math.ceil(size.x / GRID_STEP));
      const rows = Math.max(1, Math.ceil(size.y / GRID_STEP));
      if (offscreen.width !== cols || offscreen.height !== rows) {
        offscreen.width = cols;
        offscreen.height = rows;
      }

      const stations = THERMAL_STATIONS.map((st) => {
        const pt = map.latLngToContainerPoint([st.lat, st.lon]);
        return { x: pt.x, y: pt.y, temp: st.temp };
      });

      const img = offCtx.createImageData(cols, rows);
      const data = img.data;

      for (let r = 0; r < rows; r++) {
        const py = r * GRID_STEP + GRID_STEP / 2;
        for (let c = 0; c < cols; c++) {
          const px = c * GRID_STEP + GRID_STEP / 2;

          let num = 0;
          let den = 0;
          for (let i = 0; i < stations.length; i++) {
            const st = stations[i];
            const dx = px - st.x;
            const dy = py - st.y;
            const w = 1 / (dx * dx + dy * dy + 400); // softened inverse-square
            num += w * st.temp;
            den += w;
          }
          const temp = den > 0 ? num / den : 28;
          const [R, G, B] = rampColor(temp);

          const o = (r * cols + c) * 4;
          data[o] = R;
          data[o + 1] = G;
          data[o + 2] = B;
          data[o + 3] = 255;
        }
      }

      offCtx.putImageData(img, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'low';
      ctx.drawImage(offscreen, 0, 0, cols * GRID_STEP, rows * GRID_STEP);
    };

    // Coalesce map movement into at most one repaint per animation frame.
    const schedule = () => {
      if (frameId === null) frameId = requestAnimationFrame(paint);
    };

    paint();

    map.on('move', schedule);
    map.on('zoom', schedule);
    map.on('resize', schedule);

    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      map.off('move', schedule);
      map.off('zoom', schedule);
      map.off('resize', schedule);
    };
  }, [map, visible, opacity]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{ opacity }}
      className="pointer-events-none absolute inset-0 z-[250] w-full h-full"
    />
  );
};
