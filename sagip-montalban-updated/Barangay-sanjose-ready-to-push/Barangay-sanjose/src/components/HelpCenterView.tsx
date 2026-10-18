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
import { fetchOverpassElements } from '../services/helpCenterService';
import { HelpCenterFilterPicker } from './HelpCenterFilterPicker';
import {
  CATEGORY_BY_ID,
  HELP_CENTER_CATEGORIES,
  HELP_CENTER_PLACES,
  buildOverpassQuery,
  distanceKm,
  formatDistance,
  mergePlaces,
  osmElementsToPlaces,
  type Place,
  type PlaceCategory,
  type PlaceCategoryId,
} from '../data/helpCenterPlaces';
import { TILE_SERVERS, TRAFFIC_TILE_SERVERS } from '../data/tileServers';
import { SAN_JOSE_BOUNDS, SAN_JOSE_CENTER } from '../data/geoData';

/**
 * HELP CENTER — the "Traffic-style" directory map
 * ------------------------------------------------
 * Same shell as the Traffic view (full-map Leaflet layer, Street/Satellite
 * switch, floating right-hand controls), but instead of live traffic it is a
 * filterable directory of the barangay:
 *
 *   1. The view opens with a PICKER — the user answers first ("7-Eleven?
 *      botika? water? ATM?") and nothing else happens until they do.
 *   2. Only then does the Leaflet map mount with pins for exactly the chosen
 *      categories, plus chips up top to change the filter without leaving.
 *   3. "Live OSM" pulls real OpenStreetMap pins (Overpass API) on top of the
 *      curated community list; if the network is blocked the curated pins
 *      stay and a retry hint appears instead of an empty map.
 *
 * The whole view is monochrome by design: white/black interface, grayscale
 * basemaps (satellite included) and black pins stamped with the category's
 * cartographic code, so nothing here reads as generated decoration.
 *
 * Session memory (module scope) remembers the last filter selection, the
 * basemap and the Live OSM switch between visits — but the picker still shows
 * every time the view is opened.
 */
let rememberedSelection: PlaceCategoryId[] | null = null;
// Street is the default (like the Traffic view) so the live-traffic colouring
// is visible the moment the map opens; Street carries the traffic raster
// unless its tiles fail, and then the view falls back to plain OSM streets.
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
}

const ALL_CATEGORY_IDS = HELP_CENTER_CATEGORIES.map((category) => category.id);

