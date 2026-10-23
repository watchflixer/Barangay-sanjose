-- Run in Supabase Dashboard > SQL Editor. Safe to re-run.
-- One table per Help Center filter. Only active rows are publicly readable.
-- No browser INSERT/UPDATE/DELETE permissions are granted.
DO $$
DECLARE r record; tbl text;
BEGIN
 FOR r IN SELECT * FROM (VALUES
('emergency', 'police', 'Police'),
('emergency', 'fire', 'Fire Station / BFP'),
('emergency', 'hospital', 'Hospital'),
('emergency', 'clinic', 'Health Center / Clinic'),
('emergency', 'evacuation', 'Evacuation Center'),
('emergency', 'barangay', 'Barangay Hall'),
('essentials', 'seven_eleven', '7-Eleven'),
('essentials', 'convenience', 'Convenience Store'),
('essentials', 'supermarket', 'Supermarket / Grocery'),
('essentials', 'market', 'Public Market'),
('essentials', 'pharmacy', 'Pharmacy'),
('essentials', 'bigasan', 'Rice Store'),
('essentials', 'water', 'Water Refilling Station'),
('essentials', 'lpg', 'LPG / Cooking Gas Dealer'),
('essentials', 'bakery', 'Bakery'),
('essentials', 'hardware', 'Hardware'),
('essentials', 'laundry', 'Laundry'),
('travel', 'gas', 'Gas Station'),
('travel', 'vulcanizing', 'Tire Shop'),
('travel', 'terminal', 'Tricycle / Jeep Terminal'),
('travel', 'parking', 'Parking Area'),
('money', 'atm', 'ATM'),
('money', 'bank', 'Bank'),
('money', 'pawnshop', 'Pawnshop'),
('money', 'remittance', 'Remittance'),
('community', 'school', 'School'),
('community', 'church', 'Church'),
('community', 'court', 'Covered Court / Plaza'),
('community', 'wifi', 'Free WiFi / Load'),
('community', 'food', 'Eateries'),
('community', 'salon', 'Salon / Barber'),
('community', 'dental', 'Dental Clinic'),
('community', 'vet', 'Veterinary / Pet'),
('community', 'gym', 'Gym / Fitness')
 ) AS t(grp,cat,label) LOOP
  tbl := r.grp || '_' || r.cat;
  EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (length(trim(name)) > 0),
    latitude double precision NOT NULL CHECK (latitude BETWEEN 4 AND 22),
    longitude double precision NOT NULL CHECK (longitude BETWEEN 116 AND 128),
    address text, hours text, phone text, note text,
    approx boolean NOT NULL DEFAULT false,
    replaces_id text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
  )', tbl);
  EXECUTE format('COMMENT ON TABLE public.%I IS %L', tbl, 'Help Center filter: ' || r.label);
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', tbl);
  EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', tbl);
  EXECUTE format('DROP POLICY IF EXISTS "public read active" ON public.%I', tbl);
  EXECUTE format('CREATE POLICY "public read active" ON public.%I FOR SELECT TO anon, authenticated USING (is_active)', tbl);
 END LOOP;
END $$;
-- Add rows using Table Editor. Use replaces_id to replace a built-in pin.
-- Example: community_school, replaces_id = sc-kasiglahan-elem.
