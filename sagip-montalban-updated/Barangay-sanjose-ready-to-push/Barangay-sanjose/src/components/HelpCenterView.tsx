import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
/*
 * NOTE ON LEAFLET: this app runs Leaflet 2 (2.0.0-alpha.1), where the old
 * lowercase factory helpers were removed. Use the classes instead:
 *   new L.Map(el, opts)          (not L.map(...))
 *   new L.TileLayer(url, opts)   (not L.tileLayer(...))
 *   new L.Marker(latlng, opts) / new L.DivIcon(opts) / new L.LayerGroup()
 *   new L.Polygon(...) / new L.Polyline(...) / new L.Circle(...)
 *   new L.LatLng(lat, lng) / new L.LatLngBounds(a, b) / new L.Control.Zoom(opts)
 * The published @types/leaflet still describes 1.x, so v1-only calls would
 * type-check yet fail at runtime.
 */
import { Filter, List, Loader2, Navigation, RefreshCw, Search, X } from 'lucide-react';
import {
  detectHelpPlacesSchema,
  fetchSupabaseCategory,
  isSupabaseEnabled,
  resetHelpPlacesSchema,
  type CategoryFetchResult,
  type HelpPlacesSchema,
} from '../services/helpCenterService';
import { HelpCenterFilterPicker } from './HelpCenterFilterPicker';
import {
  CATEGORY_BY_ID,
  HELP_CENTER_CATEGORIES,
  distanceKm,
  formatDistance,
  type Place,
  type PlaceCategory,
  type PlaceCategoryId,
} from '../data/helpCenterPlaces';
import { TILE_SERVERS } from '../data/tileServers';
import { flyToUserLocation } from '../lib/locateCamera';
import { mountTileLayer, type TileMount } from '../lib/tileLayer';
import { SAN_JOSE_BOUNDS, SAN_JOSE_CENTER } from '../data/geoData';

/**
 * HELP CENTER — the "Traffic-style" directory map
 * ------------------------------------------------
 * Same shell as the Traffic view (full-map Leaflet layer, Street/Satellite
 * switch, floating right-hand controls), but the basemap is plain Leaflet:
 * OpenStreetMap tiles on Street, Esri imagery on Satellite — no live traffic
 * raster. Instead of traffic it is a filterable directory of the barangay:
 *
 *   1. The view opens with a PICKER — the user answers first ("7-Eleven?
 *      botika? water? ATM?") and nothing else happens until they do.
 *   2. Only then does the Leaflet map mount with pins for exactly the chosen
 *      categories, plus chips up top to change the filter without leaving.
 *   3. Every pin comes from Supabase — one table per filter
 *      (`<group>_<category>`, see supabase/help_places.sql). There is no
 *      built-in fallback list and no live OSM layer: if a table cannot be
 *      reached the sheet footer says so and the retry button refetches.
 *
 * The whole view is monochrome by design: white/black interface, grayscale
 * basemaps (satellite included) and black pins stamped with the category's
 * cartographic code, so nothing here reads as generated decoration.
 *
 * Session memory (module scope) remembers the last filter selection and the
 * basemap between visits — but the picker still shows every time the view is
 * opened.
 */
let rememberedSelection: PlaceCategoryId[] | null = null;
// Street is the default, like the Traffic view: the plain OpenStreetMap
// Leaflet tile layer. Satellite switches to the Esri imagery layer.
let rememberedBasemap: 'streets' | 'satellite' = 'streets';

interface HelpCenterViewProps {
  /** Shared with MapViewer so the host's Recenter button can drive this map. */
  mapRef: React.MutableRefObject<L.Map | null>;
  /** Mirrors the app's "lock camera to Barangay San Jose" setting. */
  lockCameraToBounds?: boolean;
  /**
   * Reports which of the view's two screens is on top. The picker covers the
   * whole map, so the host hides its floating buttons while it is up and
   * shows them again on the map screen, where they drive this map.
   */
  onStageChange?: (stage: 'picker' | 'map') => void;
  /**
   * Coordinates approved by the host's "Show your location" button. A fresh
   * `nonce` means a new request: the view drops the blue "you are here" dot
   * and flies to it. Handled here (not in the host) because this map owns its
   * camera lock — a host-side fly-to would be clamped straight back inside
   * the barangay box.
   */
  userLocationRequest?: { coords: [number, number]; nonce: number } | null;
}

const ALL_CATEGORY_IDS = HELP_CENTER_CATEGORIES.map((category) => category.id);

/**
 * The "lock camera to Barangay San Jose" box, 0.015° larger than the barangay
 * on every side — the same box the host map used to hard-clamp against.
 */
