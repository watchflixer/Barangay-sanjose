# Help Center Supabase setup

The Help Center draws **every** pin from Supabase. The app supports two
layouts and picks whichever your project has — no code change needed:

| Layout | Where the pins live | When to use |
| --- | --- | --- |
| **Single table** (preferred) | `public.help_places`, one row per place, with a `category` column (`police`, `pharmacy`, `school`, …) | You want to keep everything in one table. Run `help_places_single_table.sql`. |
| Per-filter tables | `<group>_<category>`, e.g. `emergency_police`, `community_school` | Existing setup from `help_places.sql`. |

Detection happens once per page load: if `public.help_places` answers, it wins;
otherwise the per-filter tables are read. Empty tables simply mean no pins for
that filter — nothing is invented client-side (there is no built-in fallback
list and no live OSM layer any more).

1. Create the tables you want: run `help_places_single_table.sql` (one table) **or** `help_places.sql` (34 per-filter tables). Both are safe to re-run and only grant public SELECT of active rows. They do not erase existing rows.
2. In Table Editor, insert `name`, `latitude`, `longitude` (and `category` when you use `help_places`); optional columns include address, hours, phone, note. Coordinates are decimal numbers, without N/E symbols.
3. The Help Center map reads **only** from these tables — there is no built-in pin list and no live OSM layer. A filter whose table is empty (or unreachable) simply shows no pins, with a message in the results sheet. `replaces_id` remains available for records that used to point at the old built-in pin IDs; `is_active=false` hides a row read-only (it does not delete it).
4. Fill the tables yourself in Table Editor (or paste your own INSERTs in the SQL
   Editor). No starter/seed rows ship with the repo — the barangay is the only
   source of pins.
5. Set `VITE_HELP_SUPABASE_URL` and `VITE_HELP_SUPABASE_ANON_KEY` in `.env.local` to use
   a different project than the built-in barangay directory. Never put a service-role
   key in Vite variables. With no variables set, the app talks to the built-in
   directory project in `src/services/helpCenterService.ts`.
6. Framework preset on Cloudflare Pages needs nothing extra: the built-in directory is the
   default. To override it there, add the variables in the Pages project settings
   (Variables and Secrets) and redeploy.
7. Reload the app after editing database rows, then select the category. Failed loads show a
   retry action and a "Why no pins?" report; no fallback pins are invented.

The project uses public REST reads, not a browser admin client. Database writes are performed in the Supabase Dashboard. No Supabase admin credentials are required by the frontend.

Neither layout implements school-level or public/private subfilters yet. School is a single category; those extra fields and UI controls need a separate change.
