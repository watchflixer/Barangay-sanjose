# HazardSync — Barangay San Jose

Disaster & hazard monitoring portal para sa Rizal. React + Vite app.

## Preview (mobile-first)

Ang root URL (`npm run preview` at `npm run dev`) ay nagsa-serve na ng **normal app**.
Ang **Pixel 7 device preview** ay opt-in: bisita mo lang `/?pixel7=1` (375×820 phone frame
na nag-e-embed ng totoong app, naka-fit sa kahit gaano kaliit na preview panel).

| URL                                | Ano ang lalabas                                               |
| ---------------------------------- | ------------------------------------------------------------- |
| `/`                                | Normal app (default)                                          |
| `/?pixel7=1`                       | Pixel 7 device preview                                        |
| `/?full=1` o `/?desktop=1`         | Desktop/regular app                                           |
| `/index.html`                      | Raw app (ito ang ini-embed ng device frames)                  |
| `/pixel7-preview.html?w=375&h=820` | Pixel 7 frame sa ibang viewport size                          |
| `/mobile-preview.html`             | Lahat ng devices (Pixel 7, iPhone SE, iPhone 14 Pro, Android) |
| `/?traffic=1&sfrom=...`            | Deep link papuntang app (hindi ni-re-redirect)                |

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

### Desktop/laptop-only changes (STANDING RULE)

**Lahat ng pagbabago sa lapad/posisyon/ayos ng Weather view ay dapat nasa
`@media (min-width: 640px)` lang — walang gagalawin sa Android/iPhone
portrait view.**

640px ang gate dahil ito ang Tailwind `sm` breakpoint at mas malaki pa rin sa
pinakamalaking portrait phone (iPhone 16 Pro Max = 440px CSS). Kapag mas
mataas ang kailangan (hal. tunay na `lg`/`xl`), itaas ang numero — pero **huwag
kailanman** maglagay ng rule sa labas ng media query.

Paano ito ginagawa:

- Markup: magdagdag lang ng **hook class** (`ph-mode-nav`, `ph-playback`,
  `ph-legend`, `ph-map-controls`, `ph-ctrl--*`, `ph-overlays`, o
  `custom-city-pin-container`). **Huwag** tanggalin o palitan ang orihinal na
  Tailwind utilities — dagdag lang.
- CSS: lahat ng bagong rule sa `weather-source/src/index.css`, sa loob ng
  `@media (min-width: 640px)`. Walang rule sa labas.
- JS na may visual effect: i-branch sa `isWideViewport()` (tingnan ang
  `WeatherMap.tsx`), at panatilihin ang orihinal na path para sa phone.
- Kung order lang ang babaguhin, gamitin ang flex `order` sa loob ng media
  query — **huwag** ilipat ang DOM, dahil magbabago rin ang phone order.

May tatlong guard test na pumipigil dito — pumapasa lang kung bawat
`ph-*` rule ay nasa loob ng media query at wala sa `max-width`/`portrait`
block:

```bash
npm run test:weather-nav     # 10 tests
npm run test:city-density    # 10 tests
npm run test:weather-zoom    #  5 tests
```

Isang bitag: ang Tailwind v4 ay nagsa-scan ng **lahat** ng file, kasama ang
`tests/` at kahit ang README na ito. Kapag may literal na pangalan ng utility
sa prose o sa test, gagawa ito ng dagdag na CSS rule sa `main-*.css` at
magbabago ang build hash. Buuin ang mga token mula sa fragments sa loob ng
test, at huwag isulat nang buo ang mga utility name sa dokumentasyon.

## Fare Estimate (Traffic map → 🎫 button)

Nasa `public/rizal_traffic_map.html` (`FARE_RATES` + `getRealtimeFares()`). **Auto-compute** —
galing sa totoong Mapbox route (km at minuto) ng piniling ruta, hindi manual na input:

| Sasakyan         | Rate (October 3, 2026)                                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grab (Hatchback) | ₱55 flag-down + ₱15.00/km + ₱2.00/min, dynamic surge ≤ 2× (rush hour 1.2×, weekend peak 1.3×)                                                            |
| Tricycle         | ₱15.00 unang km, +₱2.00/km                                                                                                                               |
| Jeepney          | ₱14.00 unang 4 km, +₱2.40/km                                                                                                                             |
| E-Trike          | ₱30 unang km, +₱15.00/km                                                                                                                                 |
| Bus              | ₱18.00 unang 5 km, +₱2.98/km                                                                                                                             |
| Airplane         | Depende sa **airlines na nagse-serve sa ruta** — presyo kada airline (Cebu Pacific, PAL, AirAsia, Cebgo, PAL Express, Royal Air, Sunlight Air, AirSWIFT) |
| Ship             | Depende sa **shipping line** (2GO, Starlite, Montenegro, FastCat, Aleson, Weesam, Supercat, Cokaliong, Lite)                                             |

