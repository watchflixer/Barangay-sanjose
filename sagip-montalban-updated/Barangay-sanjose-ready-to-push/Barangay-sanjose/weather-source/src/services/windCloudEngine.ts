import L from 'leaflet';
import { CityWeather } from '../types/weather';

export interface WindParticle {
  lat: number;
  lng: number;
  age: number;
  maxAge: number;
  speedMultiplier: number;
  trail: { lat: number; lng: number }[];
  targetTrailLength: number;
}

interface StormCloud {
  lat: number;
  lng: number;
  radiusKm: number;
  driftSpeed: number;
  phase: number;
  opacity: number;
}

export class WindCloudEngine {
  private map: L.Map;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private particles: WindParticle[] = [];
  private numParticles = 480; // Higher density for expansive regional coverage
  private cities: CityWeather[] = [];
  private forecastHour: number = 0;
  private isRunning: boolean = false;
  private dpr: number = 1;
  private lastTime: number = 0;
  private isZoomAnimating: boolean = false;

  // Real-time precalculated wind station vectors for high performance O(N) spatial interpolation
  private stationVectors: { lat: number; lng: number; u: number; v: number; speed: number }[] = [];

  // Expanded Realistic tropical storm cloud clusters (spanning Philippine Sea, West PH Sea, Bashi Channel, Celebes Sea)
  private clouds: StormCloud[] = [
    { lat: 16.0, lng: 127.8, radiusKm: 340, driftSpeed: 0.15, phase: 0.0, opacity: 0.23 },
    { lat: 14.2, lng: 130.5, radiusKm: 390, driftSpeed: 0.18, phase: 1.2, opacity: 0.27 },
    { lat: 18.2, lng: 125.8, radiusKm: 310, driftSpeed: 0.20, phase: 2.4, opacity: 0.21 },
    { lat: 15.2, lng: 118.5, radiusKm: 330, driftSpeed: 0.12, phase: 3.6, opacity: 0.20 },
    { lat: 12.8, lng: 121.5, radiusKm: 280, driftSpeed: 0.14, phase: 4.8, opacity: 0.18 },
    { lat: 11.2, lng: 127.2, radiusKm: 320, driftSpeed: 0.16, phase: 5.5, opacity: 0.24 },
    { lat: 19.8, lng: 122.5, radiusKm: 350, driftSpeed: 0.14, phase: 0.8, opacity: 0.20 },
    { lat: 21.5, lng: 124.0, radiusKm: 360, driftSpeed: 0.17, phase: 1.6, opacity: 0.22 },
    { lat: 8.5, lng: 117.0, radiusKm: 300, driftSpeed: 0.11, phase: 2.9, opacity: 0.19 },
    { lat: 4.8, lng: 124.5, radiusKm: 320, driftSpeed: 0.13, phase: 4.1, opacity: 0.19 }
  ];

  constructor(map: L.Map) {
    this.map = map;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'wind-cloud-canvas-overlay pointer-events-none select-none';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';

    this.ctx = this.canvas.getContext('2d', { alpha: true })!;

    // Create a dedicated Leaflet map pane for wind & storm clouds
    // This allows hardware-accelerated CSS scaling during zoom transitions with zero jitter!
    let windPane = this.map.getPane('windStreamPane');
    if (!windPane) {
      windPane = this.map.createPane('windStreamPane');
      windPane.style.zIndex = '450'; // Just above base tiles (200) and SVG overlays (400), below markers (600)
      windPane.style.pointerEvents = 'none';
    }
    windPane.appendChild(this.canvas);

    this.syncCanvasPosition();
    this.initParticles();

    // Map interaction event listeners
    this.map.on('zoomanim', this.handleZoomAnim);
    this.map.on('zoomend', this.handleZoomEnd);
    this.map.on('move', this.handleMove);
    this.map.on('moveend', this.handleMoveEnd);
    this.map.on('resize', this.handleResize);
  }

