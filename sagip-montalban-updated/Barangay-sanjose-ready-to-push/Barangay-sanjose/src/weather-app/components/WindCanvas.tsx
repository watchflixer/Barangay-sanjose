import React, { useEffect, useRef } from 'react';
import type L from 'leaflet';

interface WindCanvasProps {
  map: L.Map | null;
  visible: boolean;
  intensity?: number;
}

interface Particle {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  speed: number;
}

export const WindCanvas: React.FC<WindCanvasProps> = ({ map, visible, intensity = 1 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!map || !visible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const particles: Particle[] = [];
    const maxParticles = Math.min(800, Math.floor(window.innerWidth * 0.45));

    const resize = () => {
      const size = map.getSize();
      canvas.width = size.x;
      canvas.height = size.y;
    };
    resize();

    // Spawn initial particles
    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        age: Math.floor(Math.random() * 60),
        maxAge: 40 + Math.floor(Math.random() * 60),
        speed: 1.2 + Math.random() * 1.8,
      });
    }

    // Mathematical wind vector approximation based on global atmospheric circulation
    // (Trades blow westward towards equator, Westerlies blow eastward, plus cyclonic spin)
    const getWindVector = (lat: number, lon: number): { u: number; v: number } => {
      // Typhoons / Cyclones spin counter-clockwise in Northern Hemisphere
      const dDindoLat = lat - 18.2;
      const dDindoLon = lon - 128.6;
      const distDindo = Math.hypot(dDindoLat, dDindoLon);

      if (distDindo < 12) {
        // Cyclonic vortex around active storm
        const speed = Math.max(1.5, 4.0 - distDindo * 0.25);
        return {
          u: (dDindoLat / (distDindo + 0.1)) * speed * 1.5,
          v: (-dDindoLon / (distDindo + 0.1)) * speed * 1.5,
        };
      }

      // Base planetary circulation:
      const absLat = Math.abs(lat);
      let baseU = 0;
      let baseV = 0;

      if (absLat < 30) {
        // Tropical easterlies (trades) - blowing to the west
        baseU = -1.8 + Math.sin(lon * 0.05) * 0.5;
        baseV = lat > 0 ? -0.4 : 0.4;
      } else if (absLat >= 30 && absLat < 60) {
        // Mid-latitude westerlies - blowing to the east
        baseU = 2.4 + Math.cos(lon * 0.04) * 0.8;
        baseV = (lat > 0 ? 0.6 : -0.6) + Math.sin(lon * 0.08) * 0.7;
      } else {
        // Polar easterlies
        baseU = -1.2;
        baseV = 0;
      }

      // Local harmonic variation (gives natural swirls)
      const swirl = Math.sin(lat * 0.15 + lon * 0.1) * 0.8;
      return {
        u: baseU + swirl * 0.5,
        v: baseV + Math.cos(lat * 0.1) * 0.6,
      };
    };

    let lastDraw = performance.now();

    const render = () => {
      const now = performance.now();
      const dt = Math.min((now - lastDraw) / 16.6, 2);
      lastDraw = now;

      // Semi-transparent fade effect for tracer tails
      ctx.fillStyle = 'rgba(10, 15, 30, 0.09)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.75)'; // cyan/light-blue streak
      ctx.lineCap = 'round';

      ctx.beginPath();

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Convert canvas point to lat/lon via Leaflet map
        const latLng = map.containerPointToLatLng([p.x, p.y]);
        const vec = getWindVector(latLng.lat, latLng.lng);

        const nextX = p.x + vec.u * p.speed * intensity * dt;
        const nextY = p.y - vec.v * p.speed * intensity * dt; // Y is inverted in screen coords

        ctx.moveTo(p.x, p.y);
        ctx.lineTo(nextX, nextY);

        p.x = nextX;
        p.y = nextY;
        p.age += 1;

        // Reset if out of bounds or expired
        if (
          p.age >= p.maxAge ||
          p.x < 0 ||
          p.x > canvas.width ||
          p.y < 0 ||
          p.y > canvas.height
        ) {
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
          p.age = 0;
          p.maxAge = 40 + Math.floor(Math.random() * 50);
        }
      }

      ctx.stroke();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    const onMove = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const onResize = () => {
      resize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    map.on('move', onMove);
    map.on('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      map.off('move', onMove);
      map.off('resize', onResize);
    };
  }, [map, visible, intensity]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[400] w-full h-full mix-blend-screen opacity-90"
    />
  );
};
