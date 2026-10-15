import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
  LocateFixed,
  Navigation,
  RefreshCw,
  Search,
  X,
  Zap,
} from 'lucide-react';
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
import { TILE_SERVERS } from '../data/tileServers';
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
 * Session memory (module scope) remembers the last filter selection, the
 * basemap and the Live OSM switch between visits — but the picker still shows
 * every time the view is opened.
 */
let rememberedSelection: PlaceCategoryId[] | null = null;
let rememberedLiveOsm = true;
let rememberedBasemap: 'streets' | 'satellite' = 'satellite';

interface HelpCenterViewProps {
  /** Shared with MapViewer so the host's Recenter button can drive this map. */
  mapRef: React.MutableRefObject<L.Map | null>;
  /** Mirrors the app's "lock camera to Barangay San Jose" setting. */
  lockCameraToBounds?: boolean;
  /** Closes the whole Help Center view (leaves the filter picker). */
  onClose?: () => void;
}

const ALL_CATEGORY_IDS = HELP_CENTER_CATEGORIES.map((category) => category.id);

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
  onClose,
}) => {
  // ------------------------------------------------------------------ state
  const [stage, setStage] = useState<'picker' | 'map'>('picker');
  // The Leaflet canvas is only created once the user has answered the picker,
  // and it stays mounted afterwards (re-opening the picker overlays it) so the
  // map keeps its pan/zoom and pins instead of restarting from scratch.
  const [mapReady, setMapReady] = useState(false);
  const [selected, setSelected] = useState<PlaceCategoryId[]>(() => rememberedSelection ?? []);
  const [liveOsm, setLiveOsm] = useState(rememberedLiveOsm);
  const [basemap, setBasemap] = useState<'streets' | 'satellite'>(rememberedBasemap);
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

  const handleToggleLiveOsm = useCallback(
    (next: boolean) => {
      setLiveOsm(next);
      rememberedLiveOsm = next;
      if (!next) {
        setLivePlaces([]);
        setLiveStatus('idle');
        setLiveMessage('');
      }
    },
    [],
  );

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

  const countByCategory = useMemo(() => {
    const counts: Partial<Record<PlaceCategoryId, number>> = {};
    places.forEach((place) => {
      counts[place.category] = (counts[place.category] ?? 0) + 1;
    });
    return counts;
  }, [places]);

  const liveCount = useMemo(() => places.filter((place) => place.source === 'osm').length, [places]);

  // ------------------------------------------------------------- the map
  useEffect(() => {
    if (!mapReady) return;
    const container = containerRef.current;
    if (!container || localMapRef.current) return;

    const corner1 = L.latLng(SAN_JOSE_BOUNDS[0][0] - 0.015, SAN_JOSE_BOUNDS[0][1] - 0.015);
    const corner2 = L.latLng(SAN_JOSE_BOUNDS[1][0] + 0.015, SAN_JOSE_BOUNDS[1][1] + 0.015);

    const map = L.map(container, {
      center: SAN_JOSE_CENTER,
      zoom: 13,
      minZoom: 12,
      maxZoom: 18,
      maxBounds: lockCameraToBounds ? L.latLngBounds(corner1, corner2) : undefined,
      maxBoundsViscosity: 1.0,
      zoomControl: false,
      attributionControl: true,
    });

    // Native Leaflet zoom buttons — index.css pushes them below the app's
    // floating control stack so all map views line up.
    L.control.zoom({ position: 'topleft' }).addTo(map);

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

  // Basemap (Street / Satellite) — same tiles as the Traffic view's switch.
  useEffect(() => {
    const map = localMapRef.current;
    if (!mapReady || !map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    const tileConfig = TILE_SERVERS[basemap];
    tileLayerRef.current = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      subdomains: tileConfig.subdomains ?? 'abc',
      maxZoom: 19,
      maxNativeZoom: tileConfig.maxNativeZoom,
      className: tileConfig.className,
    }).addTo(map);
  }, [basemap, mapReady]);

  // ---------------------------------------------------------- pin factory
  const iconFor = useCallback((category: PlaceCategory) => {
    const cached = iconCacheRef.current.get(category.id);
    if (cached) return cached;
    const icon = L.divIcon({
      className: 'hc-pin-wrap',
      html: `<div class="hc-pin" style="--hc-c:${category.color}"><span>${category.emoji}</span></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 30],
      popupAnchor: [0, -26],
    });
    iconCacheRef.current.set(category.id, icon);
    return icon;
  }, []);

  const popupHtml = useCallback((place: Place) => {
    const category = CATEGORY_BY_ID[place.category];
    const directions = `https://www.google.com/maps/dir/?api=1&destination=${place.coords[0]},${place.coords[1]}`;
    const rows: string[] = [];
    rows.push(`<p class="mt-2 text-[11px] font-medium leading-snug text-slate-600">${escapeHtml(place.address)}</p>`);
    if (place.hours) {
      rows.push(
        `<p class="mt-1 text-[11px] font-medium text-slate-600"><span class="font-bold text-slate-500">Oras:</span> ${escapeHtml(place.hours)}</p>`,
      );
    }
    if (place.note) {
      rows.push(`<p class="mt-1 text-[11px] text-slate-500">${escapeHtml(place.note)}</p>`);
    }
    if (place.phone) {
      rows.push(
        `<p class="mt-1 text-[11px] font-medium text-slate-600"><span class="font-bold text-slate-500">Telepono:</span> ${escapeHtml(place.phone)}</p>`,
      );
    }
    const badge =
      place.source === 'osm'
        ? '<span class="rounded-full bg-emerald-100 px-1.5 py-[1px] text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">OpenStreetMap</span>'
        : '<span class="rounded-full bg-amber-100 px-1.5 py-[1px] text-[9px] font-extrabold uppercase tracking-wide text-amber-700">Community pin</span>';

    return `
      <div class="p-3">
        <div class="flex items-start gap-2">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[16px]" style="background:${category.color}22">${category.emoji}</span>
          <div class="min-w-0">
            <p class="text-[12.5px] font-bold leading-tight text-slate-900">${escapeHtml(place.name)}</p>
            <p class="mt-[2px] text-[10px] font-bold uppercase tracking-wide" style="color:${category.color}">${escapeHtml(category.label)}</p>
          </div>
        </div>
        ${rows.join('')}
        <div class="mt-2 flex flex-wrap items-center gap-1.5">
          ${badge}
          <a href="${directions}" target="_blank" rel="noopener noreferrer" class="rounded-full bg-[#0b7a87] px-2.5 py-1 text-[10.5px] font-bold text-white no-underline">Directions</a>
          ${place.phone ? `<a href="tel:${escapeHtml(place.phone.replace(/[^\d+]/g, ''))}" class="rounded-full bg-slate-800 px-2.5 py-1 text-[10.5px] font-bold text-white no-underline">Tawagan</a>` : ''}
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
    const group = L.layerGroup().addTo(map);
    markersLayerRef.current = group;
    places.forEach((place) => {
      const category = CATEGORY_BY_ID[place.category];
      if (!category) return;
      const marker = L.marker(place.coords, {
        icon: iconFor(category),
        title: place.name,
        riseOnHover: true,
      });
      marker.bindPopup(popupHtml(place), {
        className: 'custom-leaflet-popup',
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
    if (!mapReady || !liveOsm) return;
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
  }, [mapReady, liveOsm, selectedKey, retryTick]);

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
            meMarkerRef.current = L.marker(coords, {
              icon: L.divIcon({
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

  // The picker opens pre-filled with the previous visit's answer, so the
  // "tuloy sa dating pinili" shortcut simply reflects the current ticks.
  const memoryLabel = useMemo(
    () =>
      selected
        .slice(0, 2)
        .map((id) => CATEGORY_BY_ID[id]?.label ?? id)
        .join(', ')
        .concat(selected.length > 2 ? ` +${selected.length - 2}` : ''),
    [selected],
  );

  const unselectedCount = ALL_CATEGORY_IDS.length - selected.length;

  // ------------------------------------------------------------------ view
  return (
    <div className="absolute inset-0 z-30 bg-slate-900" aria-label="Help Center">
      {mapReady && (
        <div
          id="help-center-map-root"
          ref={containerRef}
          className="block h-full w-full cursor-grab active:cursor-grabbing"
        />
      )}

      {/* Street / Satellite switch — same order and styling as the Traffic map. */}
      {stage === 'map' && (
        <div
          role="group"
          aria-label="Map style"
          className="absolute right-[12px] top-[10px] z-50 flex gap-1 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-md"
        >
          <button
            type="button"
            onClick={() => {
              setBasemap('satellite');
              rememberedBasemap = 'satellite';
            }}
            aria-pressed={basemap === 'satellite'}
            className={`rounded-[5px] border border-transparent px-2.5 py-1 text-[11px] font-bold tracking-[0.02em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              basemap === 'satellite'
                ? 'bg-[#111827] text-white'
                : 'bg-transparent text-[#33413a] hover:bg-[#eef1ec]'
            }`}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => {
              setBasemap('streets');
              rememberedBasemap = 'streets';
            }}
            aria-pressed={basemap === 'streets'}
            className={`rounded-[5px] border border-transparent px-2.5 py-1 text-[11px] font-bold tracking-[0.02em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              basemap === 'streets'
                ? 'bg-[#111827] text-white'
                : 'bg-transparent text-[#33413a] hover:bg-[#eef1ec]'
            }`}
          >
            Street
          </button>
        </div>
      )}

      {/* Category chips — change the filter without leaving the map. */}
      {stage === 'map' && (
        <div className="absolute left-[56px] right-[158px] top-[10px] z-50 sm:right-[172px]">
          <div className="hc-chip-scroll flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white/95 p-1 shadow-md">
            <button
              type="button"
              onClick={openPicker}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#111827] px-2.5 py-1 text-[11px] font-extrabold text-white transition-colors hover:bg-slate-800"
            >
              <Filter className="h-3.5 w-3.5" /> Filter
            </button>
            {selected.map((id) => {
              const category = CATEGORY_BY_ID[id];
              if (!category) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleCategory(id)}
                  title={`Alisin ang ${category.label}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-100"
                  style={{ borderColor: `${category.color}66`, backgroundColor: `${category.color}12` }}
                >
                  <span aria-hidden="true">{category.emoji}</span>
                  {category.label}
                  <span
                    className="rounded-full px-1.5 text-[9.5px] font-extrabold text-white"
                    style={{ backgroundColor: category.color }}
                  >
                    {countByCategory[id] ?? 0}
                  </span>
                  <X className="h-3 w-3 text-slate-400" />
                </button>
              );
            })}
            {unselectedCount > 0 && (
              <button
                type="button"
                onClick={() => setSelection(ALL_CATEGORY_IDS)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2 py-1 text-[11px] font-bold text-slate-500 transition-colors hover:bg-slate-100"
              >
                + Iba pa ({unselectedCount})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Live OSM status / retry pill */}
      {stage === 'map' && (
        <div className="absolute right-[12px] top-[52px] z-50 flex flex-col items-end gap-1.5">
          {liveOsm && liveStatus === 'loading' && (
            <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-[10.5px] font-bold text-slate-600 shadow-md">
              <Loader2 className="h-3 w-3 animate-spin text-blue-600" /> Hinahanap ang live OSM pins…
            </span>
          )}
          {liveOsm && liveStatus === 'ok' && liveCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/95 py-1 pl-2.5 pr-1 text-[10.5px] font-bold text-emerald-700 shadow-md">
              <Zap className="h-3 w-3" /> {liveCount} live na pin
              <button
                type="button"
                title="I-refresh ang live OSM pins"
                aria-label="I-refresh ang live OSM pins"
                onClick={refreshLivePins}
                className="grid h-5 w-5 place-items-center rounded-full border border-emerald-200 bg-white text-emerald-700 transition-colors hover:bg-emerald-50"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </span>
          )}
          {liveOsm && liveStatus === 'error' && (
            <button
              type="button"
              onClick={refreshLivePins}
              className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-white/95 px-2.5 py-1 text-[10.5px] font-bold text-amber-700 shadow-md hover:bg-amber-50"
            >
              <AlertTriangle className="h-3 w-3" /> Subukan ulit ang live OSM
            </button>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute left-1/2 top-[54px] z-[55] w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 text-center text-[11.5px] font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Results sheet — the "list" side of the directory map. */}
      {stage === 'map' && sheetOpen && (
        <div
          className={`absolute z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur ${
            sheetExpanded
              ? 'inset-x-0 bottom-0 max-h-[62vh] rounded-b-none sm:inset-x-auto sm:bottom-6 sm:left-3 sm:max-h-[64vh] sm:w-[360px] sm:rounded-2xl'
              : 'bottom-3 left-3 right-3 max-h-[38vh] sm:bottom-6 sm:left-3 sm:right-auto sm:max-h-[46vh] sm:w-[360px]'
          }`}
        >
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-900 text-[11px] font-extrabold text-white">
              {sortedPlaces.length}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-extrabold text-slate-800">Mga lugar sa filter</p>
              <p className="truncate text-[10px] font-medium text-slate-500">
                {originMode === 'me' ? 'Pinakamalapit sa iyo' : 'Pinakamalapit sa gitna ng mapa'}
                {liveCount > 0 ? ` · ${liveCount} live OSM` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={handleNearMe}
              title="I-sort ayon sa layo mula sa akin"
              aria-pressed={originMode === 'me'}
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors ${
                originMode === 'me'
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {locatingMe ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setSheetExpanded((value) => !value)}
              title={sheetExpanded ? 'Paliitin' : 'Palakihin'}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
            >
              {sheetExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              title="Isara ang listahan"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {(sheetExpanded || places.length > 6) && (
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                value={listQuery}
                onChange={(event) => setListQuery(event.target.value)}
                placeholder="Hanapin sa listahan… (hal. 7-Eleven, water)"
                className="h-6 w-full bg-transparent text-[11.5px] font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
              {listQuery && (
                <button
                  type="button"
                  onClick={() => setListQuery('')}
                  className="text-[10.5px] font-bold text-slate-400 hover:text-slate-700"
                >
                  Burahin
                </button>
              )}
            </div>
          )}

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
            {sortedPlaces.length === 0 && (
              <div className="px-3 py-6 text-center">
                <p className="text-[12px] font-bold text-slate-700">
                  {liveStatus === 'loading' ? 'Naghahanap pa ng mga pin…' : 'Walang tumugmang lugar'}
                </p>
                <p className="mt-1 text-[10.5px] text-slate-500">
                  Subukan ang ibang filter o i-tap ang “Filter” sa taas.
                </p>
              </div>
            )}
            {sortedPlaces.map(({ place, km }) => {
              const category = CATEGORY_BY_ID[place.category];
              return (
                <div
                  key={place.id}
                  className="flex items-center gap-2 border-b border-slate-50 px-3 py-2 last:border-b-0 hover:bg-slate-50"
                >
                  <button
                    type="button"
                    onClick={() => focusPlace(place)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[15px]"
                      style={{ backgroundColor: `${category.color}1f` }}
                      aria-hidden="true"
                    >
                      {category.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-bold text-slate-800">{place.name}</span>
                      <span className="block truncate text-[10.5px] font-medium text-slate-500">
                        {category.label} · {place.address}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10.5px] font-extrabold text-slate-500">
                      {formatDistance(km)}
                    </span>
                  </button>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${place.coords[0]},${place.coords[1]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Direksyon papuntang ${place.name}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-[#0b7a87] transition-colors hover:bg-slate-100"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                  </a>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-1.5">
            <p className="min-w-0 flex-1 truncate text-[9.5px] font-medium leading-snug text-slate-400">
              {liveMessage ||
                'Community-mapped ang ilang pin — paki-verify bago pumunta. Live pins © OpenStreetMap contributors.'}
            </p>
            {!sheetExpanded && (
              <button
                type="button"
                onClick={() => setSheetExpanded(true)}
                className="shrink-0 rounded-lg bg-slate-900 px-2 py-1 text-[10.5px] font-bold text-white"
              >
                Tingnan lahat
              </button>
            )}
          </div>
        </div>
      )}

      {/* Re-open the list after the user closes it. */}
      {stage === 'map' && !sheetOpen && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="absolute bottom-4 left-3 z-50 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-[11.5px] font-extrabold text-slate-800 shadow-lg backdrop-blur"
        >
          <Filter className="h-3.5 w-3.5" /> Listahan ({sortedPlaces.length})
        </button>
      )}

      {/* Right-hand stack — mirrors the Traffic map's control column. */}
      {stage === 'map' && (
        <div
          className={`absolute right-[12px] bottom-6 z-50 flex flex-col items-end gap-2.5 portrait:bottom-14 ${
            sheetOpen ? 'portrait:hidden' : ''
          }`}
        >
          <button
            type="button"
            title="3D"
            aria-label="3D"
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-[14px] border border-gray-400 bg-white p-0 shadow-md transition-transform hover:shadow-lg active:scale-[.94] focus-visible:outline-2 focus-visible:outline-gray-500"
          >
            <span className="text-[15px] font-extrabold leading-none text-black">3D</span>
          </button>

          <button
            type="button"
            title="Find location"
            aria-label="Find location"
            onClick={handleNearMe}
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-[14px] border border-gray-400 bg-white p-0 shadow-md transition-transform hover:shadow-lg active:scale-[.94] focus-visible:outline-2 focus-visible:outline-gray-500"
          >
            <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="block h-6 w-6">
              <defs>
                <mask id="hc-find-location-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
                  <rect width="512" height="512" fill="#fff" />
                  <circle cx="385" cy="385" r="96" fill="#000" />
                  <line x1="440" y1="440" x2="488" y2="488" stroke="#000" strokeWidth="64" strokeLinecap="round" />
                </mask>
              </defs>
              <g fill="#000" mask="url(#hc-find-location-cut)">
                <path d="M18 78 Q18 38 54 42 L158 78 L158 492 L18 442 Z" />
                <path d="M187 78 L297 20 L297 438 L187 492 Z" />
                <path d="M327 20 L440 62 Q467 72 467 100 L467 440 L327 492 Z" />
              </g>
              <circle cx="385" cy="385" r="62" fill="none" stroke="#000" strokeWidth="26" />
              <line x1="440" y1="440" x2="488" y2="488" stroke="#000" strokeWidth="26" strokeLinecap="round" />
            </svg>
          </button>

          <button
            type="button"
            title="Directions"
            aria-label="Directions"
            onClick={() => {
              const center = localMapRef.current?.getCenter();
              const lat = center ? center.lat : SAN_JOSE_CENTER[0];
              const lng = center ? center.lng : SAN_JOSE_CENTER[1];
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
                '_blank',
                'noopener,noreferrer',
              );
            }}
            className="h-12 w-12 cursor-pointer rounded-[14px] border-0 bg-[#0b7a87] p-0 shadow-md transition-transform hover:shadow-lg active:scale-[.94] focus-visible:outline-2 focus-visible:outline-white"
          >
            <svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="block h-full w-full">
              <rect x="17" y="17" width="22" height="22" rx="3.5" transform="rotate(45 28 28)" fill="#ffffff" />
              <path d="M23.5 34v-6.5a3 3 0 0 1 3-3H31" fill="none" stroke="#0b7a87" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M30.5 19.8L36 24.5l-5.5 4.7z" fill="#0b7a87" transform="translate(-0.5 0)" />
            </svg>
          </button>

          <div className="rounded-lg border border-[#d8d2c2] bg-[#f6f3ea]/95 px-3 py-2.5 text-[12.5px] text-[#1b2a2f] shadow-md">
            <div aria-hidden="true" className="flex h-0 items-center gap-1.5 overflow-hidden">
              <span className="inline-block h-[13px] w-[13px] rounded-[2px]" style={{ background: '#000000' }} />
              Medium (0.5–1.5m)
            </div>
            <div className="my-[3px] flex items-center gap-1.5">
              <span className="inline-block h-[13px] w-[13px] rounded-[2px]" style={{ background: '#000000' }} />
              3D
            </div>
            <div className="my-[3px] flex items-center gap-1.5">
              <span className="inline-block h-[13px] w-[13px] rounded-[2px]" style={{ background: '#000000' }} />
              Directions
            </div>
            <div className="my-[3px] flex items-center gap-1.5">
              <span className="inline-block h-[13px] w-[13px] rounded-[2px]" style={{ background: '#000000' }} />
              Find
            </div>
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
          liveOsm={liveOsm}
          onToggleLiveOsm={handleToggleLiveOsm}
          onClose={() => onClose?.()}
          hasMemory={selected.length > 0 && memoryLabel.length > 0}
          memoryLabel={memoryLabel}
        />
      )}
    </div>
  );
};