  public updateData(cities: CityWeather[], forecastHour: number) {
    this.cities = cities;
    this.forecastHour = forecastHour;

    // Convert real-time station windSpeed and windDirection to meteorological (u, v) vectors
    // Wind direction is meteorological: degrees from which wind originates
    // So wind vector (destination) points toward direction + 180°
    this.stationVectors = cities
      .filter(c => typeof c.windSpeed === 'number' && typeof c.windDirection === 'number')
      .map(c => {
        const rad = (c.windDirection * Math.PI) / 180;
        // u = east-west component (-sin for meteorological direction: 270° West wind blows East -> +u)
        // v = north-south component (-cos for meteorological direction: 180° South wind blows North -> +v)
        const u = -Math.sin(rad);
        const v = -Math.cos(rad);
        return {
          lat: c.lat,
          lng: c.lng,
          u,
          v,
          speed: Math.max(5, c.windSpeed)
        };
      });
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.canvas.style.display = 'block';
    this.syncCanvasPosition();
    if (this.particles.length === 0) {
      this.initParticles();
    }
    this.lastTime = performance.now();
    this.animate();
  }

  public stop() {
    this.isRunning = false;
    this.canvas.style.display = 'none';
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    const size = this.map.getSize();
    this.ctx.clearRect(0, 0, size.x, size.y);
  }

  public destroy() {
    this.stop();
    this.map.off('zoomanim', this.handleZoomAnim);
    this.map.off('zoomend', this.handleZoomEnd);
    this.map.off('move', this.handleMove);
    this.map.off('moveend', this.handleMoveEnd);
    this.map.off('resize', this.handleResize);

    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }

  // Handle smooth Leaflet zoom animation:
  private handleZoomAnim = () => {
    this.isZoomAnimating = true;
  };

  private handleZoomEnd = () => {
    this.isZoomAnimating = false;
    this.syncCanvasPosition();
  };

  private handleMove = () => {
    if (!this.isZoomAnimating) {
      this.syncCanvasPosition();
    }
  };

  private handleMoveEnd = () => {
    this.syncCanvasPosition();
  };

  private handleResize = () => {
    this.syncCanvasPosition();
  };

  /**
   * Synchronizes canvas dimensions and pixel position with the Leaflet map pane.
   */
  private syncCanvasPosition() {
    if (!this.map) return;
    const size = this.map.getSize();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    const w = Math.round(size.x);
    const h = Math.round(size.y);

    if (w <= 0 || h <= 0) return;

    if (this.canvas.width !== w * this.dpr || this.canvas.height !== h * this.dpr) {
      this.canvas.width = w * this.dpr;
      this.canvas.height = h * this.dpr;
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
    }

    // Anchor canvas to the top-left of the current map pane
    const topLeft = this.map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this.canvas, topLeft);

    // Apply high-DPI scaling transform
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /**
   * Expansive particle initialization:
   * Extended well beyond the lock view bounds so wind seamlessly flows
   * from deep in the Pacific Ocean, South China Sea, and Celebes/Sulu Sea across the entire screen!
   */
  private initParticles() {
    this.particles = [];
    const bounds = this.map.getBounds();

    // Expansive bounds extending broadly beyond the lock view (1.0°S to 27.0°N, 108°E to 138°E)
    const minLat = Math.min(-1.0, bounds.getSouth() - 4.5);
    const maxLat = Math.max(27.0, bounds.getNorth() + 4.5);
    const minLng = Math.min(108.0, bounds.getWest() - 5.5);
    const maxLng = Math.max(138.0, bounds.getEast() + 5.5);

    for (let i = 0; i < this.numParticles; i++) {
      const lat = minLat + Math.random() * (maxLat - minLat);
      const lng = minLng + Math.random() * (maxLng - minLng);
      const maxAge = 80 + Math.floor(Math.random() * 85);
      const age = Math.floor(Math.random() * maxAge); // Staggered initial age to avoid batch respawns

      this.particles.push({
        lat,
        lng,
        age,
        maxAge,
        speedMultiplier: 0.85 + Math.random() * 0.35,
        trail: [{ lat, lng }],
        targetTrailLength: 10 + Math.floor(Math.random() * 7)
      });
    }
  }

