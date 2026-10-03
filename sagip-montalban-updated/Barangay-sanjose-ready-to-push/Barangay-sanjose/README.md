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
