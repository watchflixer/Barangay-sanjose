# HazardSync — Cloudflare Pages deployment

Private ang GitHub repository; puwedeng public ang website sa Cloudflare Pages. Ang aktuwal na Vite app ay nasa `sagip-montalban-updated/Barangay-sanjose-ready-to-push/Barangay-sanjose`, hindi sa repository root.

## Cloudflare Pages (Git integration)

1. Sa Cloudflare dashboard, gumawa o buksan ang **Workers & Pages → Pages** project at ikonekta ang private GitHub repository. Bigyan ang Cloudflare GitHub app ng access sa repository na ito. Huwag gawing public ang repository.
2. Sa build settings, piliin ang production branch `main` at itakda:
   - Root directory: `sagip-montalban-updated/Barangay-sanjose-ready-to-push/Barangay-sanjose`
   - Framework preset: Vite (o None)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: `22` (environment variable `NODE_VERSION` kung kailangan).
3. Sa Cloudflare build environment variables, ilagay kung ginagamit: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, at optional `VITE_FLOOD_LIVE_URL`. I-configure ang production at preview environments ayon sa pangangailangan, tapos mag-redeploy. Kapag wala ang Supabase values, hindi gagana ang shared database features.
4. I-merge ang changes sa `main` para ma-trigger ang Cloudflare Git deployment. Ang GitHub Actions workflow ay build check lamang; hindi ito nagde-deploy sa GitHub Pages. Kung may lumang GitHub Pages site, i-disable ito sa repository Settings → Pages kung hindi na kailangan.
5. Bisitahin ang `*.pages.dev` URL o configured custom domain; i-check ang main app, Weather, at database features. Preview deployments ay maaari ring ma-access ng iba na may URL; protektahan o i-disable ang mga ito kung kinakailangan.

Kung existing na ang Cloudflare project, siguraduhing **Git-integrated** ito at tama ang settings sa itaas. Hindi binabago ng repo files ang Cloudflare dashboard configuration. Hindi rin pinapatakbo ng Pages ang Node server sa `server/`; kailangan ng hiwalay na backend para sa features na umaasa rito.

## Seguridad ng data

- Private GitHub ≠ private website/database. Lahat ng inilalagay sa Vite `public/`, build output, at `VITE_*` variables ay makikita ng visitors. Ang Supabase anon/publishable key ay public by design; huwag kailanman gamitin ang service-role/secret key o passwords sa frontend variables. Tiyaking tama ang Supabase RLS, grants at RPC permissions sa **live** database bago maglagay ng sensitibong data.
- **Mahalaga:** ang dating `supabase/shared_hazard_reports.sql` ay may default admin password na `admin`. Sa live `hazardsync-map-data` project, tinanggihan na ang default sa `assert_admin`; naka-disable ang admin login hanggang palitan ito. Ang ibang database installation ay kailangang i-update nang hiwalay. Ang bagong SQL file ay walang default password at nagde-deny kapag walang naka-configure. Suriin din ang access/logs. Huwag i-commit o ilagay sa chat ang password.
- Ang kasalukuyang admin RPC ay gumagamit ng shared password at simpleng SHA-256 hash, at public ang login endpoint. Hindi ito sapat na proteksyon laban sa brute force; bago mag-store ng sensitibong personal data, gumamit ng Supabase Auth, role-based authorization at rate limiting, at ipa-review ang live policies. Ang pagtatago ng admin entry point ay hindi security.
- Suriin ang deployed files at database policies; hindi na-audit o nababago ng gabay na ito ang Cloudflare/Supabase account o dati nang na-deploy na site.

Para sa local development at iba pang detalye, tingnan ang README sa app directory.

### Magtakda ng bagong admin password

Sa Supabase dashboard → `hazardsync-map-data` → SQL Editor lamang, patakbuhin ang SQL sa ibaba pagkatapos palitan ang text sa pagitan ng quotes ng mahaba, random at unique na password (gumamit ng password manager). Huwag ibahagi ang password o SQL query, at iwasang i-save ito bilang shared snippet. Alisin din ito sa SQL editor history kung available. Ang bagong password ay para sa kasalukuyang shared-password system lamang, hindi kapalit ng Supabase Auth at rate limiting.

```sql
insert into public.app_secrets (id, secret_hash)
values ('admin', encode(sha256(convert_to('PALITAN_NG_RANDOM_PASSWORD', 'UTF8')), 'hex'))
on conflict (id) do update set secret_hash = excluded.secret_hash;
```