  /**
   * Real-Time Hybrid Wind Field:
   * Combines real-time station observations (Open-Meteo live speed & direction across 50+ stations)
   * with a continuous regional oceanic circulation model (Philippine Sea cyclone vortex + Southwest monsoon / Habagat + Easterlies).
   * Spans seamlessly to all oceans outside the lock view!
   */
  private getWindField(lat: number, lng: number): { u: number; v: number; speedKmH: number; intensity: number } {
    // 1. Regional Meteorological Background Field (Active Storm Vortex & Monsoon Axis)
    const stormCenterLat = 15.6;
    const stormCenterLng = 127.8;

    const dLat = lat - stormCenterLat;
    const dLng = (lng - stormCenterLng) * Math.cos((stormCenterLat * Math.PI) / 180);
    const dist = Math.sqrt(dLat * dLat + dLng * dLng) + 0.4;

    // Cyclonic spiral: counter-clockwise rotation with smooth inward inflow
    const theta = Math.atan2(dLat, dLng);
    const spiralAngle = theta + Math.PI * 0.5 + 0.22;

    const vortexScale = Math.min(1.5, 7.2 / (dist + 1.8));
    const uVortex = -Math.cos(spiralAngle) * vortexScale;
    const vVortex = -Math.sin(spiralAngle) * vortexScale;

    // Southwest Monsoon (Habagat) pulling moist air from Sulu & South China Sea
    const uMonsoon = 0.55 + 0.15 * Math.sin(lng * 0.20);
    const vMonsoon = 0.40 + 0.18 * Math.cos(lat * 0.25);

    // Northeast Trade Winds / Easterlies across northern & eastern open waters
    const uEasterlies = -0.65;
    const vEasterlies = 0.12;

    const latProgress = Math.max(0, Math.min(1, (lat - 4.0) / 18.0));
    const smoothFactor = latProgress * latProgress * (3 - 2 * latProgress);
    const uRegional = (uMonsoon * (1.0 - smoothFactor * 0.65) + uEasterlies * (smoothFactor * 0.65)) * 0.40 + uVortex * 0.88;
    const vRegional = (vMonsoon * (1.0 - smoothFactor * 0.55) + vEasterlies * (smoothFactor * 0.55)) * 0.40 + vVortex * 0.88;

    let finalU = uRegional;
    let finalV = vRegional;
    let finalSpeed = 24;

    // 2. Real-Time Station Observation Blending (Inverse Distance Weighting)
    // If real-time station weather data is available, blend locally observed wind vectors
    if (this.stationVectors.length > 0) {
      let weightSum = 0;
      let stationU = 0;
      let stationV = 0;
      let stationSpeed = 0;

      for (let i = 0; i < this.stationVectors.length; i++) {
        const s = this.stationVectors[i];
        const dLa = lat - s.lat;
        const dLn = (lng - s.lng) * Math.cos((lat * Math.PI) / 180);
        const dSq = dLa * dLa + dLn * dLn;

        // Influence radius of ~3.5 degrees (~380 km) around Philippine stations
        if (dSq < 12.25) {
          const w = 1 / (dSq + 0.35);
          stationU += s.u * w;
          stationV += s.v * w;
          stationSpeed += s.speed * w;
          weightSum += w;
        }
      }

      if (weightSum > 0) {
        stationU /= weightSum;
        stationV /= weightSum;
        stationSpeed /= weightSum;

        // Smooth spatial blend weight: 1.0 close to stations, transitioning smoothly to regional open-ocean field
        const localInfluence = Math.min(0.85, weightSum / 2.5);
        finalU = uRegional * (1 - localInfluence) + stationU * localInfluence;
        finalV = vRegional * (1 - localInfluence) + stationV * localInfluence;
        finalSpeed = 24 * (1 - localInfluence) + stationSpeed * localInfluence;
      }
    }

    const mag = Math.sqrt(finalU * finalU + finalV * finalV) || 1;
    const uNorm = finalU / mag;
    const vNorm = finalV / mag;

    const intensity = Math.min(1.0, (mag * 0.6) + (finalSpeed / 85));
    const speedKmH = Math.round(finalSpeed);

    return { u: uNorm, v: vNorm, speedKmH, intensity };
  }