const BARANGAY_LOCK_BOX = {
  south: SAN_JOSE_BOUNDS[0][0] - 0.015,
  west: SAN_JOSE_BOUNDS[0][1] - 0.015,
  north: SAN_JOSE_BOUNDS[1][0] + 0.015,
  east: SAN_JOSE_BOUNDS[1][1] + 0.015,
};

/**
 * Returns the centre pulled back inside the barangay box, or null when it is
 * already there (a no-op move would only fight the map). Used by the moveend
 * guard so user drags stay over the barangay while our fits stay free.
 */
const clampCentreToBarangay = (centre: L.LatLng): L.LatLng | null => {
  const lat = Math.min(Math.max(centre.lat, BARANGAY_LOCK_BOX.south), BARANGAY_LOCK_BOX.north);
  const lng = Math.min(Math.max(centre.lng, BARANGAY_LOCK_BOX.west), BARANGAY_LOCK_BOX.east);
  const moved = Math.abs(lat - centre.lat) > 1e-6 || Math.abs(lng - centre.lng) > 1e-6;
  return moved ? new L.LatLng(lat, lng) : null;
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });

export const HelpCenterView: React.FC<HelpCenterViewProps> = ({
  mapRef,
  lockCameraToBounds = false,
  onStageChange,
  userLocationRequest = null,
}) => {
  // ------------------------------------------------------------------ state
  const cameraLockRef = useRef(lockCameraToBounds);
  cameraLockRef.current = lockCameraToBounds;
  const [stage, setStage] = useState<'picker' | 'map'>('picker');
  // The Leaflet canvas is only created once the user has answered the picker,
  // and it stays mounted afterwards (re-opening the picker overlays it) so the
  // map keeps its pan/zoom and pins instead of restarting from scratch.
  const [mapReady, setMapReady] = useState(false);
  const [selected, setSelected] = useState<PlaceCategoryId[]>(() => rememberedSelection ?? []);
  const [basemap, setBasemap] = useState<'streets' | 'satellite'>(rememberedBasemap);
  // Every pin on this map comes from Supabase: one table per filter
  // (`<group>_<category>`, see supabase/help_places.sql). There is no
  // built-in fallback list and no live OSM layer any more.
  const [dbPlaces, setDbPlaces] = useState<Place[]>([]);
  const [dbError, setDbError] = useState(false);
  const [dbStatus, setDbStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  // One entry per selected filter: which Supabase table was read and what it
  // answered. Surfaced under "Why no pins?" so an empty filter is explainable.
  const [dbReport, setDbReport] = useState<CategoryFetchResult[]>([]);
  // Credentials: env override, a saved runtime override, or the built-in
  // barangay directory project (see helpCenterService). No UI is needed.
  const [retryTick, setRetryTick] = useState(0);
  const [mapCenter, setMapCenter] = useState<[number, number]>(SAN_JOSE_CENTER);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [originMode, setOriginMode] = useState<'center' | 'me'>('center');
  const [locatingMe, setLocatingMe] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [listQuery, setListQuery] = useState('');
  const [toast, setToast] = useState('');
  // Live height of the bottom sheet — the map's centring has to clear it, and
  // it only settles once the rows are laid out.
  const [sheetHeight, setSheetHeight] = useState(0);

  // ------------------------------------------------------------------ refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const localMapRef = useRef<L.Map | null>(null);
  const tileMountRef = useRef<TileMount | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const iconCacheRef = useRef<Map<PlaceCategoryId, L.DivIcon>>(new Map());
  const meMarkerRef = useRef<L.Marker | null>(null);
  const focusTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  // "Centre on the filtered pins" bookkeeping: which selection was last
  // fitted, the pin box + sheet-height signature of the last fit (so a repeat
  // fit is skipped), and whether the camera is the user's now.
  const fittedSelectionRef = useRef<string | null>(null);
  const fittedBoxRef = useRef<string | null>(null);
  const lastFitKeyRef = useRef<string | null>(null);
  const userMovedRef = useRef(false);
  const programmaticMoveRef = useRef(false);
  // Set while a "show my location" fly-to is running: the barangay camera lock
  // must not drag the map back, or the dot we just added would be off screen.
  const suppressCameraLockRef = useRef(false);
  // Last host location request applied, so a stale request is never replayed
  // when the map mounts (e.g. reopening the view later).
  const appliedLocationNonceRef = useRef(0);
  const programmaticViewRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedKey = useMemo(() => [...selected].sort().join('|'), [selected]);

  // Tell the host which screen is on top (the picker hides its map buttons).
  useEffect(() => {
    onStageChange?.(stage);
  }, [stage, onStageChange]);

  useEffect(
    () => () => {
      onStageChange?.('map');
    },
    [onStageChange],
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 4200);
  }, []);

  // ------------------------------------------------------------- filtering
  const toggleCategory = useCallback((id: PlaceCategoryId) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      const list = ALL_CATEGORY_IDS.filter((categoryId) => next.has(categoryId));
      rememberedSelection = list;
      return list;
    });
  }, []);

  const setSelection = useCallback((ids: PlaceCategoryId[]) => {
    const list = ALL_CATEGORY_IDS.filter((id) => ids.includes(id));
    rememberedSelection = list;
    setSelected(list);
  }, []);

  // ------------------------------------------------------------- map data
  // Supabase is the single source of truth: the rows loaded for the ticked
  // filters are the pins, nothing else is merged in.
  const places = useMemo(
    () => dbPlaces.filter((place) => selectedSet.has(place.category)),
    [dbPlaces, selectedSet],
  );

  // ------------------------------------------------------------- the map
  useEffect(() => {
    if (!mapReady) return;
    const container = containerRef.current;
    if (!container || localMapRef.current) return;

    const map = new L.Map(container, {
      center: SAN_JOSE_CENTER,
      zoom: 13,
      minZoom: 12,
      maxZoom: 20,
      // No maxBounds here on purpose. Leaflet 2 clamps the WHOLE viewport to
      // maxBounds, so the camera cannot move far enough south to centre the
      // filtered pins above the bottom sheet — with the lock on, pins ended up
      // sitting under the sheet. The "lock camera" setting is honoured by the
      // moveend guard below instead: user moves are pulled back over the
      // barangay, our own fits are not clamped.
      zoomControl: false,
      // No Leaflet attribution bar — same as the host map (MapViewer), so no
      // "Leaflet | © OpenStreetMap / © Esri" copyright text sits on the map.
      attributionControl: false,
    });

    // Native Leaflet zoom buttons — index.css pushes them below the app's
    // floating control stack so all map views line up.
    new L.Control.Zoom({ position: 'topleft' }).addTo(map);

    map.on('moveend', () => {
      const center = map.getCenter();
      setMapCenter([center.lat, center.lng]);
      // Any camera move that lands somewhere other than the view we set
      // ourselves counts as the user taking over (drag, wheel, pinch, the
      // host's Recenter/Locate, popup auto-pan) — so the automatic centring
      // must not snatch the view back. A no-op move such as the mount-time
      // invalidateSize keeps our view and is not user input, and nothing
      // counts until the first fit has happened.
      if (programmaticMoveRef.current || lastFitKeyRef.current === null) return;
      const settled = programmaticViewRef.current;
      const ours =
        settled !== null &&
        Math.abs(settled.lat - center.lat) < 1e-9 &&
        Math.abs(settled.lng - center.lng) < 1e-9 &&
        settled.zoom === map.getZoom();
      if (!ours) userMovedRef.current = true;

      // "Lock camera to Barangay San Jose": the user can drag past the edge,
      // but the camera comes back over the barangay. Our own fits are exempt,
      // so a fit that has to clear the bottom sheet is never fought.
      if (cameraLockRef.current && !programmaticMoveRef.current && !suppressCameraLockRef.current) {
        const clamped = clampCentreToBarangay(center);
        if (clamped) {
          programmaticMoveRef.current = true;
          map.once('moveend', () => {
            programmaticMoveRef.current = false;
            const settled = map.getCenter();
            programmaticViewRef.current = { lat: settled.lat, lng: settled.lng, zoom: map.getZoom() };
          });
          map.setView(clamped, map.getZoom(), { animate: true });
        }
      }
    });
    const sizeTimer = window.setTimeout(() => map.invalidateSize(), 0);
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(container);

    localMapRef.current = map;
    mapRef.current = map;

    return () => {
      window.clearTimeout(sizeTimer);
      resizeObserver.disconnect();
      markersRef.current.clear();
      markersLayerRef.current = null;
      meMarkerRef.current = null;
      tileMountRef.current = null;
      if (mapRef.current === map) mapRef.current = null;
      map.remove();
      localMapRef.current = null;
    };
  }, [mapReady, mapRef]);

  // Host "Show your location": draw the blue "you are here" dot on THIS map
  // and centre on it. It lives here rather than in the host because this view
  // owns its camera lock — a host-side fly-to would be clamped straight back
  // inside the barangay box. Applied once per request nonce, and it waits for
  // the map to exist (the filter picker covers it on first open).
  useEffect(() => {
    const request = userLocationRequest;
    const map = localMapRef.current;
    if (!request || !map) return;
    if (appliedLocationNonceRef.current === request.nonce) return;
    appliedLocationNonceRef.current = request.nonce;

    const coords = request.coords;
    const icon = new L.DivIcon({
      className: 'user-location-marker',
      html: '<span class="user-location-dot"></span>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
    if (meMarkerRef.current) {
      meMarkerRef.current.setLatLng(coords);
      meMarkerRef.current.setIcon(icon);
      if (!map.hasLayer(meMarkerRef.current)) meMarkerRef.current.addTo(map);
    } else {
      meMarkerRef.current = new L.Marker(coords, {
        icon,
        zIndexOffset: 1000,
        title: 'Your location',
      }).addTo(map);
    }

    // The user may well be outside Barangay San Jose, so release the camera
    // lock (and skip its moveend clamp) for this one flight.
    if (lockCameraToBounds) {
      map.setMaxBounds(null as unknown as L.LatLngBounds);
      suppressCameraLockRef.current = true;
      map.once('moveend', () => {
        suppressCameraLockRef.current = false;
      });
    }
    // Same slow fly-in the hazard map uses (lib/locateCamera.ts).
    flyToUserLocation(map, coords);
  }, [userLocationRequest, mapReady, lockCameraToBounds]);

  // Basemap. Both styles are plain Leaflet raster layers: Street is the
  // OpenStreetMap tile layer (TILE_SERVERS.streets) and Satellite is the Esri
  // imagery. mountTileLayer stamps the referrer policy OSM's usage policy
  // requires on every tile, and quietly swaps to the keyless Esri backup when
  // the tiles keep failing ("403r. Access blocked").
  useEffect(() => {
    const map = localMapRef.current;
    if (!mapReady || !map) return;
    tileMountRef.current?.dispose();
    tileMountRef.current = mountTileLayer(map, TILE_SERVERS[basemap], {
      onFallback: () =>
        showToast('OpenStreetMap tiles were blocked — switched to the backup street map.'),
    });
    return () => {
      tileMountRef.current?.dispose();
      tileMountRef.current = null;
    };
  }, [basemap, mapReady, showToast]);

  // ---------------------------------------------------------- pin factory
  const iconFor = useCallback((category: PlaceCategory) => {
    const cached = iconCacheRef.current.get(category.id);
    if (cached) return cached;
    const icon = new L.DivIcon({
      className: 'hc-pin-wrap',
      html: `<div class="hc-pin"><span class="hc-pin-code">${escapeHtml(category.code)}</span></div>`,
      iconSize: [30, 30],
      // The pin's tail tip sits at the bottom of the 30x30 box, so the marker
      // anchor lines up exactly with the place's coordinates.
      iconAnchor: [15, 30],
      popupAnchor: [0, -28],
    });
    iconCacheRef.current.set(category.id, icon);
    return icon;
  }, []);

  const popupHtml = useCallback((place: Place) => {
    const category = CATEGORY_BY_ID[place.category];
    const directions = `https://www.google.com/maps/dir/?api=1&destination=${place.coords[0]},${place.coords[1]}`;
    const phoneDigits = (place.phone ?? '').replace(/[^\d+]/g, '');
    const rows: string[] = [];
    rows.push(`<p class="mt-2 text-[12.5px] leading-snug text-[#5f6368]">${escapeHtml(place.address)}</p>`);
    if (place.hours) rows.push(`<p class="mt-1 text-[12.5px] text-[#5f6368]">Hours: ${escapeHtml(place.hours)}</p>`);
    if (place.note) rows.push(`<p class="mt-1 text-[11.5px] text-[#5f6368]">${escapeHtml(place.note)}</p>`);
    if (place.phone) rows.push(`<p class="mt-1 text-[12.5px] text-[#5f6368]">Phone: ${escapeHtml(place.phone)}</p>`);

    return `
      <div class="p-3">
        <div class="flex items-start gap-2.5">
          <span class="hc-pin-ref">${escapeHtml(category.code)}</span>
          <div class="min-w-0">
            <p class="text-[15px]>
          <span class="hc-pin-ref">${escapeHtml(category.code)}</span>
          <div class="min-w-0">
            <p class="text-[15px] leading-tight text-[#202124]">${escapeHtml(place.name)}</p>
            <p class="mt-[3px] text-[12.5px] text-[#5f6368]">${escapeHtml(category.label)}</p>
          </div>
        </div>
        ${rows.join('')}
        <div class="hc-popup-meta">${place.source === 'osm' ? 'SOURCE: OPENSTREETMAP' : place.source === 'supabase' ? 'SOURCE: BARANGAY LIST (SUPABASE)' : 'SOURCE: COMMUNITY PIN'}</div>
        <div class="mt-2 flex flex-wrap items-center gap-1.5">
          <a href="${directions}" target="_blank" rel="noopener noreferrer" class="hc-popup-btn hc-popup-btn--primary">Directions</a>
          ${phoneDigits ? `<a href="tel:${escapeHtml(phoneDigits)}" class="hc-popup-btn">Call</a>` : ''}
        </div>
      </div>`;
  }, []);

  // Rebuild the pins whenever the visible set changes (filters / live data).
  useEffect(() => {
    const map = localMapRef.current;
    if (!mapReady || !map) return;
    if (markersLayerRef.current) {
      map.removeLayer(markersLayerRef.current);
      markersLayerRef.current = null;
    }
    markersRef.current.clear();
    const group = new L.LayerGroup().addTo(map);
    markersLayerRef.current = group;
    places.forEach((place) => {
      const category = CATEGORY_BY_ID[place.category];
      if (!category) return;
      const marker = new L.Marker(place.coords, {
        icon: iconFor(category),
        title: place.name,
        riseOnHover: true,
      });
      marker.bindPopup(popupHtml(place), {
        className: 'custom-leaflet-popup hc-popup',
        maxWidth: 290,
        minWidth: 240,
        autoPanPadding: [24, 96],
      });
      marker.addTo(group);
      markersRef.current.set(place.id, marker);
    });
  }, [mapReady, places, iconFor, popupHtml]);

  // Centre the camera on the filtered pins — the same move Traffic makes when
  // it fits its route. The fit runs when the map screen is actually up (the
  // sheet has to be measured, and it only exists then), and again whenever the
  // pin box or the sheet height really changes — but never after the user has
  // taken the camera, unless they picked a new filter set themselves.
  // When the filter is cleared (places.length === 0) and the user returns via
  // the picker X/back, recenter to the default Barangay San Jose view.
  useEffect(() => {
    const map = localMapRef.current;
    if (!mapReady || stage !== 'map' || !map) return;
    if (places.length === 0) {
      const fitKey = `empty|${sheetHeight}`;
      if (fitKey === lastFitKeyRef.current) return;
      const selectionChanged = fittedSelectionRef.current !== selectedKey;
      // If the user panned an already-empty map and re-opened/closed the
      // picker without changing the filter, keep their pan — don't fight it.
      if (!selectionChanged && userMovedRef.current) return;
      fittedSelectionRef.current = selectedKey;
      lastFitKeyRef.current = fitKey;
      fittedBoxRef.current = 'empty';
      userMovedRef.current = false;
      programmaticMoveRef.current = true;
      map.once('moveend', () => {
        programmaticMoveRef.current = false;
        const settled = map.getCenter();
        programmaticViewRef.current = { lat: settled.lat, lng: settled.lng, zoom: map.getZoom() };
      });
      map.flyTo(SAN_JOSE_CENTER, 13, { duration: 0.7, easeLinearity: 0.25 });
      return;
    }

    const bounds = new L.LatLngBounds(places.map((place) => place.coords));
    if (!bounds.isValid()) return;

    // The sheet rides over the lower half of the map, so the box has to clear
    // it; the top-left leaves room for the host's control column and the
    // Street | Satellite switch.
    const boxKey = [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()]
      .map((value) => value.toFixed(5))
      .join(',');
    // The sheet height is part of the signature: the fit done while the picker
    // still covers the map had no sheet to measure, so the real one replaces
    // it as soon as the map screen opens.
    const fitKey = `${boxKey}|${sheetHeight}`;
    if (fitKey === lastFitKeyRef.current) return;

    const selectionChanged = fittedSelectionRef.current !== selectedKey;
    // A wider box from a late Supabase batch must not snatch the camera back.
    if (!selectionChanged && userMovedRef.current) return;

    const hadFit = fittedBoxRef.current !== null;
    fittedSelectionRef.current = selectedKey;
    lastFitKeyRef.current = fitKey;
    fittedBoxRef.current = boxKey;
    // A fresh selection re-frames the camera, so the map is ours again until
    // the user moves it.
    userMovedRef.current = false;

    programmaticMoveRef.current = true;
    // Cleared on the moveend of OUR fit — an animated fit ends later, and the
    // window has to stay closed until then.
    map.once('moveend', () => {
      programmaticMoveRef.current = false;
      const settled = map.getCenter();
      programmaticViewRef.current = { lat: settled.lat, lng: settled.lng, zoom: map.getZoom() };
    });
    map.fitBounds(bounds, {
      paddingTopLeft: [44, 96],
      paddingBottomRight: [44, sheetHeight + 32],
      maxZoom: 20,
      animate: hadFit,
      duration: 0.7,
    });
  }, [mapReady, stage, places, selectedKey, sheetHeight]);

  // Keep the sheet's real height in state: at the moment the map screen opens
  // the rows have not been laid out yet, so a one-off measurement is far too
  // small and the pins end up hiding behind the sheet.
  useEffect(() => {
    if (stage !== 'map' || !sheetOpen) {
      setSheetHeight(0);
      return;
    }
    const element = document.getElementById('hc-sheet');
    if (!element) return;
    const measure = () => setSheetHeight(Math.round(element.getBoundingClientRect().height));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [stage, sheetOpen, places.length]);

  // Re-fetch on filter changes/retry; abort stale requests. Supabase is the
  // only pin source, so a failed table simply contributes no rows (the sheet
  // footer reports it) and never blocks the other tables.
  useEffect(() => {
    if (stage !== 'map') return;
    setDbPlaces([]);
    setDbError(false);
    if (!isSupabaseEnabled()) {
      setDbStatus('error');
      return;
    }
    const controller = new AbortController();
    setDbStatus('loading');
    setDbReport([]);
    let pending = selected.length;
    if (pending === 0) {
      setDbStatus('ok');
      return () => controller.abort();
    }
    if (retryTick > 0) resetHelpPlacesSchema();
    // Use whichever Supabase layout the project has: one `help_places` table
    // with a `category` column, or the per-filter `<group>_<category>` tables.
    detectHelpPlacesSchema(controller.signal)
      .then((schema: HelpPlacesSchema) => {
        if (controller.signal.aborted) return;
        selected.forEach(id => {
          fetchSupabaseCategory(id, controller.signal, schema).then(result => {
            if (controller.signal.aborted) return;
            setDbReport(current => [...current, result]);
            if (result.places.length) setDbPlaces(current => [...current, ...result.places]);
            if (result.status === 'missing' || result.status === 'error' || result.status === 'disabled') {
              setDbError(true);
            }
            pending -= 1;
            if (pending === 0) setDbStatus('ok');
          }).catch(() => {
            if (controller.signal.aborted) return;
            setDbError(true);
            pending -= 1;
            if (pending === 0) setDbStatus(prev => (prev === 'loading' ? 'error' : prev));
          });
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setDbError(true);
        setDbStatus('error');
      });
    return () => controller.abort();
  }, [stage, selectedKey, retryTick]);

  useEffect(
    () => () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current);
    },
    [],
  );

  // ---------------------------------------------------------------- actions
  const focusPlace = useCallback(
    (place: Place) => {
      const map = localMapRef.current;
      if (!map) return;
      // Zoom sagad to 19 (max 20) so each tapped row lands pin-centered and readable — user requested "mag zo-zoom in sila"
      programmaticMoveRef.current = true;
      programmaticViewRef.current = { lat: place.coords[0], lng: place.coords[1], zoom: 19 };
      map.flyTo(place.coords, 19, { duration: 0.9, easeLinearity: 0.2 });
      map.once('moveend', () => {
        programmaticMoveRef.current = false;
        const settled = map.getCenter();
        programmaticViewRef.current = { lat: settled.lat, lng: settled.lng, zoom: map.getZoom() };
      });
      const marker = markersRef.current.get(place.id);
      if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current);
      focusTimerRef.current = window.setTimeout(() => marker?.openPopup(), 900);
      // On phones the sheet would cover the pin we just flew to — tuck it away
      // (guarded, because some in-app webviews ship no matchMedia at all).
      const isSmallScreen =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(max-width: 640px), (orientation: portrait)').matches;
      if (isSmallScreen) setSheetOpen(false);
      else setSheetExpanded(false);
    },
    [],
  );

  const handleNearMe = useCallback(() => {
    if (originMode === 'me') {
      setOriginMode('center');
      showToast('Sorted by map center.');
      return;
    }
    if (userCoords) {
      setOriginMode('me');
      showToast('Sorted by distance from you.');
      return;
    }
    if (!navigator.geolocation) {
      showToast('This browser has no location support.');
      return;
    }
    setLocatingMe(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocatingMe(false);
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserCoords(coords);
        setOriginMode('me');
        const map = localMapRef.current;
        if (map) {
          // Same as the host's Locate: this flight must not be clamped back.
          if (lockCameraToBounds) {
            map.setMaxBounds(null as unknown as L.LatLngBounds);
            suppressCameraLockRef.current = true;
            map.once('moveend', () => {
              suppressCameraLockRef.current = false;
            });
          }
          // Same slow fly-in as the host's locate button — this is the view's
          // own "Near me" control, so it must feel identical.
          flyToUserLocation(map, coords);
          if (meMarkerRef.current) {
            meMarkerRef.current.setLatLng(coords);
          } else {
            meMarkerRef.current = new L.Marker(coords, {
              icon: new L.DivIcon({
                className: 'user-location-marker',
                html: '<span class="user-location-dot"></span>',
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              }),
              zIndexOffset: 1000,
              title: 'Your location',
            }).addTo(map);
          }
        }
        showToast('Ready! Sorted by distance from you.');
      },
      () => {
        setLocatingMe(false);
        showToast('Could not get your location. Please allow location access and try again.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, [originMode, userCoords, lockCameraToBounds, showToast]);

  const refreshPins = useCallback(() => {
    setRetryTick((tick) => tick + 1);
    showToast('Refreshing pins from Supabase…');
  }, [showToast]);

  const openMap = useCallback(() => {
    if (selected.length === 0) return;
    rememberedSelection = selected;
    setMapReady(true);
    setStage('map');
  }, [selected]);

  // The picker's X is a "back to the map" button, never an exit from Help
  // Center: even on the very first visit — the Leaflet canvas is not mounted
  // yet and nothing may be ticked — it opens the Help Center map with
  // whatever is currently selected, and with the list sheet closed. Leaving
  // Help Center altogether happens through the host's Layers menu, like the
  // other map views.
  const closePickerToMap = useCallback(() => {
    rememberedSelection = selected;
    // Land on a clean map: the "Selected places" sheet stays closed (only
    // the List pill shows, ready to reopen it). Opening the map on purpose
    // via "Open the map" keeps the sheet up — dismissing should not.
    setSheetOpen(false);
    setSheetExpanded(false);
    setMapReady(true);
    setStage('map');
  }, [selected]);

  const openPicker = useCallback(() => {
    setListQuery('');
    setSheetOpen(true);
    setSheetExpanded(false);
    setStage('picker');
  }, []);

  // ------------------------------------------------------------ sorted list
  const origin = useMemo<[number, number]>(
    () => (originMode === 'me' && userCoords ? userCoords : mapCenter),
    [originMode, userCoords, mapCenter],
  );

  const sortedPlaces = useMemo(() => {
    const needle = listQuery.trim().toLowerCase();
    return places
      .filter((place) => {
        if (!needle) return true;
        const category = CATEGORY_BY_ID[place.category];
        return (
          place.name.toLowerCase().includes(needle) ||
          place.address.toLowerCase().includes(needle) ||
          category.label.toLowerCase().includes(needle)
        );
      })
      .map((place) => ({ place, km: distanceKm(origin, place.coords) }))
      .sort((a, b) => a.km - b.km);
  }, [places, listQuery, origin]);

  // ------------------------------------------------------------------ view
  // One notice slot, exactly like the Traffic page — toasts only. A Supabase
  // fetch failure does not claim the red banner; the sheet footer reports it
  // and the sheet's refresh button refetches.
  const noticeText = toast;

  return (
    <div id="help-center-view" className="absolute inset-0 z-30 bg-white" aria-label="Help Center">
      {dbError && stage === 'map' && (
        <div role="status" className="absolute bottom-24 left-4 right-4 z-[1000] rounded-lg bg-white p-3 text-sm shadow">
          Cannot reach the Supabase location tables, so these filters show no pins. Check the connection, then retry.
          <button type="button" className="ml-2 underline" onClick={() => setRetryTick(t => t + 1)}>Retry</button>
        </div>
      )}
      {mapReady && (
        <div
          id="help-center-map-root"
          ref={containerRef}
          className="block h-full w-full cursor-grab active:cursor-grabbing"
        />
      )}

      {/* Basemap switch — the Traffic view's Street | Satellite card, in the
          same top-right slot, same order, same active styling. Street is the
          Leaflet OpenStreetMap layer; Satellite is the Esri imagery. */}
      {stage === 'map' && (
        <div id="hc-base-switch" role="group" aria-label="Map style">
          {(['streets', 'satellite'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setBasemap(option);
                rememberedBasemap = option;
              }}
              aria-pressed={basemap === option}
              className={basemap === option ? 'active' : undefined}
            >
              {option === 'streets' ? 'Street' : 'Satellite'}
            </button>
          ))}
        </div>
      )}

      {/* Messages: the Traffic page's red notice, over the map — toasts only,
          never the OSM fetch error. */}
      {stage === 'map' && noticeText && <div id="hc-notice">{noticeText}</div>}

      {/* Results sheet — the Traffic route sheet: white card with a grab
          handle, 24px top corners, tabs and rows. */}
      {stage === 'map' && sheetOpen && (
        <div id="hc-sheet" className={sheetExpanded ? 'is-expanded' : undefined}>
          <button
            type="button"
            className="hc-sheet-handle"
            aria-label={sheetExpanded ? 'Collapse the list' : 'Expand the list'}
            title={sheetExpanded ? 'Collapse' : 'Expand'}
            onClick={() => setSheetExpanded((previous) => !previous)}
          />

          <div className="hc-sheet-head">
            <p className="hc-sheet-title">Selected places</p>
            {/* Filter button — the sheet header is now the ONLY way back to
                the picker ("Choose what you want to filter"); the floating
                Filter FAB is gone. */}
            <button
              type="button"
              className="hc-sheet-filter"
              onClick={openPicker}
              title="Filter"
              aria-label="Filter"
            >
              <Filter aria-hidden="true" />
              <span>Filter</span>
            </button>
            {(
              <button
                type="button"
                className="hc-sheet-cb"
                onClick={refreshPins}
                title="Refresh pins"
                aria-label="Refresh pins"
                disabled={dbStatus === 'loading'}
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              className="hc-sheet-cb"
              onClick={() => setSheetOpen(false)}
              title="Close the list"
              aria-label="Close the list"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="hc-sheet-tabs" role="tablist" aria-label="List sorting">
            <button
              type="button"
              role="tab"
              aria-selected={originMode === 'me'}
              className={`hc-sheet-tab${originMode === 'me' ? ' on' : ''}`}
              onClick={handleNearMe}
            >
              {locatingMe && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Near me
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={originMode === 'center'}
              className={`hc-sheet-tab${originMode === 'center' ? ' on' : ''}`}
              onClick={() => setOriginMode('center')}
            >
              Map center
            </button>
          </div>

          {sheetExpanded && (
            <div className="hc-sheet-search">
              <Search className="h-4 w-4 shrink-0 text-[#5f6368]" />
              <input
                value={listQuery}
                onChange={(event) => setListQuery(event.target.value)}
                placeholder="Search the list"
                aria-label="Search the list"
              />
              {listQuery && (
                <button type="button" className="hc-picker-clear" onClick={() => setListQuery('')}>
                  Clear
                </button>
              )}
            </div>
          )}

          <div className="hc-sheet-body custom-scrollbar">
            {sortedPlaces.length === 0 && (
              <div className="hc-sheet-empty">
                {dbStatus === 'loading'
                  ? 'Loading pins from Supabase…'
                  : dbStatus === 'idle'
                    ? 'Pick a category to load pins from the barangay Supabase directory.'
                    : 'No pins saved for these filters yet. Add rows in the Supabase Table Editor, then tap refresh.'}
              </div>
            )}
            {sortedPlaces.map(({ place, km }) => {
              const category = CATEGORY_BY_ID[place.category];
              return (
                <div key={place.id} className="hc-sheet-row">
                  <button
                    type="button"
                    className="hc-sheet-ic"
                    onClick={() => focusPlace(place)}
                    aria-label={`Show ${place.name} on the map`}
                  >
                    {category.code}
                  </button>
                  <button type="button" className="hc-sheet-tx" onClick={() => focusPlace(place)}>
                    <span className="hc-sheet-name">{place.name}</span>
                    <span className="hc-sheet-sub">
                      {category.label} &middot; {place.address}
                    </span>
                  </button>
                  <span className="hc-sheet-km">{formatDistance(km)}</span>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${place.coords[0]},${place.coords[1]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Directions to ${place.name}`}
                    aria-label={`Directions to ${place.name}`}
                    className="hc-sheet-go"
                  >
                    <Navigation className="h-4 w-4" />
                  </a>
                </div>
              );
            })}
          </div>

          <div className="hc-sheet-foot">
            <p>
              {dbError
                ? 'Some Supabase tables could not be reached — showing only the rows that loaded.'
                : 'Locations come from the barangay Supabase directory.'}
              {' Please confirm the location and hours before travelling.'}
            </p>
            {/* Diagnostics: without this an empty Supabase filter looks like a
                broken map. Each row names the table that was read and what it
                answered (rows / empty / missing). */}
            {dbReport.length > 0 && dbReport.some(result => result.status !== 'ok') && (
              <details className="hc-diagnostics">
                <summary>Why no pins?</summary>
                <ul>
                  {dbReport.map(result => (
                    <li key={result.category}>
                      <code>{result.table}</code>
                      {' · '}
                      {CATEGORY_BY_ID[result.category]?.label ?? result.category}
                      {' — '}
                      {result.detail}
                    </li>
                  ))}
                </ul>
                <p>
                  Pins come only from Supabase. Add rows to those tables (or switch
                  the project to a single <code>help_places</code> table with a
                  <code> category</code> column), then tap refresh.
                </p>
              </details>
            )}
            {!sheetExpanded && (
              <button type="button" className="hc-pill" onClick={() => setSheetExpanded(true)}>
                View all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Re-open the list after the user closes it. */}
      {stage === 'map' && !sheetOpen && (
        <div className="absolute bottom-6 right-4 z-[400]">
          <button type="button" className="hc-pill" onClick={() => setSheetOpen(true)}>
            <List className="h-4 w-4" /> List ({sortedPlaces.length})
          </button>
        </div>
      )}

      {/* Step 1 — the picker. The map mounts once it is answered, or when
          the X dismisses it straight onto the map (closePickerToMap). */}
      {stage === 'picker' && (
        <HelpCenterFilterPicker
          selected={selected}
          onToggleCategory={toggleCategory}
          onSetSelection={setSelection}
          onOpenMap={openMap}
          onClose={closePickerToMap}
        />
      )}
    </div>
  );
};
