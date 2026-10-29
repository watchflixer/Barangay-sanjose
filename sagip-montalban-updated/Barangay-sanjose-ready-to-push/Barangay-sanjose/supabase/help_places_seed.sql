-- Help Center starter pins for Barangay San Jose (Rodriguez, Rizal).
-- Run AFTER help_places.sql (or on the project that owns the per-filter tables).
-- Safe to re-run: a row is inserted only when that table has no place with the
-- same name yet, so your own edits survive. Delete rows you disagree with in
-- Table Editor; set is_active = false to hide instead of deleting.

-- community_church: 3 places
insert into public.community_church (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'San Jose Parish Church', 14.74185, 121.14765, 'San Jose Proper, Brgy. San Jose', null, null, 'Mass every Sunday 6AM / 8AM / 5PM', false, null
where not exists (select 1 from public.community_church where lower(trim(name)) = lower(trim('San Jose Parish Church')));
insert into public.community_church (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Kasiglahan Village Chapel', 14.74585, 121.13575, 'Kasiglahan Village 1K1, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.community_church where lower(trim(name)) = lower(trim('Kasiglahan Village Chapel')));
insert into public.community_church (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Church of Christ - Kasiglahan', 14.7445, 121.137, 'Kasiglahan Village, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.community_church where lower(trim(name)) = lower(trim('Church of Christ - Kasiglahan')));

-- community_court: 3 places
insert into public.community_court (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Brgy. San Jose Covered Court', 14.7412, 121.1468, 'Barangay Hall compound, San Jose Proper', null, null, 'Also used as an evacuation center', false, null
where not exists (select 1 from public.community_court where lower(trim(name)) = lower(trim('Brgy. San Jose Covered Court')));
insert into public.community_court (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Kasiglahan Village Basketball Court', 14.7459, 121.1363, 'Kasiglahan Village 1K1, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.community_court where lower(trim(name)) = lower(trim('Kasiglahan Village Basketball Court')));
insert into public.community_court (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Tagumpay Village Court & Plaza', 14.7554, 121.133, 'Tagumpay Village, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.community_court where lower(trim(name)) = lower(trim('Tagumpay Village Court & Plaza')));

-- community_dental: 2 places
insert into public.community_dental (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'San Jose Dental Clinic', 14.7425, 121.1461, 'San Jose Proper, Brgy. San Jose', '9:00 AM - 6:00 PM', null, null, false, null
where not exists (select 1 from public.community_dental where lower(trim(name)) = lower(trim('San Jose Dental Clinic')));
insert into public.community_dental (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Kasiglahan Smile Dental Center', 14.7449, 121.1364, 'Kasiglahan Village 1K1, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.community_dental where lower(trim(name)) = lower(trim('Kasiglahan Smile Dental Center')));

-- community_food: 4 places
insert into public.community_food (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Jollibee Montalban', 14.7354, 121.1338, 'Rodriguez Highway, Brgy. Rosario (next to San Jose)', '6:00 AM - 10:00 PM', null, 'Drive-thru', false, null
where not exists (select 1 from public.community_food where lower(trim(name)) = lower(trim('Jollibee Montalban')));
insert into public.community_food (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Aling Nena''s Eatery', 14.7452, 121.1354, 'Kasiglahan Village 1K1, Brgy. San Jose', '6:00 AM - 8:00 PM', null, null, false, null
where not exists (select 1 from public.community_food where lower(trim(name)) = lower(trim('Aling Nena''s Eatery')));
insert into public.community_food (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'San Jose Eatery & Grill', 14.7423, 121.1457, 'San Jose Proper, Brgy. San Jose', '10:00 AM - 10:00 PM', null, null, false, null
where not exists (select 1 from public.community_food where lower(trim(name)) = lower(trim('San Jose Eatery & Grill')));
insert into public.community_food (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Milk Tea Corner Kasiglahan', 14.7447, 121.1361, 'Kasiglahan Village 1K2, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.community_food where lower(trim(name)) = lower(trim('Milk Tea Corner Kasiglahan')));

-- community_gym: 1 place
insert into public.community_gym (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'San Jose Fitness Gym & Boxing', 14.7293, 121.1138, 'Litex Market Access Road, Brgy. San Jose', '5:00 AM - 10:00 PM', null, null, false, null
where not exists (select 1 from public.community_gym where lower(trim(name)) = lower(trim('San Jose Fitness Gym & Boxing')));

-- community_salon: 2 places
insert into public.community_salon (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'San Jose Barbershop', 14.7419, 121.1456, 'J.P. Rizal Avenue, San Jose Proper, Brgy. San Jose', '9:00 AM - 8:00 PM', null, null, false, null
where not exists (select 1 from public.community_salon where lower(trim(name)) = lower(trim('San Jose Barbershop')));
insert into public.community_salon (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Kasiglahan Glam Salon', 14.7451, 121.1358, 'Kasiglahan Village 1K1, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.community_salon where lower(trim(name)) = lower(trim('Kasiglahan Glam Salon')));

-- community_school: 27 places
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'San Jose Elementary School', 14.7435, 121.1445, 'Narra St., Brgy. San Jose, Rodriguez, Rizal', null, null, null, false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('San Jose Elementary School')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Kasiglahan Village Elementary School', 14.7483, 121.1416, 'Kasiglahan Village, Brgy. San Jose, Rodriguez, Rizal', null, null, 'Also an evacuation center during floods', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Kasiglahan Village Elementary School')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Kasiglahan Village National High School', 14.7495, 121.1416, 'Kasiglahan Village, Brgy. San Jose, Rodriguez, Rizal', null, null, null, false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Kasiglahan Village National High School')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Eastwood Greenview Learning Center', 14.7391, 121.1213, 'Eastwood Greenview Phase 3, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Eastwood Greenview Learning Center')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Tagumpay Village Day Care Center', 14.7458, 121.132, 'Tagumpay Village, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Tagumpay Village Day Care Center')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Westbridge Institute of Technology, Inc. - Amityville Campus', 14.7342, 121.1292, 'Amityville Subd., Brgy. San Jose, Rodriguez, Rizal', '8:00 AM - 5:00 PM (Mon-Sat)', null, 'TESDA-accredited • Senior High & College', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Westbridge Institute of Technology, Inc. - Amityville Campus')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Westbridge Institute of Technology, Inc. - Balite Campus', 14.7608, 121.1448, 'Sitio Balite, Brgy. San Jose, Rodriguez, Rizal', '8:00 AM - 5:00 PM (Mon-Sat)', null, 'TESDA-accredited • Senior High & College', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Westbridge Institute of Technology, Inc. - Balite Campus')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'San Jose Litex Senior High School', 14.7295, 121.1128, 'Litex Road, Brgy. San Jose, Rodriguez, Rizal', '6:00 AM - 6:00 PM (Mon-Fri)', null, 'Public Senior High • Grades 11-12 • DepEd', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('San Jose Litex Senior High School')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Southville 8B National High School', 14.752, 121.1491, 'Block 52-D Lot 1 Phase 1 Southville 8B, Brgy. San Isidro, Rodriguez, Rizal', '6:00 AM - 5:00 PM (Mon-Fri)', null, 'Public High School • Junior & Senior High', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Southville 8B National High School')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Stand-Alone Senior High School No. 5 (San Jose)', 14.7438, 121.1415, 'Rodriguez Highway, Brgy. San Jose (near Sub-Urban)', '7:00 AM - 5:00 PM (Mon-Fri)', null, 'Public Senior High • DepEd', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Stand-Alone Senior High School No. 5 (San Jose)')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Maranatha Christian Academy - Kasiglahan', 14.7462, 121.135, 'Kasiglahan Village 1K1, Brgy. San Jose, Rodriguez, Rizal', '7:00 AM - 4:00 PM (Mon-Fri)', null, 'Private Elementary & Junior High', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Maranatha Christian Academy - Kasiglahan')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Southville 8B Elementary School', 14.7601, 121.1506, 'Southville 8-B, Brgy. San Isidro, Rodriguez, Rizal', '8:00 AM - 4:00 PM (Mon-Fri)', null, 'Kinder • Public Day Care', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Southville 8B Elementary School')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Colegio de Montalban (Pamantasan ng Montalban)', 14.7504, 121.1417, 'Kasiglahan Village, Brgy. San Jose, Rodriguez, Rizal', '8:00 AM - 5:00 PM (Mon-Sat)', null, 'College • Semi-public • TESDA & CHED courses', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Colegio de Montalban (Pamantasan ng Montalban)')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'University of Rizal System - Rodriguez Campus', 14.7491, 121.1274, 'T. Reyes St., Amityville Subd., Brgy. San Jose, Rodriguez, Rizal', '8:00 AM - 5:00 PM (Mon-Fri)', null, 'State University • CHED • Public college', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('University of Rizal System - Rodriguez Campus')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'FEU Roosevelt - Rodriguez Campus', 14.7287, 121.1397, 'Lardizabal St., Brgy. Manggahan, Rodriguez, Rizal', '7:00 AM - 5:00 PM (Mon-Fri)', null, 'Private College & Senior High • FEU Group', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('FEU Roosevelt - Rodriguez Campus')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Asian Institute of Computer Studies - Montalban Campus', 14.7368, 121.1365, 'Rodriguez Highway, Brgy. San Jose, Rodriguez, Rizal', '8:00 AM - 5:00 PM (Mon-Sat)', null, 'Private College • IT & Business', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Asian Institute of Computer Studies - Montalban Campus')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'College of Arts and Sciences of Asia and the Pacific', 14.7402, 121.1422, 'Brgy. San Jose, Rodriguez, Rizal', '8:00 AM - 5:00 PM (Mon-Sat)', null, 'Private College', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('College of Arts and Sciences of Asia and the Pacific')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Frobelian College of Science & Technology', 14.7385, 121.1355, 'Brgy. San Jose, Rodriguez, Rizal', '8:00 AM - 5:00 PM (Mon-Fri)', null, 'Private College • Science & Tech', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Frobelian College of Science & Technology')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'St. Joseph College - Rodriguez', 14.7412, 121.1438, 'Brgy. San Jose, Rodriguez, Rizal', '7:00 AM - 5:00 PM (Mon-Fri)', null, 'Private College & Basic Ed', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('St. Joseph College - Rodriguez')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'San Jose National High School', 14.743, 121.1458, 'Ipil St., Brgy. San Jose, Rodriguez, Rizal', '6:00 AM - 6:00 PM (Mon-Fri)', null, 'Public • Junior & Senior High', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('San Jose National High School')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Kasiglahan Village Senior High School', 14.741, 121.1406, 'Granite St., Phase 1K2, Kasiglahan Village, Brgy. San Jose, Rodriguez, Rizal', '6:00 AM - 6:00 PM (Mon-Fri)', null, 'Public Senior High • Kasiglahan Annex', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Kasiglahan Village Senior High School')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Southville 8C National High School', 14.7549, 121.1433, 'Double L, Southville 8C, Brgy. San Isidro, Rodriguez, Rizal', '6:00 AM - 5:00 PM (Mon-Fri)', null, 'Public High School', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Southville 8C National High School')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Tagumpay National High School', 14.7453, 121.1313, 'Tagumpay, Brgy. San Jose, Rodriguez, Rizal', '6:00 AM - 6:00 PM (Mon-Fri)', null, 'Public High School • 308114', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Tagumpay National High School')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Tagumpay Elementary School', 14.7458, 121.1315, 'Tagumpay, Brgy. San Jose, Rodriguez, Rizal', '6:00 AM - 5:00 PM (Mon-Fri)', null, 'Public Elementary', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Tagumpay Elementary School')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Southville 8C Elementary School', 14.756, 121.1452, 'Southville 8-C, Brgy. San Isidro, Rodriguez, Rizal', '6:00 AM - 5:00 PM (Mon-Fri)', null, 'Public Elementary', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Southville 8C Elementary School')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Wawa National High School', 14.7308, 121.1853, 'M.H. Del Pilar Ave., Brgy. San Rafael (Wawa), Rodriguez, Rizal', '6:00 AM - 5:00 PM (Mon-Fri)', null, 'Public High School', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Wawa National High School')));
insert into public.community_school (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Kasiglahan Village Elementary School Unit I', 14.7465, 121.1378, 'Block 40 Phase 1A, Kasiglahan Village, Brgy. San Jose', '6:00 AM - 5:00 PM (Mon-Fri)', null, 'Public Elementary • Unit I', false, null
where not exists (select 1 from public.community_school where lower(trim(name)) = lower(trim('Kasiglahan Village Elementary School Unit I')));

-- community_vet: 2 places
insert into public.community_vet (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'San Jose Veterinary Clinic', 14.7417, 121.145, 'J.P. Rizal Avenue, Brgy. San Jose', '9:00 AM - 6:00 PM', null, null, false, null
where not exists (select 1 from public.community_vet where lower(trim(name)) = lower(trim('San Jose Veterinary Clinic')));
insert into public.community_vet (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Paws & Claws Animal Clinic - Amityville', 14.7341, 121.1276, 'Amityville Subdivision, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.community_vet where lower(trim(name)) = lower(trim('Paws & Claws Animal Clinic - Amityville')));

-- community_wifi: 3 places
insert into public.community_wifi (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Free WiFi Zone - Barangay San Jose Hall', 14.7412, 121.1472, 'San Jose Proper, Brgy. San Jose', '8:00 AM - 5:00 PM', null, 'Free WiFi (barangay project)', false, null
where not exists (select 1 from public.community_wifi where lower(trim(name)) = lower(trim('Free WiFi Zone - Barangay San Jose Hall')));
insert into public.community_wifi (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Free WiFi Zone - Kasiglahan Plaza', 14.745, 121.1365, 'Kasiglahan Village 1K1 Plaza, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.community_wifi where lower(trim(name)) = lower(trim('Free WiFi Zone - Kasiglahan Plaza')));
insert into public.community_wifi (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Load & E-Load Station - San Jose Proper', 14.742, 121.1458, 'J.P. Rizal Avenue, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.community_wifi where lower(trim(name)) = lower(trim('Load & E-Load Station - San Jose Proper')));

-- emergency_barangay: 3 places
insert into public.emergency_barangay (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Barangay San Jose Hall & Operations Center', 14.74115, 121.14715, 'J.P. Rizal Avenue, San Jose Proper, Brgy. San Jose', '8:00 AM - 5:00 PM (Mon-Fri)', '(02) 8997-1823', null, false, null
where not exists (select 1 from public.emergency_barangay where lower(trim(name)) = lower(trim('Barangay San Jose Hall & Operations Center')));
insert into public.emergency_barangay (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'BDRRMC San Jose Emergency Operations Center', 14.74095, 121.14745, 'Barangay Hall compound, San Jose Proper', '24 hours during storms', '0917-890-7265', null, false, null
where not exists (select 1 from public.emergency_barangay where lower(trim(name)) = lower(trim('BDRRMC San Jose Emergency Operations Center')));
insert into public.emergency_barangay (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Barangay San Jose Satellite Office (Kasiglahan 1K2)', 14.7455, 121.1368, 'Kasiglahan Village 1K2, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.emergency_barangay where lower(trim(name)) = lower(trim('Barangay San Jose Satellite Office (Kasiglahan 1K2)')));

-- emergency_clinic: 3 places
insert into public.emergency_clinic (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Brgy. San Jose Health Center (Main)', 14.74225, 121.14645, 'Beside the Barangay Hall, San Jose Proper', '8:00 AM - 5:00 PM (Mon-Fri)', '(02) 8997-1823', 'Prenatal, immunization, free check-ups', false, null
where not exists (select 1 from public.emergency_clinic where lower(trim(name)) = lower(trim('Brgy. San Jose Health Center (Main)')));
insert into public.emergency_clinic (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Kasiglahan Birthing Home & Clinic', 14.74575, 121.13615, 'Kasiglahan Village 1K1, Brgy. San Jose', '24 hours', null, null, false, null
where not exists (select 1 from public.emergency_clinic where lower(trim(name)) = lower(trim('Kasiglahan Birthing Home & Clinic')));
insert into public.emergency_clinic (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Eastwood Medical Clinic & Laboratory', 14.7388, 121.1218, 'Eastwood Greenview Phase 1, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.emergency_clinic where lower(trim(name)) = lower(trim('Eastwood Medical Clinic & Laboratory')));

-- emergency_evacuation: 4 places
insert into public.emergency_evacuation (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Kasiglahan Village Elementary School Gym', 14.7461, 121.1352, 'Kasiglahan Village, Brgy. San Jose', null, null, 'Main evacuation center when the river rises', false, null
where not exists (select 1 from public.emergency_evacuation where lower(trim(name)) = lower(trim('Kasiglahan Village Elementary School Gym')));
insert into public.emergency_evacuation (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Brgy. San Jose Covered Court (Evacuation Center)', 14.7413, 121.147, 'San Jose Proper, beside the Barangay Hall', null, null, 'Has a generator and water stock', false, null
where not exists (select 1 from public.emergency_evacuation where lower(trim(name)) = lower(trim('Brgy. San Jose Covered Court (Evacuation Center)')));
insert into public.emergency_evacuation (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Sub-Urban Housing Multi-Purpose Hall', 14.7508, 121.141, 'Sub-Urban Housing, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.emergency_evacuation where lower(trim(name)) = lower(trim('Sub-Urban Housing Multi-Purpose Hall')));
insert into public.emergency_evacuation (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Amityville Subdivision Multi-Purpose Hall', 14.7334, 121.1282, 'Amityville Subdivision, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.emergency_evacuation where lower(trim(name)) = lower(trim('Amityville Subdivision Multi-Purpose Hall')));

-- emergency_fire: 1 place
insert into public.emergency_fire (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'BFP Rodriguez Fire Station', 14.73085, 121.12015, 'Municipal compound, Rodriguez (Montalban), Rizal', '24 hours', '(02) 8948-2211', null, false, null
where not exists (select 1 from public.emergency_fire where lower(trim(name)) = lower(trim('BFP Rodriguez Fire Station')));

-- emergency_hospital: 2 places
insert into public.emergency_hospital (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Rodriguez Municipal Hospital (Emergency Room)', 14.73255, 121.12155, 'Rodriguez (Montalban) town proper, ~2 km from San Jose', '24 hours emergency', null, 'Closest emergency room in the barangay', false, null
where not exists (select 1 from public.emergency_hospital where lower(trim(name)) = lower(trim('Rodriguez Municipal Hospital (Emergency Room)')));
insert into public.emergency_hospital (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Montalban Medical Center', 14.73605, 121.13415, 'Rodriguez Highway, Brgy. Rosario (San Jose boundary)', '24 hours emergency', null, null, false, null
where not exists (select 1 from public.emergency_hospital where lower(trim(name)) = lower(trim('Montalban Medical Center')));

-- emergency_police: 2 places
insert into public.emergency_police (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Barangay San Jose Police Outpost / Barangay Watch Station', 14.74265, 121.14625, 'Beside the Barangay Hall, San Jose Proper', '24 hours (barangay watch duty)', '(02) 8997-1823', null, false, null
where not exists (select 1 from public.emergency_police where lower(trim(name)) = lower(trim('Barangay San Jose Police Outpost / Barangay Watch Station')));
insert into public.emergency_police (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'PNP Rodriguez Sub-Station', 14.73065, 121.1197, 'Rodriguez (Montalban) town proper, near San Jose', '24 hours', '(02) 8941-1191', null, false, null
where not exists (select 1 from public.emergency_police where lower(trim(name)) = lower(trim('PNP Rodriguez Sub-Station')));

-- essentials_bakery: 3 places
insert into public.essentials_bakery (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Julie''s Bakeshop - Kasiglahan Village', 14.7451, 121.1361, 'Kasiglahan Village 1K1, Brgy. San Jose', '5:00 AM - 9:00 PM', null, 'Fresh bread rolls every morning', false, null
where not exists (select 1 from public.essentials_bakery where lower(trim(name)) = lower(trim('Julie''s Bakeshop - Kasiglahan Village')));
insert into public.essentials_bakery (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'San Jose Bakery', 14.7416, 121.1459, 'San Jose Proper, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.essentials_bakery where lower(trim(name)) = lower(trim('San Jose Bakery')));
insert into public.essentials_bakery (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Montalban Bakeshop - Town Center', 14.74, 121.1484, 'Montalban Town Center, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.essentials_bakery where lower(trim(name)) = lower(trim('Montalban Bakeshop - Town Center')));

-- essentials_bigasan: 2 places
insert into public.essentials_bigasan (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'San Jose Rice Retailer', 14.7421, 121.146, 'San Jose Proper, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.essentials_bigasan where lower(trim(name)) = lower(trim('San Jose Rice Retailer')));
insert into public.essentials_bigasan (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Kasiglahan Rice Supply', 14.7447, 121.1356, 'Kasiglahan Village 1K1, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.essentials_bigasan where lower(trim(name)) = lower(trim('Kasiglahan Rice Supply')));

-- essentials_convenience: 4 places
insert into public.essentials_convenience (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Kasiglahan 24/7 Mini Mart', 14.7449, 121.1358, 'Kasiglahan Village 1K1 Main Road, Brgy. San Jose', '5:00 AM - 11:00 PM', null, null, false, null
where not exists (select 1 from public.essentials_convenience where lower(trim(name)) = lower(trim('Kasiglahan 24/7 Mini Mart')));
insert into public.essentials_convenience (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'San Jose Mini Mart', 14.7419, 121.1463, 'J.P. Rizal Avenue, San Jose Proper, Brgy. San Jose', '6:00 AM - 10:00 PM', null, null, false, null
where not exists (select 1 from public.essentials_convenience where lower(trim(name)) = lower(trim('San Jose Mini Mart')));
insert into public.essentials_convenience (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Tagumpay Convenience Hub', 14.7556, 121.1328, 'Tagumpay Village entrance, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.essentials_convenience where lower(trim(name)) = lower(trim('Tagumpay Convenience Hub')));
insert into public.essentials_convenience (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Amityville Community Store', 14.7338, 121.1277, 'Amityville 4th Avenue, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.essentials_convenience where lower(trim(name)) = lower(trim('Amityville Community Store')));

-- essentials_hardware: 3 places
insert into public.essentials_hardware (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'San Jose Hardware & Construction Supply', 14.7424, 121.1455, 'J.P. Rizal Avenue, San Jose Proper, Brgy. San Jose', '7:30 AM - 6:00 PM', null, null, false, null
where not exists (select 1 from public.essentials_hardware where lower(trim(name)) = lower(trim('San Jose Hardware & Construction Supply')));
insert into public.essentials_hardware (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Montalban Builders Depot', 14.7345, 121.1265, 'Rodriguez Highway area, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.essentials_hardware where lower(trim(name)) = lower(trim('Montalban Builders Depot')));
insert into public.essentials_hardware (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Eastwood Hardware', 14.7384, 121.1226, 'Eastwood Greenview Phase 2, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.essentials_hardware where lower(trim(name)) = lower(trim('Eastwood Hardware')));

-- essentials_laundry: 2 places
insert into public.essentials_laundry (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Wash & Fold Laundry - Amityville', 14.7337, 121.1279, 'Amityville Subdivision, Brgy. San Jose', '7:00 AM - 8:00 PM', null, null, false, null
where not exists (select 1 from public.essentials_laundry where lower(trim(name)) = lower(trim('Wash & Fold Laundry - Amityville')));
insert into public.essentials_laundry (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Kasiglahan Laundry Hub', 14.7453, 121.1359, 'Kasiglahan Village 1K2, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.essentials_laundry where lower(trim(name)) = lower(trim('Kasiglahan Laundry Hub')));

-- essentials_lpg: 3 places
insert into public.essentials_lpg (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'LPG Dealer - Kasiglahan 1K1', 14.7448, 121.1363, 'Kasiglahan Village 1K1 Main Road, Brgy. San Jose', '7:00 AM - 7:00 PM', null, 'Tank swap and delivery', false, null
where not exists (select 1 from public.essentials_lpg where lower(trim(name)) = lower(trim('LPG Dealer - Kasiglahan 1K1')));
insert into public.essentials_lpg (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'LPG Republic - Amityville', 14.7339, 121.1274, 'Amityville Subdivision, Brgy. San Jose', '8:00 AM - 6:00 PM', null, null, false, null
where not exists (select 1 from public.essentials_lpg where lower(trim(name)) = lower(trim('LPG Republic - Amityville')));
insert into public.essentials_lpg (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Petron LPG - Litex Corridor', 14.7287, 121.1126, 'Litex / Gravel Pit Corridor, Brgy. San Jose', '7:00 AM - 7:00 PM', null, null, false, null
where not exists (select 1 from public.essentials_lpg where lower(trim(name)) = lower(trim('Petron LPG - Litex Corridor')));

-- essentials_market: 2 places
insert into public.essentials_market (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Kasiglahan Public Market', 14.7446, 121.136, 'Kasiglahan Village 1K1, Brgy. San Jose', '4:30 AM - 7:00 PM', null, 'Fish, vegetables and meat every morning', false, null
where not exists (select 1 from public.essentials_market where lower(trim(name)) = lower(trim('Kasiglahan Public Market')));
insert into public.essentials_market (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Montalban Public Market', 14.733, 121.118, 'Rodriguez (Montalban) town proper, near San Jose', '4:00 AM - 8:00 PM', null, null, false, null
where not exists (select 1 from public.essentials_market where lower(trim(name)) = lower(trim('Montalban Public Market')));

-- essentials_pharmacy: 4 places
insert into public.essentials_pharmacy (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Mercury Drug - Kasiglahan Village', 14.745, 121.1357, 'Kasiglahan Village 1K1 Commercial Row, Brgy. San Jose', '7:00 AM - 10:00 PM', null, 'Free blood pressure checks', false, null
where not exists (select 1 from public.essentials_pharmacy where lower(trim(name)) = lower(trim('Mercury Drug - Kasiglahan Village')));
insert into public.essentials_pharmacy (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Mercury Drug - Montalban Town Center', 14.7401, 121.1487, 'Montalban Town Center, Brgy. San Jose', '7:00 AM - 10:00 PM', null, null, false, null
where not exists (select 1 from public.essentials_pharmacy where lower(trim(name)) = lower(trim('Mercury Drug - Montalban Town Center')));
insert into public.essentials_pharmacy (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Generika Drugstore - Litex', 14.7291, 121.1133, 'Litex Market Access Road, Brgy. San Jose', '8:00 AM - 9:00 PM', null, null, false, null
where not exists (select 1 from public.essentials_pharmacy where lower(trim(name)) = lower(trim('Generika Drugstore - Litex')));
insert into public.essentials_pharmacy (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Barangay San Jose Pharmacy', 14.7414, 121.1466, 'Beside Barangay San Jose Hall, J.P. Rizal Avenue', '8:00 AM - 5:00 PM', null, 'Affordable medicine for residents', false, null
where not exists (select 1 from public.essentials_pharmacy where lower(trim(name)) = lower(trim('Barangay San Jose Pharmacy')));

-- essentials_seven_eleven: 6 places
insert into public.essentials_seven_eleven (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select '7-Eleven Kasiglahan Village (1K1)', 14.74565, 121.13665, 'Kasiglahan Village 1K1, Brgy. San Jose, Rodriguez, Rizal', 'Open 24 hours', null, 'Slurpee, load, bills payment, GCash cash-in', false, null
where not exists (select 1 from public.essentials_seven_eleven where lower(trim(name)) = lower(trim('7-Eleven Kasiglahan Village (1K1)')));
insert into public.essentials_seven_eleven (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select '7-Eleven Montalban Town Center', 14.74025, 121.14895, 'Montalban Town Center, Rodriguez Highway, Brgy. San Jose', 'Open 24 hours', null, 'Near BDO and the tricycle terminal', false, null
where not exists (select 1 from public.essentials_seven_eleven where lower(trim(name)) = lower(trim('7-Eleven Montalban Town Center')));
insert into public.essentials_seven_eleven (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select '7-Eleven Eastwood Greenview', 14.73865, 121.12225, 'Eastwood Greenview Subd., Phase 4, Brgy. San Jose', 'Open 24 hours', null, 'Near the Eastwood chapel and the Phase 2 gate', false, null
where not exists (select 1 from public.essentials_seven_eleven where lower(trim(name)) = lower(trim('7-Eleven Eastwood Greenview')));
insert into public.essentials_seven_eleven (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select '7-Eleven Litex Road', 14.72895, 121.11315, 'Litex Market Access Road, Brgy. San Jose (Litex corridor)', 'Open 24 hours', null, 'Across from the Gravel Pit', false, null
where not exists (select 1 from public.essentials_seven_eleven where lower(trim(name)) = lower(trim('7-Eleven Litex Road')));
insert into public.essentials_seven_eleven (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select '7-Eleven J.P. Rizal (San Jose Proper)', 14.74315, 121.14525, 'J.P. Rizal Avenue, San Jose Proper, Brgy. San Jose', 'Open 24 hours', null, 'Near Barangay San Jose Hall', false, null
where not exists (select 1 from public.essentials_seven_eleven where lower(trim(name)) = lower(trim('7-Eleven J.P. Rizal (San Jose Proper)')));
insert into public.essentials_seven_eleven (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select '7-Eleven Tagumpay / Metro Montana', 14.75595, 121.13315, 'Tagumpay Main Spine Road, Metro Montana, Brgy. San Jose', 'Open 24 hours', null, null, false, null
where not exists (select 1 from public.essentials_seven_eleven where lower(trim(name)) = lower(trim('7-Eleven Tagumpay / Metro Montana')));

-- essentials_supermarket: 3 places
insert into public.essentials_supermarket (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Puregold Montalban', 14.7368, 121.1379, 'Rodriguez Highway, Brgy. Rosario (next to San Jose)', '8:00 AM - 9:00 PM', null, 'Full grocery, ATM inside', false, null
where not exists (select 1 from public.essentials_supermarket where lower(trim(name)) = lower(trim('Puregold Montalban')));
insert into public.essentials_supermarket (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Montalban Town Center Supermarket', 14.7403, 121.1486, 'Montalban Town Center, Rodriguez Highway, Brgy. San Jose', '9:00 AM - 8:00 PM', null, null, false, null
where not exists (select 1 from public.essentials_supermarket where lower(trim(name)) = lower(trim('Montalban Town Center Supermarket')));
insert into public.essentials_supermarket (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Kasiglahan Village Grocery', 14.7452, 121.1362, 'Kasiglahan Village 1K2, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.essentials_supermarket where lower(trim(name)) = lower(trim('Kasiglahan Village Grocery')));

-- essentials_water: 4 places
insert into public.essentials_water (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Aquabest Water Refilling - Kasiglahan', 14.7454, 121.1364, 'Kasiglahan Village 1K1, Brgy. San Jose', '7:00 AM - 8:00 PM', '0917-000-0000', 'Deliveries across Kasiglahan', false, null
where not exists (select 1 from public.essentials_water where lower(trim(name)) = lower(trim('Aquabest Water Refilling - Kasiglahan')));
insert into public.essentials_water (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Crystal Clear Water Station', 14.7417, 121.1468, 'J.P. Rizal Avenue, San Jose Proper, Brgy. San Jose', '7:00 AM - 8:00 PM', null, null, false, null
where not exists (select 1 from public.essentials_water where lower(trim(name)) = lower(trim('Crystal Clear Water Station')));
insert into public.essentials_water (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Amityville Water Depot', 14.7336, 121.1281, 'Amityville Subdivision, Brgy. San Jose', '6:30 AM - 8:30 PM', null, null, false, null
where not exists (select 1 from public.essentials_water where lower(trim(name)) = lower(trim('Amityville Water Depot')));
insert into public.essentials_water (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'AquaQuest Water Station - Tagumpay', 14.7562, 121.1329, 'Tagumpay Village, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.essentials_water where lower(trim(name)) = lower(trim('AquaQuest Water Station - Tagumpay')));

-- money_atm: 4 places
insert into public.money_atm (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'BDO ATM - Montalban Town Center', 14.7402, 121.1485, 'GF, Montalban Town Center, Rodriguez Highway cor. Lardizabal St.', '24 hours', null, null, false, null
where not exists (select 1 from public.money_atm where lower(trim(name)) = lower(trim('BDO ATM - Montalban Town Center')));
insert into public.money_atm (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'BPI ATM - Kasiglahan Village', 14.745, 121.136, 'Kasiglahan Village 1K1 Commercial Row, Brgy. San Jose', '24 hours', null, null, false, null
where not exists (select 1 from public.money_atm where lower(trim(name)) = lower(trim('BPI ATM - Kasiglahan Village')));
insert into public.money_atm (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Landbank ATM - Rodriguez Municipal Hall', 14.7307, 121.1198, 'Municipal compound, Rodriguez, Rizal', '24 hours', null, null, false, null
where not exists (select 1 from public.money_atm where lower(trim(name)) = lower(trim('Landbank ATM - Rodriguez Municipal Hall')));
insert into public.money_atm (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'GCash / Cash-in Kiosk - Kasiglahan 1K1', 14.7448, 121.1354, 'Kasiglahan Village 1K1, Brgy. San Jose', '7:00 AM - 9:00 PM', null, null, false, null
where not exists (select 1 from public.money_atm where lower(trim(name)) = lower(trim('GCash / Cash-in Kiosk - Kasiglahan 1K1')));

-- money_bank: 3 places
insert into public.money_bank (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'BDO Montalban Town Center', 14.7401, 121.1485, 'GF, Montalban Town Center, Rodriguez Highway cor. Lardizabal St., Brgy. San Jose', '9:00 AM - 4:00 PM (Mon-Fri)', '948-2718', null, false, null
where not exists (select 1 from public.money_bank where lower(trim(name)) = lower(trim('BDO Montalban Town Center')));
insert into public.money_bank (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Landbank Rodriguez Branch', 14.7308, 121.1199, 'Rodriguez (Montalban) town proper', '9:00 AM - 4:00 PM (Mon-Fri)', null, null, false, null
where not exists (select 1 from public.money_bank where lower(trim(name)) = lower(trim('Landbank Rodriguez Branch')));
insert into public.money_bank (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'CARD Bank - Kasiglahan Village', 14.7453, 121.1365, 'Kasiglahan Village 1K1, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.money_bank where lower(trim(name)) = lower(trim('CARD Bank - Kasiglahan Village')));

-- money_pawnshop: 3 places
insert into public.money_pawnshop (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Cebuana Lhuillier - Kasiglahan', 14.7451, 121.1359, 'Kasiglahan Village 1K1, Brgy. San Jose', '8:00 AM - 6:00 PM', null, null, false, null
where not exists (select 1 from public.money_pawnshop where lower(trim(name)) = lower(trim('Cebuana Lhuillier - Kasiglahan')));
insert into public.money_pawnshop (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'M Lhuillier - Montalban Town Center', 14.7403, 121.1483, 'Montalban Town Center, Brgy. San Jose', '8:00 AM - 6:00 PM', null, null, false, null
where not exists (select 1 from public.money_pawnshop where lower(trim(name)) = lower(trim('M Lhuillier - Montalban Town Center')));
insert into public.money_pawnshop (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Palawan Pawnshop - San Jose Proper', 14.7422, 121.1454, 'J.P. Rizal Avenue, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.money_pawnshop where lower(trim(name)) = lower(trim('Palawan Pawnshop - San Jose Proper')));

-- money_remittance: 3 places
insert into public.money_remittance (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Palawan Express Remittance - Kasiglahan', 14.745, 121.1355, 'Kasiglahan Village 1K1, Brgy. San Jose', '8:00 AM - 7:00 PM', null, null, false, null
where not exists (select 1 from public.money_remittance where lower(trim(name)) = lower(trim('Palawan Express Remittance - Kasiglahan')));
insert into public.money_remittance (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'LBC Express - San Jose Proper', 14.7424, 121.1452, 'J.P. Rizal Avenue, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.money_remittance where lower(trim(name)) = lower(trim('LBC Express - San Jose Proper')));
insert into public.money_remittance (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'GCash Remittance Partner - Kasiglahan 1K1', 14.7446, 121.1352, 'Kasiglahan Village 1K1, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.money_remittance where lower(trim(name)) = lower(trim('GCash Remittance Partner - Kasiglahan 1K1')));

-- travel_gas: 3 places
insert into public.travel_gas (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Petron - Rodriguez Highway (San Jose)', 14.73625, 121.13455, 'Rodriguez Highway, Brgy. San Jose', '24 hours', null, null, false, null
where not exists (select 1 from public.travel_gas where lower(trim(name)) = lower(trim('Petron - Rodriguez Highway (San Jose)')));
insert into public.travel_gas (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Shell - Litex / J.P. Rizal', 14.72865, 121.11285, 'Litex corridor, Brgy. San Jose', '24 hours', null, null, false, null
where not exists (select 1 from public.travel_gas where lower(trim(name)) = lower(trim('Shell - Litex / J.P. Rizal')));
insert into public.travel_gas (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Phoenix - Kasiglahan Village', 14.7464, 121.1372, 'Kasiglahan Village, Brgy. San Jose', '5:00 AM - 10:00 PM', null, null, false, null
where not exists (select 1 from public.travel_gas where lower(trim(name)) = lower(trim('Phoenix - Kasiglahan Village')));

-- travel_parking: 2 places
insert into public.travel_parking (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Barangay San Jose Hall Parking', 14.7414, 121.1473, 'Barangay Hall compound, San Jose Proper', null, null, null, false, null
where not exists (select 1 from public.travel_parking where lower(trim(name)) = lower(trim('Barangay San Jose Hall Parking')));
insert into public.travel_parking (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Montalban Town Center Parking', 14.7404, 121.1488, 'Montalban Town Center, Rodriguez Highway', null, null, null, false, null
where not exists (select 1 from public.travel_parking where lower(trim(name)) = lower(trim('Montalban Town Center Parking')));

-- travel_terminal: 3 places
insert into public.travel_terminal (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Tricycle Terminal - Barangay San Jose Plaza', 14.7413, 121.1466, 'San Jose Proper, Brgy. San Jose', '4:30 AM - 10:00 PM', null, null, false, null
where not exists (select 1 from public.travel_terminal where lower(trim(name)) = lower(trim('Tricycle Terminal - Barangay San Jose Plaza')));
insert into public.travel_terminal (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Kasiglahan TODA Terminal (1K1)', 14.7454, 121.1356, 'Kasiglahan Village 1K1, Brgy. San Jose', '5:00 AM - 11:00 PM', null, null, false, null
where not exists (select 1 from public.travel_terminal where lower(trim(name)) = lower(trim('Kasiglahan TODA Terminal (1K1)')));
insert into public.travel_terminal (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Jeepney Terminal - Rodriguez Highway', 14.7357, 121.1342, 'Rodriguez Highway (San Jose / Rosario boundary)', null, null, 'Trips to Rodriguez-Cubao and San Mateo', false, null
where not exists (select 1 from public.travel_terminal where lower(trim(name)) = lower(trim('Jeepney Terminal - Rodriguez Highway')));

-- travel_vulcanizing: 3 places
insert into public.travel_vulcanizing (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Kuya Boy''s Tire Shop - Kasiglahan', 14.7446, 121.1366, 'Kasiglahan Village 1K1, Brgy. San Jose', '6:00 AM - 9:00 PM', null, 'Tire patch and interior repair', false, null
where not exists (select 1 from public.travel_vulcanizing where lower(trim(name)) = lower(trim('Kuya Boy''s Tire Shop - Kasiglahan')));
insert into public.travel_vulcanizing (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'San Jose Tire Supply & Auto Repair', 14.7427, 121.1449, 'J.P. Rizal Avenue, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.travel_vulcanizing where lower(trim(name)) = lower(trim('San Jose Tire Supply & Auto Repair')));
insert into public.travel_vulcanizing (name, latitude, longitude, address, hours, phone, note, approx, replaces_id)
select 'Amityville Auto Repair & Tire Shop', 14.7332, 121.1284, 'Amityville Subdivision, Brgy. San Jose', null, null, null, false, null
where not exists (select 1 from public.travel_vulcanizing where lower(trim(name)) = lower(trim('Amityville Auto Repair & Tire Shop')));
