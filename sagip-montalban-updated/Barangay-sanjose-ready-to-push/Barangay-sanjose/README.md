# HazardSync — Barangay San Jose

Disaster & hazard monitoring portal para sa Rizal. React + Vite app.

## Preview (mobile-first)

Ang root URL (`npm run preview` at `npm run dev`) ay nagsa-serve na ng **normal app**.
Ang **Pixel 7 device preview** ay opt-in: bisita mo lang `/?pixel7=1` (375×820 phone frame
na nag-e-embed ng totoong app, naka-fit sa kahit gaano kaliit na preview panel).

| URL | Ano ang lalabas |
| --- | --- |
| `/` | Normal app (default) |
| `/?pixel7=1` | Pixel 7 device preview |
| `/?full=1` o `/?desktop=1` | Desktop/regular app |
| `/index.html` | Raw app (ito ang ini-embed ng device frames) |
| `/pixel7-preview.html?w=375&h=820` | Pixel 7 frame sa ibang viewport size |
| `/mobile-preview.html` | Lahat ng devices (Pixel 7, iPhone SE, iPhone 14 Pro, Android) |
| `/?traffic=1&sfrom=...` | Deep link papuntang app (hindi ni-re-redirect) |

```bash
npm install
npm run preview   # http://localhost:4173  ->  normal app (/?pixel7=1 para sa device frame)
npm run dev       # http://localhost:3000  ->  normal app (/?pixel7=1 para sa device frame)
npm run build     # production build sa dist/
```

Ang Pixel 7 redirect ay nasa `vite.config.ts` (plugin na `pixel7-on-demand`), kaya pareho
ang behavior sa dev at preview server.

## Weather (Panahon project)

Ang Weather button ay nagbubukas ng `weather.html` na nag-e-embed ng **buong
Panahon project** mula sa ibinigay na Drive folder. Nasa `weather-source/` ang
lahat ng 22 orihinal na files (kasama ang App, components, services, CSS, HTML,
config, metadata, at lockfile). Ang `weather.html` wrapper ang tumuturo sa
weather entrypoint; inayos din ang na-export na Cloudflare script tag sa
`weather-source/index.html` para mapatakbo nang hiwalay sa Cloudflare. Nananatili ang Weather, Temperature, Storm, at Rain views.
May hiwalay pa ring lumang `src/weather-app/` sa repo, pero hindi iyon ang
ginagamit ng Weather button.

## Fare Estimate (Traffic map → 🎫 button)

Nasa `public/rizal_traffic_map.html` (`FARE_RATES` + `getRealtimeFares()`). **Auto-compute** —
galing sa totoong Mapbox route (km at minuto) ng piniling ruta, hindi manual na input:

| Sasakyan | Rate (October 3, 2026) |
| --- | --- |
| Grab (Hatchback) | ₱55 flag-down + ₱15.00/km + ₱2.00/min, dynamic surge ≤ 2× (rush hour 1.2×, weekend peak 1.3×) |
| Tricycle | ₱15.00 unang km, +₱2.00/km |
| Jeepney | ₱14.00 unang 4 km, +₱2.40/km |
| E-Trike | ₱30 unang km, +₱15.00/km |
| Bus | ₱18.00 unang 5 km, +₱2.98/km |
| Airplane | Depende sa **airlines na nagse-serve sa ruta** — presyo kada airline (Cebu Pacific, PAL, AirAsia, Cebgo, PAL Express, Royal Air, Sunlight Air, AirSWIFT) |
| Ship | Depende sa **shipping line** (2GO, Starlite, Montenegro, FastCat, Aleson, Weesam, Supercat, Cokaliong, Lite) |

### Airplane / Ship — paano nag-a-update

- **Airport/port-based**: may table ng ~40 PH airports at ~40 ports. Ang presyo ay
  airport-to-airport (great-circle) na distansya × rate ng airline/linya.
