# HazardSync — Barangay San Jose

Disaster & hazard monitoring portal para sa Rizal. React + Vite app.

## Preview (mobile-first)

`npm run preview` (at `npm run dev`) ay naka-default na agad sa **Pixel 7 device preview** —
pagbukas ng root URL, diretsong `/pixel7-preview.html` ka (375×820 phone frame na nag-e-embed
ng totoong app, naka-fit sa kahit gaano kaliit na preview panel).

| URL | Ano ang lalabas |
| --- | --- |
| `/` | Pixel 7 preview (default) |
| `/?full=1` o `/?desktop=1` | Desktop/regular app |
| `/index.html` | Raw app (ito ang ini-embed ng device frames) |
| `/pixel7-preview.html?w=375&h=820` | Pixel 7 frame sa ibang viewport size |
| `/mobile-preview.html` | Lahat ng devices (Pixel 7, iPhone SE, iPhone 14 Pro, Android) |
| `/?traffic=1&sfrom=...` | Deep link papuntang app (hindi ni-re-redirect) |

```bash
npm install
npm run preview   # http://localhost:4173  ->  Pixel 7 view agad
npm run dev       # http://localhost:3000  ->  Pixel 7 view agad
npm run build     # production build sa dist/
```

Ang default redirect ay nasa `vite.config.ts` (plugin na `pixel7-by-default`), kaya pareho
ang behavior sa dev at preview server.

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
