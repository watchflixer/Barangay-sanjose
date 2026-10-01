# Traffic Directions: coverage, accuracy and Google setup

## What is (and is not) available

The destination field is **not restricted to the local list**. It queries live
providers for the user's search. It can return places outside Barangay San Jose,
Rizal and the Philippines. Proximity prefers nearby matches; it is not a country
or municipal boundary restriction. The map itself can also pan worldwide.

No finite list, and no provider integration, can honestly guarantee **every
consumer Google Maps result** or an accurate house/entrance pin for every address.
Google Maps, Google's developer APIs, Mapbox and OSM differ in indexing and
coverage. Result counts are limited by each provider. Narrow an ambiguous query
with the actual city/province/country and check the displayed address.

| Layer | Available without a Google key? | What it does |
| --- | --- | --- |
| Curated local gazetteer | Yes, offline | 111 San Jose/Montalban-area entries and resident aliases; not a complete inventory |
| Mapbox Geocoding **v6** | Yes, with the existing public Mapbox token | Worldwide addresses/streets/areas; **not business POIs** |
| Photon / OpenStreetMap | Yes, online | Live place/business search; nearby categories use actual OSM tags |
| Google **Places UI Kit** | Only after admin setup below | Live Google-powered places, displayed by official attributed Google components inside Directions |
| Open Google Maps | Yes | Opens the complete user query in Google's own site/app; it does not secretly import results |
| Coordinates / full Plus Code / map pin | Yes | Routes to the user's supplied or selected point; not inferred house coordinates |

Google UI Kit is opt-in and is **not enabled by default**. There is no Google key
in source control. Without configuration, the Google API script is not loaded and
the UI clearly says the normal search is not the whole Google Maps database.
The connector has been tested with mocked official components, not a live billed
Google project. Test it with your restricted key before enabling it in production.

## Accuracy safeguards

- The original complete query is sent to the providers first, preserving business
  names, Unicode, house numbers, Block/Lot/Phase and city/province/country.
- Normalized/area alternatives are secondary lookups, not invented address pins.
- `Jollibee`, `Shell`, `Petron`, `Mercury Drug` remain **brand queries**, not generic
  restaurant/fuel/pharmacy queries. Bakery/laundry/salon are separate categories.
- Unrelated matches and invalid geometries are rejected. Distinct nearby business
  branches and numbered phases are retained; duplicate representations are merged.
- Local subdivision/barangay/sitio/road coordinates are labelled **AREA**. Unknown
  block/lot and interpolated results are labelled **APPROX** with an explanation.
- The query `blk 4 phase 1a sub-urban sanjose rodriguez rizal` finds the real
  `Phase 1-A Sub Urban` area. It **does not claim** that the area centroid is the
  surveyed Blk 4 or a specific house. The previous synthetic `Blk 4, ...` title
  has been removed. A matching live address can outrank a centroid.
- Pressing Enter while search is in progress does not silently route to an
  interim local centroid. Arrow keys can select a resolved suggestion.
- A map pin retains the exact tapped coordinate even if reverse geocoding returns
  the nearest area. The full-screen panel exposes the map through **Pin sa mapa**.
- A Google Maps URL's `@lat,lng` is a **camera centre**, not a destination. Only
  explicit destination coordinates / destination geometry are imported. A named
  Maps query is searched normally. Short links cannot safely be resolved through
  client-side CORS: open them in Google Maps, then copy the actual pin coordinate.
- Full Plus Codes decode the encoded area's centre. Short codes require a locality
  and are not guessed from the map centre; use Google search or explicit coordinates.
- Stale typing, focus, map-tap, close and Google selection responses cannot overwrite
  the active destination. Provider failures are disclosed rather than filled with
  made-up places. A road route may still be unavailable even when a destination exists.

For emergency response, verify the physical house/entrance and access road. A
geocoder's pin is not a guarantee of survey-grade accuracy.

## Enable real Google places in Directions

This must be done by the deployment administrator with their own Google project.
Do not send credentials in chat and do not use a scraped/borrowed key.

1. Create/select a Google Cloud project with an active billing account.
2. Enable **Maps JavaScript API** and **Places UI Kit API**
   (`placewidgets.googleapis.com`). This integration uses UI Kit, not legacy
   `PlacesService`, Places REST or raw Autocomplete responses.
3. Create a **browser** API key, apply HTTP-referrer restrictions for the actual
   production site and (if needed) the exact Arena preview host shown in the UI.
   Do not allow all `e2b.app` hosts or all websites. Restrict API access to the
   required APIs. Configure usage quotas and billing alerts.
4. For local development, put this in the app directory's ignored `.env.local`:

   ```dotenv
   VITE_GOOGLE_MAPS_API_KEY=your_restricted_browser_key
   ```

   Restart Vite after changing an environment variable. For GitHub Pages, create
   an Actions repository secret **VITE_GOOGLE_MAPS_API_KEY** and run the normal
   Pages build/deploy. Both copies of the workflow forward the optional key.
   An empty/unset secret leaves Google off and keeps Mapbox/OSM functioning.
