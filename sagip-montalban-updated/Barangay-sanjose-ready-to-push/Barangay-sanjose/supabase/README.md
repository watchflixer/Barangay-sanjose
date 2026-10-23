# Help Center Supabase setup

1. Run `help_places.sql` in your Supabase project's SQL Editor. This creates 34 per-filter tables with RLS and public SELECT of active rows only. It does not erase existing rows.
2. In Table Editor, open e.g. `community_school` or `emergency_hospital`. Insert `name`, `latitude`, `longitude`; optional columns include address, hours, phone, note. Coordinates are decimal numbers, without N/E symbols.
3. The Help Center map reads **only** from these tables — there is no built-in pin list and no live OSM layer. A filter whose table is empty (or unreachable) simply shows no pins, with a message in the results sheet. `replaces_id` remains available for records that used to point at the old built-in pin IDs; `is_active=false` hides a row read-only (it does not delete it).
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` for local builds. Never put a service-role key in Vite variables.
5. For Pages, add those same names under GitHub repository Settings > Secrets and variables > Actions > New repository secret. The deployment workflow reads them at build time. Rebuild/redeploy after environment changes.
6. Reload the app after editing database rows, then select the category. Failed loads show a retry action; no fallback pins are invented.

The project uses public REST reads, not a browser admin client. Database writes are performed in the Supabase Dashboard. No Supabase admin credentials are required by the frontend.

This schema does not yet implement school-level or public/private subfilters. School is currently a single category; these additional fields and UI controls need a separate change.
