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
 * Overpass mirrors, tried in order. A single public endpoint is often "at
 * capacity" (HTTP 502) — the loader walks the list so live pins still arrive.
 */
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

/** Runs one Overpass query against the mirrors, with a per-attempt timeout. */
async function fetchOverpassElements(queryText: string, outerSignal: AbortSignal): Promise<never[]> {
  let lastError: unknown = new Error('Overpass unavailable');
  for (const endpoint of OVERPASS_ENDPOINTS) {
    if (outerSignal.aborted) throw new DOMException('Aborted', 'AbortError');
    const attempt = new AbortController();
    const onOuterAbort = () => attempt.abort();
    outerSignal.addEventListener('abort', onOuterAbort);
    const timeout = window.setTimeout(() => attempt.abort(), 15000);
    try {
      const response = await fetch(`${endpoint}?data=${encodeURIComponent(queryText)}`, {
        signal: attempt.signal,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as { elements?: unknown[] };
      return Array.isArray(payload?.elements) ? (payload.elements as never[]) : [];
    } catch (error) {
      if (outerSignal.aborted) throw new DOMException('Aborted', 'AbortError');
      lastError = error;
    } finally {
      window.clearTimeout(timeout);
      outerSignal.removeEventListener('abort', onOuterAbort);
    }
  }
  throw lastError;
}

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

  // ------------------------------------------------------------------ refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const localMapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const iconCacheRef = useRef<Map<PlaceCategoryId, L.DivIcon>>(new Map());
  const liveCacheRef = useRef<Map<PlaceCategoryId, Place[]>>(new Map());
  const meMarkerRef = useRef<L.Marker | null>(null);
  const toastTimerRef = useRef<number | null>(null);

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

  const liveCount = useMemo(() => places.filter((place) => place.source === 'osm').length, [places]);

  // ------------------------------------------------------------- the map
  useEffect(() => {
    if (!mapReady) return;
    const container = containerRef.current;
    if (!container || localMapRef.current) return;

    const corner1 = new L.LatLng(SAN_JOSE_BOUNDS[0][0] - 0.015, SAN_JOSE_BOUNDS[0][1] - 0.015);
    const corner2 = new L.LatLng(SAN_JOSE_BOUNDS[1][0] + 0.015, SAN_JOSE_BOUNDS[1][1] + 0.015);

    const map = new L.Map(container, {
      center: SAN_JOSE_CENTER,
      zoom: 13,
      minZoom: 12,
      maxZoom: 18,
      maxBounds: lockCameraToBounds ? new L.LatLngBounds(corner1, corner2) : undefined,
      maxBoundsViscosity: 1.0,
      zoomControl: false,
      attributionControl: true,
    });

    // Native Leaflet zoom buttons — index.css pushes them below the app's
    // floating control stack so all map views line up.
    new L.Control.Zoom({ position: 'topleft' }).addTo(map);

    map.on('moveend', () => {
      const center = map.getCenter();
      setMapCenter([center.lat, center.lng]);
    });
    const sizeTimer = window.setTimeout(() => map.invalidateSize(), 0);

    localMapRef.current = map;
    mapRef.current = map;

    return () => {
      window.clearTimeout(sizeTimer);
      markersRef.current.clear();
      markersLayerRef.current = null;
      meMarkerRef.current = null;
      tileLayerRef.current = null;
      if (mapRef.current === map) mapRef.current = null;
      map.remove();
      localMapRef.current = null;
    };
  }, [mapReady, lockCameraToBounds, mapRef]);

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
    if (place.hours) rows.push(`<p class="mt-1 text-[12.5px] text-[#5f6368]">Oras: ${escapeHtml(place.hours)}</p>`);
    if (place.note) rows.push(`<p class="mt-1 text-[11.5px] text-[#5f6368]">${escapeHtml(place.note)}</p>`);
    if (place.phone) rows.push(`<p class="mt-1 text-[12.5px] text-[#5f6368]">Telepono: ${escapeHtml(place.phone)}</p>`);

    return `
      <div class="p-3">
        <div class="flex items-start gap-2.5">
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
          ${phoneDigits ? `<a href="tel:${escapeHtml(phoneDigits)}" class="hc-popup-btn">Tawagan</a>` : ''}
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

  // ---------------------------------------------------------- live OSM data
  const syncLiveFromCache = useCallback(() => {
    const cached = liveCacheRef.current;
    const list = selected
      .filter((id) => cached.has(id))
      .flatMap((id) => cached.get(id) ?? []);
    setLivePlaces(list);
  }, [selected]);

  useEffect(() => {
    if (!mapReady) return;
    const cache = liveCacheRef.current;
    const missing = selected.filter((id) => !cache.has(id));
    if (missing.length === 0) {
      syncLiveFromCache();
      const cachedCount = selected.reduce((total, id) => total + (cache.get(id)?.length ?? 0), 0);
      setLiveStatus(cachedCount > 0 ? 'ok' : 'idle');
      return;
    }
    const query = buildOverpassQuery(missing);
    if (!query) {
      syncLiveFromCache();
      return;
    }

    const controller = new AbortController();
    setLiveStatus('loading');

    const timer = window.setTimeout(async () => {
      try {
        // Mirrors sometimes reject the capped query shape, so try the plain
        // one before giving up on live data.
        let elements: never[];
        try {
          elements = await fetchOverpassElements(query, controller.signal);
        } catch (firstError) {
          if ((firstError as Error)?.name === 'AbortError') throw firstError;
          const fallback = buildOverpassQuery(missing, false);
          if (!fallback) throw firstError;
          elements = await fetchOverpassElements(fallback, controller.signal);
        }
        const mapped = osmElementsToPlaces(elements, selected);
        missing.forEach((id) => cache.set(id, mapped.filter((place) => place.category === id)));
        syncLiveFromCache();
        setLiveStatus('ok');
        setLiveMessage(
          mapped.length > 0
            ? `${mapped.length} live na pin mula sa OpenStreetMap`
            : 'Walang karagdagang live pin na nahanap — community pins lang muna',
        );
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return;
        setLiveStatus('error');
        setLiveMessage('Hindi maabot ang OpenStreetMap (Overpass) — community pins lang muna ang nasa mapa.');
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, selectedKey, retryTick]);

  useEffect(
    () => () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
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
      window.setTimeout(() => marker?.openPopup(), 680);
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
      showToast('Naka-sort na ayon sa gitna ng mapa.');
      return;
    }
    if (userCoords) {
      setOriginMode('me');
      showToast('Naka-sort na ayon sa layo mula sa iyo.');
      return;
    }
    if (!navigator.geolocation) {
      showToast('Walang location support ang browser na ito.');
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
        showToast('Handa na! Naka-sort na ayon sa layo mula sa iyo.');
      },
      () => {
        setLocatingMe(false);
        showToast('Hindi makuha ang lokasyon. Paki-allow ang location access at subukan ulit.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, [originMode, userCoords, lockCameraToBounds, showToast]);

  const refreshLivePins = useCallback(() => {
    liveCacheRef.current.clear();
    setLiveStatus('loading');
    setRetryTick((tick) => tick + 1);
    showToast('Ni-refresh ang live OSM pins…');
  }, [showToast]);

  const openMap = useCallback(() => {
    rememberedSelection = selected;
    setMapReady(true);
    setStage('map');
  }, [selected]);

  const openPicker = useCallback(() => {
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
  const osmNotice = !trafficNotice && liveStatus === 'error';
  const noticeText = toast
    ? toast
    : trafficNotice
      ? 'Live traffic: hindi ma-load ngayon — subukan ulit.'
      : osmNotice
        ? 'Hindi maabot ang OpenStreetMap — subukan ulit.'
        : '';
  const noticeAction = toast
    ? undefined
    : trafficNotice
      ? () => setTrafficTilesFailed(false)
      : osmNotice
        ? refreshLivePins
        : undefined;

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
            aria-label={sheetExpanded ? 'Iliitan ang listahan' : 'Palakihin ang listahan'}
            title={sheetExpanded ? 'Iliitan' : 'Palakihin'}
            onClick={() => setSheetExpanded((previous) => !previous)}
          />

          <div className="hc-sheet-head">
            <p className="hc-sheet-title">Mga lugar na pinili</p>
            <span className="hc-sheet-count">{sortedPlaces.length}</span>
            {liveStatus === 'ok' && liveCount > 0 && (
              <button
                type="button"
                className="hc-sheet-cb"
                onClick={refreshLivePins}
                title="I-refresh ang live OSM pins"
                aria-label="I-refresh ang live OSM pins"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              className="hc-sheet-cb"
              onClick={() => setSheetOpen(false)}
              title="Isara ang listahan"
              aria-label="Isara ang listahan"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="hc-sheet-tabs" role="tablist" aria-label="Ayos ng listahan">
            <button
              type="button"
              role="tab"
              aria-selected={originMode === 'me'}
              className={`hc-sheet-tab${originMode === 'me' ? ' on' : ''}`}
              onClick={handleNearMe}
            >
              {locatingMe && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Malapit sa akin
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={originMode === 'center'}
              className={`hc-sheet-tab${originMode === 'center' ? ' on' : ''}`}
              onClick={() => setOriginMode('center')}
            >
              Gitna ng mapa
            </button>
          </div>

          {sheetExpanded && (
            <div className="hc-sheet-search">
              <Search className="h-4 w-4 shrink-0 text-[#5f6368]" />
              <input
                value={listQuery}
                onChange={(event) => setListQuery(event.target.value)}
                placeholder="Hanapin sa listahan"
                aria-label="Hanapin sa listahan"
              />
              {listQuery && (
                <button type="button" className="hc-picker-clear" onClick={() => setListQuery('')}>
                  Burahin
                </button>
              )}
            </div>
          )}

          <div className="hc-sheet-body custom-scrollbar">
            {sortedPlaces.length === 0 && (
              <div className="hc-sheet-empty">
                {liveStatus === 'loading'
                  ? 'Naghahanap pa ng mga pin…'
                  : 'Walang tumugmang lugar. Subukan ang ibang filter o i-tap ang “Filter” sa taas.'}
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
                    aria-label={`Ipakita sa mapa ang ${place.name}`}
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
                    title={`Direksyon papuntang ${place.name}`}
                    aria-label={`Direksyon papuntang ${place.name}`}
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
              {liveMessage ||
                'Community-mapped ang ilang pin — paki-verify bago pumunta. Live pins: OpenStreetMap.'}
            </p>
            {!sheetExpanded && (
              <button type="button" className="hc-pill" onClick={() => setSheetExpanded(true)}>
                Tingnan lahat
              </button>
            )}
          </div>
        </div>
      )}

      {/* Re-open the list after the user closes it. */}
      {stage === 'map' && !sheetOpen && (
        <div className="absolute bottom-6 left-4 z-[400]">
          <button type="button" className="hc-pill" onClick={() => setSheetOpen(true)}>
            <List className="h-4 w-4" /> Listahan ({sortedPlaces.length})
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

          <div id="hc-legend">
            {LEGEND_ROWS.map((row) => (
              <div key={row.label} className="row">
                <span className="sw" style={{ background: row.color }} />
                {row.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1 — the picker. The map only mounts after this is answered. */}
      {stage === 'picker' && (
        <HelpCenterFilterPicker
          selected={selected}
          onToggleCategory={toggleCategory}
          onSetSelection={setSelection}
          onOpenMap={openMap}
        />
      )}
    </div>
  );
};