/** The Traffic view's legend, row for row: same wording, same swatches. */
const LEGEND_ROWS = [
  { color: '#2BC82B', label: 'Free flowing' },
  { color: '#F1BF40', label: 'Slow traffic' },
  { color: '#CC0704', label: 'Heavy congestion' },
  { color: '#7A1F1B', label: 'Road closed' },
] as const;

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
  // Live traffic raster instead of plain streets (Traffic's own layer), with a
  // one-shot fallback if those tiles cannot be fetched.
  const [trafficTilesFailed, setTrafficTilesFailed] = useState(false);
  const [livePlaces, setLivePlaces] = useState<Place[]>([]);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [liveMessage, setLiveMessage] = useState('');
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
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const iconCacheRef = useRef<Map<PlaceCategoryId, L.DivIcon>>(new Map());
  const liveCacheRef = useRef<Map<PlaceCategoryId, Place[]>>(new Map());
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
  const curatedPlaces = useMemo(
    () => HELP_CENTER_PLACES.filter((place) => selectedSet.has(place.category)),
    [selectedSet],
  );

  const places = useMemo(() => {
    const live = livePlaces.filter((place) => selectedSet.has(place.category));
    // mergePlaces([], live) first collapses OSM duplicates (node + way),
    // then merges the curated community rows on top.
    return mergePlaces(curatedPlaces, mergePlaces([], live));
  }, [curatedPlaces, livePlaces, selectedSet]);

  // ------------------------------------------------------------- the map
  useEffect(() => {
    if (!mapReady) return;
    const container = containerRef.current;
    if (!container || localMapRef.current) return;

    const map = new L.Map(container, {
      center: SAN_JOSE_CENTER,
      zoom: 13,
      minZoom: 12,
      maxZoom: 18,
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
      if (cameraLockRef.current && !programmaticMoveRef.current) {
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
      tileLayerRef.current = null;
      if (mapRef.current === map) mapRef.current = null;
      map.remove();
      localMapRef.current = null;
    };
  }, [mapReady, mapRef]);

  // Basemap (Street / Satellite) + the live-traffic layer, mirroring the
  // Traffic view: in Street mode the traffic raster is the basemap; Satellite
  // keeps the imagery. If the traffic tiles cannot be fetched the view falls
  // back to the plain street basemap and says so in the legend.
  useEffect(() => {
    const map = localMapRef.current;
    if (!mapReady || !map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    const withLiveTraffic = !trafficTilesFailed && basemap === 'streets';
    const tileConfig = withLiveTraffic ? TRAFFIC_TILE_SERVERS.streetTraffic : TILE_SERVERS[basemap];
    const layer = new L.TileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      subdomains: tileConfig.subdomains ?? 'abc',
      maxZoom: 19,
      maxNativeZoom: tileConfig.maxNativeZoom,
      className: tileConfig.className,
    });
    if (withLiveTraffic) layer.on('tileerror', () => setTrafficTilesFailed(true));
    layer.addTo(map);
    tileLayerRef.current = layer;
  }, [basemap, mapReady, trafficTilesFailed]);

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
        <div class="hc-popup-meta">${place.source === 'osm' ? 'SOURCE: OPENSTREETMAP' : 'SOURCE: COMMUNITY PIN'}</div>
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
    // A wider box from the live OSM batch must not snatch the camera back.
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
      maxZoom: 16,
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

  // ---------------------------------------------------------- live OSM data
  const syncLiveFromCache = useCallback(() => {
    const cached = liveCacheRef.current;
    const list = selected
      .filter((id) => cached.has(id))
      .flatMap((id) => cached.get(id) ?? []);
    setLivePlaces(list);
  }, [selected]);

  useEffect(() => {
    if (!mapReady || stage !== 'map') return;
    const cache = liveCacheRef.current;
    const missing = selected.filter((id) => !cache.has(id));
    if (missing.length === 0) {
      syncLiveFromCache();
      const cachedCount = selected.reduce((total, id) => total + (cache.get(id)?.length ?? 0), 0);
      setLiveStatus('ok');
      setLiveMessage(cachedCount ? `${cachedCount} live pins from OpenStreetMap` : 'No extra live pins found — community pins only for now');
      return;
    }
    const query = buildOverpassQuery(missing);
    if (!query) {
      syncLiveFromCache();
      return;
    }

    const controller = new AbortController();
    setLiveStatus('loading');
    setLiveMessage('Loading live places from OpenStreetMap…');
    syncLiveFromCache();

    const timer = window.setTimeout(async () => {
      try {
        const elements = await fetchOverpassElements(query, controller.signal);
        if (controller.signal.aborted) return;
        const mapped = osmElementsToPlaces(elements, missing);
        missing.forEach((id) => cache.set(id, mapped.filter((place) => place.category === id)));
        syncLiveFromCache();
        setLiveStatus('ok');
        setLiveMessage(
          mapped.length > 0
            ? `${mapped.length} live pins from OpenStreetMap`
            : 'No extra live pins found — community pins only for now',
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        setLiveStatus('error');
        setLiveMessage('Cannot reach OpenStreetMap (Overpass) — showing community pins only.');
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, stage, selectedKey, retryTick]);

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
      map.flyTo(place.coords, Math.max(map.getZoom(), 17), { duration: 0.8, easeLinearity: 0.25 });
      const marker = markersRef.current.get(place.id);
      if (focusTimerRef.current) window.clearTimeout(focusTimerRef.current);
      focusTimerRef.current = window.setTimeout(() => marker?.openPopup(), 850);
      // On phones the sheet would cover the pin we just flew to — tuck it away
      // (guarded, because some in-app webviews ship no matchMedia at all).
      const isSmallScreen =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(max-width: 640px), (orientation: portrait)').matches;
      if (isSmallScreen) setSheetOpen(false);
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
          if (lockCameraToBounds) map.setMaxBounds(null as unknown as L.LatLngBounds);
          map.flyTo(coords, 16, { duration: 1.2, easeLinearity: 0.25 });
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

  const refreshLivePins = useCallback(() => {
    liveCacheRef.current.clear();
    setLiveStatus('loading');
    setRetryTick((tick) => tick + 1);
    showToast('Refreshing live OSM pins…');
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
  // One notice slot, exactly like the Traffic page: the toast, then the two
  // conditions the driver can actually act on.
  const trafficNotice = basemap === 'streets' && trafficTilesFailed;
  const osmNotice = liveStatus === 'error';
  const noticeText = toast || (osmNotice ? 'Cannot reach OpenStreetMap — try again.' : '');
  const noticeAction = !toast && osmNotice ? refreshLivePins : undefined;

  const openDirections = useCallback(() => {
    const center = localMapRef.current?.getCenter();
    const lat = center ? center.lat : SAN_JOSE_CENTER[0];
    const lng = center ? center.lng : SAN_JOSE_CENTER[1];
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      '_blank',
      'noopener,noreferrer',
    );
  }, []);

  // The Filter FAB, positioned the way the Traffic page positions its own
  // floating map buttons: a child of the results sheet, 64px above its top
  // edge at the right (#rt-locate / #rt-layers2 in rizal_traffic_map.html).
  // With the sheet closed it rides the right-hand stack instead, so it is
  // never out of reach.
  const filterFab = (
    <button
      type="button"
      id="hc-filter-btn"
      className="hc-filter-fab"
      onClick={openPicker}
      title="Filter"
      aria-label="Filter"
    >
      <Filter />
    </button>
  );

  return (
    <div id="help-center-view" className="absolute inset-0 z-30 bg-white" aria-label="Help Center">
      {mapReady && (
        <div
          id="help-center-map-root"
          ref={containerRef}
          className="block h-full w-full cursor-grab active:cursor-grabbing"
        />
      )}

      {/* Basemap switch — the Traffic view's Street | Satellite card, in the
          same top-right slot, same order, same active styling. Street carries
          the live traffic raster. */}
      {stage === 'map' && (
        <div id="hc-base-switch" role="group" aria-label="Map style">
          {(['streets', 'satellite'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setBasemap(option);
                rememberedBasemap = option;
                // Coming back to Street should try the traffic tiles again.
                setTrafficTilesFailed(false);
              }}
              aria-pressed={basemap === option}
              className={basemap === option ? 'active' : undefined}
            >
              {option === 'streets' ? 'Street' : 'Satellite'}
            </button>
          ))}
        </div>
      )}

      {/* Messages: the Traffic page's red notice, over the map. */}
      {stage === 'map' &&
        noticeText &&
        (noticeAction ? (
          <button type="button" id="hc-notice" className="is-action" onClick={noticeAction}>
            {noticeText}
          </button>
        ) : (
          <div id="hc-notice">{noticeText}</div>
        ))}

      {/* Results sheet — the Traffic route sheet: white card with a grab
          handle, 24px top corners, tabs and rows. */}
      {stage === 'map' && sheetOpen && (
        <div id="hc-sheet" className={sheetExpanded ? 'is-expanded' : undefined}>
          {filterFab}

          <button
            type="button"
            className="hc-sheet-handle"
            aria-label={sheetExpanded ? 'Collapse the list' : 'Expand the list'}
            title={sheetExpanded ? 'Collapse' : 'Expand'}
            onClick={() => setSheetExpanded((previous) => !previous)}
          />

          <div className="hc-sheet-head">
            <p className="hc-sheet-title">Selected places</p>
            <span className="hc-sheet-count">{sortedPlaces.length}</span>
            {(
              <button
                type="button"
                className="hc-sheet-cb"
                onClick={refreshLivePins}
                title="Refresh live OSM pins"
                aria-label="Refresh live OSM pins"
                disabled={liveStatus === 'loading'}
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
                {liveStatus === 'loading'
                  ? 'Searching for pins…'
                  : 'No matching places. Try another filter, or tap “Filter” above.'}
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
              {liveMessage || 'Community pins are approximate — please verify before you go.'}
              {trafficNotice && ' Traffic unavailable; showing the street map.'}
              {' Community locations/hours are unverified; confirm before travelling.'}
            </p>
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
        <div className="absolute bottom-6 left-4 z-[400]">
          <button type="button" className="hc-pill" onClick={() => setSheetOpen(true)}>
            <List className="h-4 w-4" /> List ({sortedPlaces.length})
          </button>
        </div>
      )}

      {/* Right-hand stack — the Traffic view's Directions button above the
          four-swatch legend, same sizes and same slot. */}
      {stage === 'map' && (
        <div id="hc-legend-stack" className={sheetOpen ? 'hc-under-sheet' : undefined}>
          {!sheetOpen && filterFab}
          <button
            type="button"
            id="hc-directions-btn"
            title="Directions"
            aria-label="Directions"
            onClick={openDirections}
          >
            <svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="17" y="17" width="22" height="22" rx="3.5" transform="rotate(45 28 28)" fill="#ffffff" />
              <path
                d="M23.5 34v-6.5a3 3 0 0 1 3-3H31"
                fill="none"
                stroke="#0b7a87"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M30.5 19.8L36 24.5l-5.5 4.7z" fill="#0b7a87" transform="translate(-0.5 0)" />
            </svg>
          </button>

          {/* Same four-swatch legend in Street mode while the live-traffic
              raster is up, and now also in Satellite mode so the imagery view
              carries the same key as the rest of the app. */}
          {(basemap === 'satellite' || (basemap === 'streets' && !trafficTilesFailed)) && (
            <div id="hc-legend">
              {LEGEND_ROWS.map((row) => (
                <div key={row.label} className="row">
                  <span className="sw" style={{ background: row.color }} />
                  {row.label}
                </div>
              ))}
            </div>
          )}
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