  /**
   * Main animation loop with delta-time integration
   */
  private animate = () => {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = this.lastTime ? Math.min((now - this.lastTime) / 1000, 0.033) : 0.016;
    this.lastTime = now;

    const size = this.map.getSize();
    const width = size.x;
    const height = size.y;

    if (width <= 0 || height <= 0) {
      this.animFrameId = requestAnimationFrame(this.animate);
      return;
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // 1. Draw atmospheric storm clouds (satellite-style rainbands)
    this.drawStormClouds(width, height);

    // 2. Draw expansive real-time wind streamlines
    this.drawWindStreamlines(width, height, dt);

    this.animFrameId = requestAnimationFrame(this.animate);
  };

  /**
   * Draws soft drifting satellite storm clouds swirling around the storm center and monsoon belt
   */
  private drawStormClouds(width: number, height: number) {
    const ctx = this.ctx;
    const nowSec = performance.now() * 0.00035;

    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      const currentLat = c.lat + Math.sin(nowSec * c.driftSpeed + c.phase) * 0.35;
      const currentLng = c.lng + Math.cos(nowSec * c.driftSpeed + c.phase) * 0.55;

      const pt = this.map.latLngToContainerPoint([currentLat, currentLng]);

      const zoom = this.map.getZoom();
      const kmPerPixel = 40075 / (256 * Math.pow(2, zoom));
      const radiusPx = Math.max(35, Math.min(480, c.radiusKm / kmPerPixel));

      // Skip if off-screen
      if (pt.x < -radiusPx || pt.x > width + radiusPx || pt.y < -radiusPx || pt.y > height + radiusPx) {
        continue;
      }

      // Soft diffuse cloud gradient
      const grad = ctx.createRadialGradient(pt.x, pt.y, radiusPx * 0.12, pt.x, pt.y, radiusPx);
      grad.addColorStop(0, `rgba(241, 245, 249, ${c.opacity * 0.75})`);
      grad.addColorStop(0.40, `rgba(226, 232, 240, ${c.opacity * 0.50})`);
      grad.addColorStop(0.75, `rgba(203, 213, 225, ${c.opacity * 0.20})`);
      grad.addColorStop(1, 'rgba(203, 213, 225, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radiusPx, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Draws ultra-smooth, continuous wind streamlines across expansive ocean & land bounds:
   * - Zoom-invariant speed: Visual pixel velocity is normalized regardless of zoom level
   * - Polyline trails: Each particle maintains a connected history curve
   * - Broad geographical bounds reaching far outside the locked Philippine boundary
   */
  private drawWindStreamlines(width: number, height: number, dt: number) {
    const ctx = this.ctx;
    const currentZoom = this.map.getZoom();
    const bounds = this.map.getBounds();

    // Expansive boundaries: allows wind to flow freely from deep outside the locked view
    const minLat = Math.min(-1.0, bounds.getSouth() - 4.5);
    const maxLat = Math.max(27.0, bounds.getNorth() + 4.5);
    const minLng = Math.min(108.0, bounds.getWest() - 5.5);
    const maxLng = Math.max(138.0, bounds.getEast() + 5.5);

    // Zoom-invariant screen speed: ~48 pixels per second on screen
    const degPerPixel = 360 / (256 * Math.pow(2, currentZoom));
    const baseStepDeg = 48 * degPerPixel * dt;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Query real-time hybrid wind vector
      const flow = this.getWindField(p.lat, p.lng);

      // Advance head position
      const step = baseStepDeg * p.speedMultiplier;
      p.lat += flow.v * step;
      p.lng += flow.u * step;

      // Append new position to continuous trail
      p.trail.push({ lat: p.lat, lng: p.lng });
      if (p.trail.length > p.targetTrailLength) {
        p.trail.shift();
      }
      p.age++;

      // Respawn when age expires or drifts past expansive boundaries
      if (
        p.age >= p.maxAge ||
        p.lat < minLat || p.lat > maxLat ||
        p.lng < minLng || p.lng > maxLng
      ) {
        p.lat = minLat + Math.random() * (maxLat - minLat);
        p.lng = minLng + Math.random() * (maxLng - minLng);
        p.age = 0;
        p.maxAge = 80 + Math.floor(Math.random() * 85);
        p.speedMultiplier = 0.85 + Math.random() * 0.35;
        p.trail = [{ lat: p.lat, lng: p.lng }];
        continue;
      }

      if (p.trail.length < 2) continue;

      // Project all trail points to container screen pixels
      const pts: { x: number; y: number }[] = [];
      for (let j = 0; j < p.trail.length; j++) {
        const pt = this.map.latLngToContainerPoint([p.trail[j].lat, p.trail[j].lng]);
        pts.push(pt);
      }

      const head = pts[pts.length - 1];

      // Generous screen margin to allow seamless streamlines entering/leaving view edges
      if (head.x < -80 || head.x > width + 80 || head.y < -80 || head.y > height + 80) {
        continue;
      }

      // Smooth lifespan fade curve
      const lifeRatio = p.age / p.maxAge;
      let alpha = 1.0;
      if (lifeRatio < 0.20) {
        alpha = lifeRatio / 0.20;
      } else if (lifeRatio > 0.72) {
        alpha = (1.0 - lifeRatio) / 0.28;
      }

      // Elegant color matching storm intensity
      let strokeColor = `rgba(255, 255, 255, ${alpha * 0.90})`;
      let headColor = `rgba(255, 255, 255, ${alpha * 0.98})`;

      if (flow.intensity > 0.75) {
        strokeColor = `rgba(163, 230, 53, ${alpha * 0.90})`; // Electric Lime Green
        headColor = `rgba(217, 249, 157, ${alpha * 0.98})`;
      } else if (flow.intensity > 0.45) {
        strokeColor = `rgba(34, 211, 238, ${alpha * 0.88})`; // Cyan
        headColor = `rgba(207, 250, 254, ${alpha * 0.95})`;
      }

      // Draw continuous smooth streamline ribbon
      ctx.lineWidth = 1.9;
      ctx.strokeStyle = strokeColor;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let j = 1; j < pts.length; j++) {
        ctx.lineTo(pts[j].x, pts[j].y);
      }
      ctx.stroke();

      // Draw aerodynamic arrowhead at streamline tip
      if (alpha > 0.35 && pts.length >= 2) {
        const prev = pts[pts.length - 2];
        const angle = Math.atan2(head.y - prev.y, head.x - prev.x);
        const arrowLen = 5.2;

        ctx.fillStyle = headColor;
        ctx.beginPath();
        ctx.moveTo(head.x, head.y);
        ctx.lineTo(
          head.x - arrowLen * Math.cos(angle - Math.PI / 6),
          head.y - arrowLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          head.x - arrowLen * 0.65 * Math.cos(angle),
          head.y - arrowLen * 0.65 * Math.sin(angle)
        );
        ctx.lineTo(
          head.x - arrowLen * Math.cos(angle + Math.PI / 6),
          head.y - arrowLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