5. Open **Traffic → Directions**, type a real address/business and press
   **Search all** (or Enter without a selected suggestion). Google Text Search
   is explicitly submitted, rather than billed for every keystroke. The normal
   Mapbox/OSM autocomplete remains debounced at 450 ms.
6. Google's official place list appears above the other provider suggestions.
   Select a result, check its official name/address card, and press **Use as
   destination**. Its returned geometry is used for the route; the official card
   remains visible. The same flow works for an origin or stop.
7. Verify real San Jose addresses, a business absent from the local list, a place
   elsewhere in the PH, a foreign destination, denied/invalid-key handling,
   mobile layout, Google attribution and your quota/billing dashboards.

The React host passes this **public browser key** to the standalone traffic
iframe as `gkey`. `public/` scripts are plain files, so `import.meta.env` cannot
be read inside them. Browser keys are visible to users by design; using an Actions
secret keeps them out of source, **not out of the browser**. Referrer/API
restrictions, quotas and administrator-controlled billing are the protection.
Never use a server/service-account credential in a `VITE_` variable.

### Google content and attribution

Ordinary Places API content must not be used with a non-Google map. The Places
**UI Kit** has a distinct service-term exception allowing its official components
alongside Mapbox/other maps. We use those components and preserve their attribution
and disclosures. Google names/addresses are not copied into our own gazetteer or
custom result rows. The selected place ID and geometry stay in memory; Google
content/geometry is not written to offline history, Home/Work or Saved storage.
Those selections are session-only. Sharing uses Google's own Maps URL with the
place ID rather than exporting Google geometry into the site's saved route URLs.

Public map-search terms/privacy information is at `map-search-privacy.html` and is
linked from Directions. Review it for your deployment, especially if your broader
application collects additional data.

## Storage and provider operations

- OSM response cache: **memory only**, two minutes, up to 40 entries. It reduces
  repeated requests; it is not a downloaded country/business inventory.
- Debounce and cancellation avoid outdated/background lookups. Each lookup has a
  deadline, even on a browser without AbortController.
- Temporary Mapbox geocoding content is **not** saved to localStorage. A manually
  picked coordinate can be saved under its own numeric label without storing a
  temporary Mapbox-derived name. Local/OSM entries and user coordinates persist.
- For an account entitled to permanent Mapbox geocoding, the engine supports
  `mapboxPermanent: true` in `TrafficSearch.search` options. It is **off by
  default** and not enabled by the UI; it is a billed admin decision.
- Photon is a public service, not a contracted availability/coverage guarantee.
  For significant traffic use your own/commercial service. The engine accepts
  a `photonUrl` option; a browser-facing URL must be reachable by the user's
  browser, not the sandbox's `localhost`.
- The public `nominatim.openstreetmap.org` endpoint has been removed/blocked.
  Its policy forbids client-side autocomplete, limits aggregate application
  traffic to 1 request/second, and requires an informed developer decision.
  Do not reintroduce it as a per-keystroke fallback. An administrator may
  explicitly configure a self-hosted/commercial compatible `nominatimUrl`;
  the engine only uses it with `submitted: true`. Follow that service's limits.
- Do not systematically scrape Google/OSM geocoders to collect “all places”.
  Enrich the local list from field surveys/licensed public data and retain source
  attribution and uncertainty flags.

## Regression checks

Run `npm run test:traffic` for all three harnesses, or these individually from this app directory:

```bash
node scripts/test-traffic-search.mjs
node scripts/test-traffic-ui.mjs
node scripts/test-traffic-ui.mjs --google
npm run lint
npm run build
```

The harnesses execute the actual engine/page script with provider/DOM fixtures.
They cover every gazetteer name, acceptance address, nonlocal/Unicode names, brands,
category tags, full addresses, duplicates, coordinate/Maps/Plus Code input,
uncertainty, cancellation, accessible search state, real map-picking mode,
Google UI Kit query/selection/details/errors and non-persistence. They are not a
real-browser or live Google coverage test. Public JS/HTML are copied by Vite to
`dist/`; tests and documentation are not part of the published artifact.

## Authoritative provider references

- [Google UI Kit setup and billing prerequisites](https://developers.google.com/maps/documentation/javascript/places-ui-kit/get-started)
- [Google official Text Search elements and selection events](https://developers.google.com/maps/documentation/javascript/places-ui-kit/place-search)
- [Google service-specific terms, section 15 (UI Kit) vs section 14 (Places API)](https://cloud.google.com/maps-platform/terms/maps-service-terms)
- [Google maps attribution/privacy policy requirements](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Mapbox v6 geography, POI separation, temporary/permanent storage](https://docs.mapbox.com/api/search/geocoding/)
- [Photon API and tag-filtered nearby POIs](https://github.com/komoot/photon/blob/master/docs/api-v1.md)
- [Nominatim public usage policy — no autocomplete, aggregate limits](https://operations.osmfoundation.org/policies/nominatim/)
- [Open Location Code specification](https://github.com/google/open-location-code/blob/main/Documentation/Specification/specification.md)
- [OpenStreetMap copyright/ODbL](https://www.openstreetmap.org/copyright)
