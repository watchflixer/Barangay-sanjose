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

## Secret admin door (search bar)

Walang admin link sa public menu. Para makapasok:

1. Buksan ang **Incident Feeds** panel (hazard map).
2. I-type sa **search bar** ang `admin`.
3. Lalabas ang isang maliit na **Admin sign in** card sa lugar ng listahan.
4. Sa ngayon: **Email:** `admin` · **Password:** `admin`.
5. Kapag tama ang dalawa, bubukas ang buong admin workspace sa ibabaw ng app
   (may **Back to site** at sign-out sa itaas).

Detalye:

- Case-insensitive ang secret word; i-clear ang search o pindutin ang × para
  bumalik sa incidents. Hindi lumalabas ang gate kapag ordinaryong salita
  (hal. `flood`) ang hinahanap.
- Ang session ay tumatagal ng 8 oras sa browser tab na iyon. Kapag binuksan
  mong muli ang `admin` sa search, may **Buksan ang admin workspace** /
  **Mag-sign out** na lalabas.
- 5 maling subok = 30 segundong paghihintay.
- Puwedeng palitan ang default credentials sa build environment:

  ```env
  VITE_ADMIN_EMAIL=admin@barangaysanjose.gov.ph
  VITE_ADMIN_PASSWORD=mas-mahabang-passphrase
  ```

**Mahalagang paalala:** ang gate na ito ay nasa browser, kaya hindi ito
kasing-tibay ng tunay na authentication. Ito ay isang convenience door para sa
app na ito — ang tunay na proteksyon ng shared data ay ang **Supabase admin
account + row-level security** (tingnan sa ibaba). Huwag gamitin ang
`admin/admin` sa isang pampublikong deployment na may live na database.

## Admin dashboard (HazardSync Admin)

Ang public site ay may kasamang **admin workspace** para kontrolin kung ano ang
lumalabas sa hazard street map at sa mga directory: incidents, evacuation
centers, emergency hotlines, Help Center pins, at live broadcast link.

| URL | Ano ang lalabas |
| --- | --- |
| `/admin.html` | Admin dashboard |
| `/` o `/index.html` | Public site (walang binago) |

```bash
npm run dev          # public app + admin.html
npm run dev:admin    # pareho, pero "/" ay admin dashboard (preview mode)
npm run build        # dist/index.html + dist/admin.html
npm run test:admin   # map-visibility rules (4 tests)
```

### Ano ang kayang kontrolin

- **Overview** — bilang ng incidents, pending review, active, resolved; live
  preview ng mapa at mga layer switch.
- **Incidents & reports** — gumawa, mag-edit, mag-publish, mag-hide, at
  mag-delete ng incidents (title, type, severity, status, street, sitio,
  coordinates, description, photo). Puwedeng pumili ng lokasyon sa embedded
  na mapa. Ang community reports ay pumapasok bilang **Pending review** —
  hindi sila lumalabas sa public map hanggang ma-publish ng admin.
  May **REPORTER** column sa listahan, at sa editor ay may
  *"Sino ang nag-report"* card: **pangalan, email, cellphone, kung kailan
  nag-report** (eksaktong oras + *"x minuto / oras / araw ang nakalipas"*).
  May switch ding **"Ipakita ang pangalan ng nag-report sa public map"** —
  ang email at cellphone ay hindi kailanman ipinapakita sa public site.
- **History** — activity log ng lahat ng admin action: reported, added,
  updated, published, hidden, deleted, resolved, directory, settings — kasama
  ang **sino** ang gumawa, **kailan**, at **ano** ang binago. May search at
  filter, at naka-group kada araw (Ngayong araw / Kahapon / petsa).
- **Hazard street map** — per-layer switch (Flooding, Fire, Power, Road,
  Water, Streetlight), resolved incidents on/off, at ang automatic PAGASA pin
  on/off. Naka-preview dito ang totoong pins.
- **Evacuation centers / Emergency hotlines** — idagdag, i-edit, i-delete.
  Ito ang lumalabas sa public directory sa loob ng app.
- **Help center** — pamahalaan ang `help_places` pins (Supabase ang source).
- **Settings** — resolved/PAGASA switches, live broadcast link, data
  connection, at demo reset.

### Demo mode vs. shared data

Kung walang `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, **Demo mode** ang
admin: naka-label na sample data, at ang mga pagbabago ay nananatili lang sa
browser (`localStorage`). Para maging shared sa lahat ng bisita, i-setup ang
Supabase:

1. Sa Supabase Dashboard → SQL Editor, patakbuhin ang
   `supabase/admin_operations.sql` (safe i-re-run). Kasama na ang
   `hazard_reports`, `site_content`, admin membership, public view, at ang
   `submit_community_hazard()` RPC.
2. Authentication → Users → **Add user**: gumawa ng email + password para sa
   bawat admin. Pagkatapos, i-grant ang access:

   ```sql
   insert into public.hazardsync_admins (user_id)
   select id from auth.users where email = 'ADMIN_EMAIL'
   on conflict do nothing;
   ```

3. Ilagay ang project URL at **public anon key** sa `.env.local`
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), o sa GitHub repo
   Secrets (parehong pangalan) para sa Pages build.
4. I-redeploy. `/admin.html` ay magpapakita na ng login; ang mga account na
   wala sa `hazardsync_admins` ay tatanggihan.

### Paano gumagana ang map visibility

Isang rule lang ang sinusunod ng public map (`src/admin/visibility.ts`):

```
published  AND  layer enabled  AND  (not resolved OR resolved switch on)
```

- `visibility = 'pending'` — galing sa community report, hinihintay ang review.
- `published` — nasa public map (kung naka-on ang layer).
- `hidden` — nire-review o tinanggal pansamantala, wala sa public map.

Ang public app ay nagre-refresh tuwing 30s, pagbalik ng focus, at kapag
nagbago ang admin sa parehong browser. Kapag biglang hindi maabot ang
Supabase, **walang sample data na ipinapakita** — may amber na abiso sa itaas
ng feed at walang pins, para hindi mapagkamalang live ang demo.

### Security notes

- Ang browser ay gumagamit lang ng **public anon key**. Walang service-role key
  sa Vite o sa admin UI.
- Ang RLS ay nagbibigay ng writes sa `hazard_reports`, `site_content`,
  `help_places` sa authenticated users na nasa `hazardsync_admins` lang.
- Ang public reads ng incidents ay dumadaan sa `published_hazards` view, na
  hindi kasama ang `reporterEmail` at `contactNumber`.
- Ang `submit_community_hazard()` RPC ay validation-on-server: fixed ang
  `visibility='pending'` at `status='active'`, may coordinate bounds, photo
  format/size check, at 5-minute duplicate guard.
- Ang popup HTML ng Leaflet ay ine-escape bago i-render, at image URLs ay
  limitado sa `data:image/*` o http(s).

### Tests

```bash
npm run lint
npm run test:admin
npm run build
```

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