- **Kung walang airport/port sa destination**: ipapakita ang pinakamalapit
  (hal. *"Walang port sa destination • via Surigao (73 km)"*) at sinasabing hindi
  kasama ang land transfer. Kung < 40 km ang layo ng pinanggalingan at pupuntahan,
  tinatanggal na lang ang Airplane/Ship row (land travel na iyon).
- **Fare cycle** (`fareCycle()`): nagre-refresh tuwing **ika-15** at **katapusan ng
  buwan** (PH time), para sa lahat ng airline at shipping line. Naka-indeks kada
  cycle ang bawat airline (0.88×–1.20×), kaya kusang nagbabago ang presyo at ang
  pinaka-mura, at nakalagay sa card: *"Na-refresh Oct 15, 2026 • susunod Nov 1, 2026"*.
- Buksan ang Airplane o Ship row para makita ang **listahan ng presyo kada airline/linya**
  (may CHEAPEST tag) — per pax, one-way, hindi kasama ang hotel.

Kada row may breakdown (`Base ₱55.00 + 8.0 km × ₱15.00 + 20 min × ₱2.00`) at awtomatikong
nagre-recompute kapag nagpalit ng ruta o ng bilang ng pasahero. Kapag bagong rates, isang
lugar lang ang babaguhin: `FARE_RATES`.

### Weather troubleshooting and regression checks

The host must render `<WeatherView>` when `showWeather` is selected. The weather
project uses Leaflet 1.x factories, while the main GIS app uses Leaflet 2 alpha
classes. Keep `leaflet-weather` (an npm alias pinned to 1.9.4) and its CSS/types
isolated from the main app's `leaflet` dependency. A successful TypeScript/build
check alone cannot detect the old factory calls failing at runtime.

Current, 24-hour and seven-day forecast values are requested from Open-Meteo.
Failed/incomplete responses are not replaced with sample temperatures. Refresh
keeps existing data; provider errors appear in the existing bottom timeline, not a separate status bar. Initial failure shows no city values.
Radar loads independently with a timeout and an explicit unavailable notice.
The temperature/wind background visualizations remain illustrative, not official
PAGASA warnings or a measured gridded weather field.

From this app directory:

```sh
npm ci
npm run lint
npm run build
npm run test:weather
# Start npm run dev (or npm run preview after building) in another terminal.
# Use an installed Chromium executable:
BROWSER_PATH=/path/to/chromium npm run test:weather:browser
# For a production preview instead of dev:
TEST_BASE_URL=http://localhost:4173 BROWSER_PATH=/path/to/chromium npm run test:weather:browser
```

Browser tests mock external APIs/tiles and cover desktop/mobile rendering, all
four modes, zoom, city forecasts, provider failures/recovery, absence of the removed status bar, and opening/closing
Weather from the main app. Live API connectivity must also be checked in the
deployed browser; it cannot be verified in a network-restricted test sandbox.

### Help Center fixes and checks

Help Center is enabled in the main, Weather, Traffic and Flood layer menus.
Standalone embedded pages route to `index.html?help=1`; hosted pages use the
existing origin-checked layer-selection messages. The filter picker can be
closed without first selecting a category.

Live places use a bounded POST query, avoiding URL-length failures with many
categories. Up to three Overpass mirrors are tried (10 seconds each, with an
8-second server-side query budget). Failed/malformed/partial replies are not
cached as empty successes, and leaving the map cancels pending work. Community
pins remain available on failure. Their locations and hours are approximate,
not independently verified; check with the establishment before travelling.
A failed optional traffic layer no longer hides the live-places Retry action.

```sh
npm run test:help-center
# Start npm run preview first; use your installed Chromium executable:
BROWSER_PATH=/path/to/chromium npm run test:help-center:browser
```

The browser suite checks desktop/mobile Weather → Help Center navigation,
picker exit, filtering, list search, map pins/popups, directions URLs, mocked
geolocation, and provider failure/recovery. Like the weather tests, external
services are mocked because this sandbox blocks live Overpass/tile requests.