### Airplane / Ship — paano nag-a-update

- **Airport/port-based**: may table ng ~40 PH airports at ~40 ports. Ang presyo ay
  airport-to-airport (great-circle) na distansya × rate ng airline/linya.
- **Kung walang airport/port sa destination**: ipapakita ang pinakamalapit
  (hal. _"Walang port sa destination • via Surigao (73 km)"_) at sinasabing hindi
  kasama ang land transfer. Kung < 40 km ang layo ng pinanggalingan at pupuntahan,
  tinatanggal na lang ang Airplane/Ship row (land travel na iyon).
- **Fare cycle** (`fareCycle()`): nagre-refresh tuwing **ika-15** at **katapusan ng
  buwan** (PH time), para sa lahat ng airline at shipping line. Naka-indeks kada
  cycle ang bawat airline (0.88×–1.20×), kaya kusang nagbabago ang presyo at ang
  pinaka-mura, at nakalagay sa card: _"Na-refresh Oct 15, 2026 • susunod Nov 1, 2026"_.
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

On phone portrait (Android and iPhone), the picker's title, X and search field
are **pinned**: only the category list scrolls, and the rows slide under that
bar — the header never leaves the screen and the page behind it never scrolls.
Each group's label (Emergency, Everyday essentials, …) pins itself right below
the bar while its sections are on screen, and a hairline + soft shadow appears
once the list starts moving. On phones the label's caption drops to its own
line so the pinned label is always a single row. Desktop keeps the same
behaviour, with the bar measured automatically (`--hc-picker-bar`), so a
wrapping title can never overlap the labels.

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
# Pinned picker bar (title/X/search stay put while the list scrolls) — no
# backend needed, so it runs against a plain dev/preview server:
BROWSER_PATH=/path/to/chromium npm run test:help-center:picker
```

The browser suite checks desktop/mobile Weather → Help Center navigation,
picker exit, filtering, list search, map pins/popups, directions URLs, mocked
geolocation, and provider failure/recovery. Like the weather tests, external
services are mocked because this sandbox blocks live Overpass/tile requests.

## Hidden incident admin workspace

1. Open **Hazard Map / Streets** and **Incident Feeds** (on a phone, use the feed arrow).
2. Type exactly `Admin` in the incident search. Case and surrounding spaces are ignored;
   searches such as `Admin street` remain ordinary searches.
3. Sign in with **Email: `admin`** and **Password: `admin`**. The Email field accepts this
   admin username, not an email address. The password is verified by the database
   (`admin_login`); Refresh or Logout clears the in-memory login.
4. In the admin panel you can:
   - search reports by incident, reporter name, email, cellphone, location or report ID;
   - read full report/reporter details as text, with Philippine date/time and elapsed age;
   - change Active / Monitoring / Resolved status;
   - display or hide the reporter's **name** on public cards, map popups and history;
   - remove incidents from every public incident view, inspect the archive, and restore them;
   - accept or decline incoming reports, with an optional decline reason, from the
     **Pending review** and **Declined** queues;
   - review resident **resolve requests** and accept (closes the incident) or ignore them;
   - hide an entire hazard category (fire, flood, no power, streetlights, water, road) from
     the public map and incident feed, and bring it back with one tap;
   - create and publish an official incident from **Add incident**, including severity,
     initial status, description, sitio preset/custom coordinates and optional contacts;
   - inspect the shared action history, filtered by report or author.

### Everything is shared, nothing is browser-only

Reports, moderation decisions, category visibility and the audit trail live in the Supabase
project `hazardsync-map-data` (see `supabase/shared_hazard_reports.sql`). Any admin on any
device changes the same data, and every visitor sees the result — realtime updates on open
pages, a 45-second poll as the fallback, and a last-synced snapshot so the map still opens
when the network drops. The snapshot is a cache only: it is overwritten by the next
successful fetch and is never a source of truth.

The database enforces the rules, not the UI:

- `public_feed()` returns only **accepted**, non-archived incidents that are not in a hidden
  category. Pending community reports never reach a public view.
- `submit_report(payload, p_load_id)` stores a new report as `pending`. It rejects missing
  photos, a non-Gmail Google account, an invalid Philippine mobile number and blank names,
  and rate-limits each connection to 10 reports per hour.
- `flag_resolved(p_report_id, p_note)` records a **resolve request**; it never changes a
  report. Only `admin_review_flag(p_password, p_flag_id, 'accepted'|'ignored')` decides it.
- `admin_change` covers status, name visibility, archive/restore and review decisions;
  `admin_create`, `admin_set_hidden_types` and `admin_review_flag` cover the rest.
- Reporter email and cellphone are never returned by `public_feed()`; only `admin_bundle`
  (password-gated) exposes them.

### Reporting requirements

The public report form requires a **photo**, **full name**, **Philippine cellphone number**
and a **Google (Gmail) account**. The form pre-checks them with `reportDraftError()` for
instant feedback and the database re-validates the same rules. Reporter contacts stay
admin-only; the full name is hidden on public cards unless an admin turns it on with the
reporter's consent.

The **Realtime visits** monitor is backed by the same project. It starts at **5,000** and
each page load calls the `increment_site_visit` RPC, so the total is shared by every visitor
on every device. The admin dashboard subscribes to Postgres changes and refreshes instantly;
a 15-second poll is the fallback when realtime is unavailable. Each browser sends a
per-load ID, so a retried request cannot double-count. Counts page loads, not unique people.

Setup already applied to that project (see `supabase/realtime_site_visits.sql`):

- `public.site_visits` holds the single counter row and is world-readable by design;
  there are no write policies, so visitors cannot tamper with the total.
- `public.increment_site_visit(p_load_id uuid)` is a `security definer` function and the
  only write path; it is granted to `anon` and deduplicates retries.
- The table is added to the `supabase_realtime` publication.

The publishable/anon key in `src/lib/siteVisits.ts` is a public browser credential used for
both the counter and the hazard feed. The Help Center's `VITE_SUPABASE_*` variables point at
a different project and are ignored here. To point the counter elsewhere, set
`VITE_SITE_VISITS_SUPABASE_URL` and `VITE_SITE_VISITS_SUPABASE_ANON_KEY`. Setting
`hazardsync:visits-offline=1` in localStorage disables shared counting and falls back to a
per-browser count (used by the browser tests so automation never inflates the public total).

Anyone can still increase a page-load counter by calling the public RPC repeatedly; if you
need abuse-resistant numbers, add a server-side rate limit or move the increment into an
edge function.

Removing an incident or publishing a reporter name opens an accessible confirmation before
any change is made. Cancel/Escape leaves both the report and history unchanged. Name hiding
is immediate. The archive retains all reporter details and supports restore. The History
view filters by report and author and can reopen an incident, including an archived one.
Toasts announce actions and server errors stay visible instead of failing silently.

**Security limits:** row access is closed to `anon`/`authenticated`; every write goes through
a `security definer` RPC, and admin RPCs prove the caller with `admin_login`'s password
check against a SHA-256 hash in `app_secrets` — not a secret in the bundle. It is still a
single shared password with no sessions, rate limiting or per-admin accounts. Treat public
deployment as needing real authentication (Supabase Auth, per-admin accounts, audit
attribution) before it becomes sensitive infrastructure.

Tests:

```bash
npm run lint
npm run build
npm run test:admin
# Login layout, show/hide password, errors, keyboard navigation, five screen sizes:
npm run test:admin:login
# Overview counts, combined filters, sorting, selections, confirmations, archive/history:
npm run test:admin:dashboard
# Accept/decline, reconsideration, audit trail, shared visits baseline:
npm run test:admin:moderation
# Shared Supabase visit counter: config, parsing, dedupe and live dashboard refresh:
npm run test:visits
```

Browser tests need Chromium (`BROWSER_PATH`) and a running `npm run dev` server. They route
`guxzibsrfyfiuqsgcgyt.supabase.co` to `tests/supabase-mock.mjs`, an in-memory replay of the
RPC contract, because this sandbox cannot reach Supabase:

```bash
npm run test:admin:browser          # hidden entry, server-checked login, shared workspace
npm run test:admin:login            # login UX at 1280/768/390/320/844×390
npm run test:admin:dashboard:browser # pending review, resolve requests, hiding a category, archive/restore
npm run test:admin:moderation:browser # decline, audit trail, reconsideration
npm run test:visits:browser         # one increment per page load, live dashboard refresh
npm run test:public-report:browser  # required photo/Gmail/mobile, pending publish gate, resolve request
# TEST_BASE_URL can target a different running dev/preview server.
```
