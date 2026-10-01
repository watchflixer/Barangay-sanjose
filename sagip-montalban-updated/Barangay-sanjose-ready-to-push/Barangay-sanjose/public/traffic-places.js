/* ============================================================================
 * traffic-places.js — LOCAL DESTINATION GAZETTEER for the Traffic map search
 * ============================================================================
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * A curated OFFLINE supplement, not a complete inventory and not Google's
 * private database. Live geocoders can miss resident spellings/phase names.
 * The search UI also queries live providers; see traffic-search.js and the
 * optional official Google Places UI Kit connector in traffic-google.js.
 *
 * Area/subdivision/sitio coordinates identify an AREA, not every building,
 * block, lot or entrance inside it. `ap: 1` identifies approximate entries.
 * Never attach an invented block/lot label to an area's centroid. Verify new
 * entries and source/licence; do not bulk-copy Google's database into here.
 *
 * ---------------------------------------------------------------------------
 * HOW TO ADD A PLACE  (anyone can edit this — no build step, no framework)
 * ---------------------------------------------------------------------------
 *   { n: '<name shown in results>',
 *     a: '<alias 1>|<alias 2>|<alias 3>',   // optional, pipe separated
 *     lat: 14.7535503,
 *     lng: 121.1381778,
 *     k: 'subdivision',                      // icon/category, see KINDS below
 *     c: 'San Jose, Rodriguez (Montalban), Rizal',   // address sub-line
 *     ap: 1 }                                // optional: coordinates are
 *                                            // approximate (shows "approx")
 *
 * KINDS: subdivision, sitio, barangay, landmark, gov, school, health, shop,
 *        worship, transport, road, town
 *
 * HOW TO GET ACCURATE COORDINATES
 *   Use a surveyed/device-GPS point or an appropriately licensed OSM/public
 *   source. Record latitude and longitude separately (latitude first).
 *   Verify the physical building/entrance with local officials/residents;
 *   retain the source and mark approximate coordinates with `ap: 1`.
 *
 * TIP: add the shortcuts people really type — "sub urban", "1k1",
 *      misspellings — into the `a` field. Matching ignores case, hyphens,
 *      commas and "brgy/blk/phase" spelling differences automatically.
 *
 * ---------------------------------------------------------------------------
 * DATA CREDIT
 *   Place names / coordinates cross-checked against OpenStreetMap
 *   (© OpenStreetMap contributors, ODbL 1.0 — https://osm.org/copyright)
 *   plus the app's own barangay dataset. Verify critical pin locations with
 *   the barangay office before relying on them for emergency response.
 * ==========================================================================*/
window.TRAFFIC_PLACES = [

  /* ---------------------------------------------------------------------
   * BARANGAY SAN JOSE — subdivisions, phases and residential areas
   * -------------------------------------------------------------------*/
  { n: 'Phase 1-A Sub Urban', a: 'sub urban|suburban|sub-urban|sub urban phase 1a|phase 1a|phase 1 a|sub urban 1a|sub urban san jose|sub urban san isidro|1a sub urban|subdivision phase 1a',
    lat: 14.7535503, lng: 121.1381778, k: 'subdivision', c: 'San Jose / San Isidro, Rodriguez (Montalban), Rizal' },
  { n: 'Sub-Urban Housing (Phase 1-3)',
    a: 'sub urban housing|sub urban homes|suburban housing|sub urban phase 2|sub urban phase 3|sub urban ph 2|sub urban ph 3|sub urban subdivision',
    lat: 14.7510, lng: 121.1412, k: 'subdivision', c: 'Zone 5, San Jose, Rodriguez (Montalban), Rizal', ap: 1 },
  { n: 'Amityville Subdivision', a: 'amityville|amity ville|amityville san jose|amityville subdivision',
    lat: 14.7485072, lng: 121.1285251, k: 'subdivision', c: 'San Jose, Rodriguez (Montalban), Rizal' },
  { n: 'Kasiglahan Village',
    a: 'kasiglahan|kasigalahan|kasiglahan village|kasiglahan 1k1|kasiglahan 1k2|kasiglahan 1k3|1k1|1k2|1k3|kasiglahan village 1k1 and 1k2',
    lat: 14.7418885, lng: 121.1391811, k: 'subdivision', c: 'San Jose / Balite, Rodriguez (Montalban), Rizal' },
  { n: 'Kasiglahan Phase 1A', a: 'kasiglahan phase 1a|kasiglahan ph1a|kasiglahan 1a',
    lat: 14.7436309, lng: 121.1391538, k: 'subdivision', c: 'Barangay San Jose, Rodriguez (Montalban), Rizal' },
  { n: 'Kasiglahan Phase 1B', a: 'kasiglahan phase 1b|kasiglahan ph1b|kasiglahan 1b',
    lat: 14.7439464, lng: 121.1373881, k: 'subdivision', c: 'Barangay San Jose, Rodriguez (Montalban), Rizal' },
  { n: 'Kasiglahan Phase 1D', a: 'kasiglahan phase 1d|kasiglahan ph1d|kasiglahan 1d',
    lat: 14.7415285, lng: 121.1379468, k: 'subdivision', c: 'Barangay San Jose, Rodriguez (Montalban), Rizal' },
  { n: 'Metro Manila Hills',
    a: 'metro manila hills|metro manila hills subdivision|mmh|metro manila hills subd',
    lat: 14.7578149, lng: 121.1314832, k: 'subdivision', c: 'San Jose, Rodriguez (Montalban), Rizal' },
  { n: 'Residencias De Francesca Phase 5',
    a: 'residencias de francesca|francesca|residencias de francesca phase 5|metro manila hills phase 5',
    lat: 14.7539484, lng: 121.1303911, k: 'subdivision', c: 'Metro Manila Hills, San Jose, Rodriguez, Rizal' },
  { n: 'Isabel Terraces Phase 3', a: 'isabel terraces|isabel terraces phase 3|isabel terraces iii',
    lat: 14.7563235, lng: 121.1319521, k: 'subdivision', c: 'San Jose, Rodriguez (Montalban), Rizal' },
  { n: 'Joville 3', a: 'joville|joville 3|joville tres',
    lat: 14.7583753, lng: 121.1401874, k: 'subdivision', c: 'San Jose, Rodriguez (Montalban), Rizal' },
  { n: 'Tagumpay Village', a: 'tagumpay|tagumpay village|tagumpay san jose|metro montana|tagumpay and metro montana',
    lat: 14.7419304, lng: 121.1359461, k: 'subdivision', c: 'Zone 3, San Jose, Rodriguez (Montalban), Rizal' },
  { n: 'Eastwood Greenview',
    a: 'eastwood|eastwood greenview|eastwood greenview and residences|eastwood residences|eastwood san jose',
    lat: 14.7400721, lng: 121.1576571, k: 'subdivision', c: 'San Jose, Rodriguez (Montalban), Rizal' },
  { n: 'Eastwood Greenview Phase 5', a: 'eastwood phase 5|eastwood greenview phase 5',
    lat: 14.7400721, lng: 121.1576571, k: 'subdivision', c: 'San Jose, Rodriguez (Montalban), Rizal' },
  { n: 'Eastwood Residences Phase 2', a: 'eastwood residences phase 2|eastwood phase 2',
    lat: 14.7488060, lng: 121.1586477, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Eastwood Villa', a: 'eastwood villa|eastwood villas',
    lat: 14.7534619, lng: 121.1640186, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'East Wind Homes', a: 'east wind homes|eastwind homes|east wind',
    lat: 14.7386343, lng: 121.1530420, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'East Bellevue Residences', a: 'east bellevue|east bellevue residences',
    lat: 14.7517694, lng: 121.1522441, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'East Meridian Residences 1', a: 'east meridian|east meridian residences',
    lat: 14.7592174, lng: 121.1560642, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Green Breeze Subdivision', a: 'green breeze|greenbreeze|green breeze subdivision',
    lat: 14.7545302, lng: 121.1554412, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Southville 8-B', a: 'southville 8b|southville 8 b|southville 8-b|southville b',
    lat: 14.7601411, lng: 121.1510481, k: 'subdivision', c: 'San Isidro, Rodriguez (Montalban), Rizal' },
  { n: 'Southville 8-C', a: 'southville 8c|southville 8 c|southville 8-c|southville c|southville 8 c housing project',
    lat: 14.7538111, lng: 121.1432399, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Southville 8 Phase 1', a: 'southville 8 phase 1|southville phase 1|southville 8',
    lat: 14.7622611, lng: 121.1518612, k: 'subdivision', c: 'San Isidro, Rodriguez (Montalban), Rizal' },
  { n: 'Centella Subdivision', a: 'centella|centella subdivision',
    lat: 14.7413754, lng: 121.1503794, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'AFP Housing', a: 'afp housing|afp village|afp',
    lat: 14.7445686, lng: 121.1487485, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Omega Subdivision', a: 'omega|omega subdivision|omega subd',
    lat: 14.7305612, lng: 121.1412352, k: 'subdivision', c: 'San Jose / San Rafael, Rodriguez, Rizal' },
  { n: 'Zuñiga Subdivision', a: 'zuniga|zuniga subdivision|zuñiga subdivision',
    lat: 14.7296724, lng: 121.1433988, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Monte Brisa', a: 'monte brisa|montebrisa',
    lat: 14.7237230, lng: 121.1404055, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Congress Ville', a: 'congress ville|congressville|congress village',
    lat: 14.7242624, lng: 121.1490001, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Alberto Subdivision', a: 'alberto subdivision|alberto subd',
    lat: 14.7125318, lng: 121.1349642, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Doña Maxima Subdivision', a: 'dona maxima|doña maxima|dona maxima subdivision',
    lat: 14.7320255, lng: 121.1501174, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Moriano Compound', a: 'moriano|moriano compound',
    lat: 14.7333160, lng: 121.1501992, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Catherine Homes', a: 'catherine homes|catherene homes',
    lat: 14.7329775, lng: 121.1505935, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Victoria Compound', a: 'victoria compound|victoria',
    lat: 14.7316236, lng: 121.1506266, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Summit View', a: 'summit view|summitview',
    lat: 14.7318457, lng: 121.1526333, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Celina Homes 4', a: 'celina homes|celina homes 4|celina',
    lat: 14.7141807, lng: 121.1319477, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Dela Costa Homes V', a: 'dela costa|dela costa homes|dela costa homes 5',
    lat: 14.7205654, lng: 121.1302536, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Mediterranean Heights Phase 1', a: 'mediterranean heights|mediterranean heights phase 1|mediterranean',
    lat: 14.7307817, lng: 121.1247252, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Mediterranean Heights Phase 2', a: 'mediterranean heights phase 2',
    lat: 14.7321101, lng: 121.1267510, k: 'subdivision', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Gloria Vista Subdivision', a: 'gloria vista|gloria vista subdivision',
    lat: 14.7206867, lng: 121.1559991, k: 'subdivision', c: 'San Rafael, Rodriguez (Montalban), Rizal' },
  { n: 'Felicidad Village Phase 5', a: 'felicidad village|felicidad village phase 5|felicidad',
    lat: 14.7181697, lng: 121.1417200, k: 'subdivision', c: 'Burgos, Rodriguez (Montalban), Rizal' },
  { n: 'Greenrose Subdivision', a: 'greenrose|green rose|greenrose subdivision',
    lat: 14.7326403, lng: 121.1488286, k: 'subdivision', c: 'San Rafael, Rodriguez (Montalban), Rizal' },
  { n: 'Litex / Gravel Pit Corridor',
    a: 'litex|litex road|gravel pit|gravel pit road|litex san jose|litex gravel pit',
    lat: 14.7285, lng: 121.1120, k: 'landmark', c: 'Zone 1, San Jose, Rodriguez (Montalban), Rizal', ap: 1 },
  { n: 'San Jose Proper / J.P. Rizal Street',
    a: 'san jose proper|poblacion|jp rizal|jp rizal street|j p rizal|san jose poblacion|barangay san jose proper',
    lat: 14.7410, lng: 121.1470, k: 'landmark', c: 'Zone 6, San Jose, Rodriguez (Montalban), Rizal', ap: 1 },

  /* ---------------------------------------------------------------------
   * BARANGAY SAN JOSE — sitios / purok / areas
   * -------------------------------------------------------------------*/
  { n: 'Sitio Balite', a: 'sitio balite|balite|balite san jose',
    lat: 14.7615, lng: 121.1460, k: 'sitio', c: 'San Jose, Rodriguez (Montalban), Rizal', ap: 1 },
  { n: 'Sitio Marang', a: 'sitio marang|marang',
    lat: 14.7620, lng: 121.1470, k: 'sitio', c: 'San Jose, Rodriguez (Montalban), Rizal', ap: 1 },
  { n: 'Maislap', a: 'maislap|sitio maislap',
    lat: 14.7626135, lng: 121.1490237, k: 'sitio', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Sitio Tanag', a: 'tanag|sitio tanag',
    lat: 14.7614497, lng: 121.1530156, k: 'sitio', c: 'San Isidro, Rodriguez (Montalban), Rizal' },
  { n: 'Harangan', a: 'harangan|sitio harangan',
    lat: 14.7613050, lng: 121.1397654, k: 'sitio', c: 'San Isidro, Rodriguez (Montalban), Rizal' },
  { n: 'Sitio Duhat', a: 'duhat|sitio duhat',
    lat: 14.7634798, lng: 121.1640246, k: 'sitio', c: 'San Isidro, Rodriguez (Montalban), Rizal' },
  { n: 'Upper Bangkal', a: 'upper bangkal|bangkal|sitio bangkal',
    lat: 14.7658919, lng: 121.1647703, k: 'sitio', c: 'San Isidro, Rodriguez (Montalban), Rizal' },
  { n: 'Sitio Sinaguinan', a: 'sinaguinan|sitio sinaguinan',
    lat: 14.7653356, lng: 121.1596459, k: 'sitio', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Sitio Lukutan Malaki', a: 'lukutan malaki|lukutan|sitio lukutan',
    lat: 14.7734178, lng: 121.1681484, k: 'sitio', c: 'San Isidro, Rodriguez (Montalban), Rizal' },
  { n: 'Sitio Katwiran', a: 'katwiran|sitio katwiran',
    lat: 14.7422224, lng: 121.1683899, k: 'sitio', c: 'Mascap, Rodriguez (Montalban), Rizal' },
  { n: 'Sitio Balagbag', a: 'balagbag|sitio balagbag',
    lat: 14.8136634, lng: 121.1645671, k: 'sitio', c: 'San Isidro, Rodriguez (Montalban), Rizal' },
  { n: 'Sitio Quarry', a: 'quarry|sitio quarry',
    lat: 14.7758706, lng: 121.1164261, k: 'sitio', c: 'Macabud, Rodriguez (Montalban), Rizal' },
  { n: 'Sitio Udyungan', a: 'udyungan|sitio udyungan',
    lat: 14.7817371, lng: 121.1324429, k: 'sitio', c: 'Macabud, Rodriguez (Montalban), Rizal' },
  { n: 'Proper I (Macabud)', a: 'proper 1 macabud|proper i|macabud proper',
    lat: 14.7965957, lng: 121.1397278, k: 'sitio', c: 'Macabud, Rodriguez (Montalban), Rizal' },
  { n: 'Sitio Macaingalan', a: 'macaingalan|sitio macaingalan',
    lat: 14.8092196, lng: 121.2191443, k: 'sitio', c: 'Puray, Rodriguez (Montalban), Rizal' },
  { n: 'Sitio Bagong Sigla', a: 'bagong sigla|sitio bagong sigla',
    lat: 14.7752285, lng: 121.2080219, k: 'sitio', c: 'Puray, Rodriguez (Montalban), Rizal' },
  { n: 'Sitio Quinao', a: 'quinao|sitio quinao',
    lat: 14.7815296, lng: 121.2434822, k: 'sitio', c: 'Puray, Rodriguez (Montalban), Rizal' },
  { n: 'Sitio Malasya Uyungan', a: 'malasya uyungan|malasya|uyungan',
    lat: 14.7443053, lng: 121.2518603, k: 'sitio', c: 'Puray, Rodriguez (Montalban), Rizal' },
  { n: 'Sitio Inigan', a: 'inigan|sitio inigan',
    lat: 14.7220447, lng: 121.1967851, k: 'sitio', c: 'San Rafael, Rodriguez (Montalban), Rizal' },
  { n: 'Sitio Parawagan', a: 'parawagan|sitio parawagan',
    lat: 14.7117003, lng: 121.1758330, k: 'sitio', c: 'San Rafael, Rodriguez (Montalban), Rizal' },
  { n: 'Sitio Sapa', a: 'sapa|sitio sapa',
    lat: 14.7264950, lng: 121.1841854, k: 'sitio', c: 'San Rafael, Rodriguez (Montalban), Rizal' },
  { n: 'Sitio Balite (San Rafael)', a: 'sitio balite san rafael',
    lat: 14.7312035, lng: 121.1616537, k: 'sitio', c: 'San Rafael, Rodriguez (Montalban), Rizal' },
  { n: 'Sitio Hillside', a: 'hillside|sitio hillside',
    lat: 14.7312035, lng: 121.1616537, k: 'sitio', c: 'San Rafael, Rodriguez (Montalban), Rizal' },
  { n: 'Sitio Tabakuhan', a: 'tabakuhan|sitio tabakuhan',
    lat: 14.7639090, lng: 121.1766323, k: 'sitio', c: 'Mascap, Rodriguez (Montalban), Rizal' },
  { n: 'Sitio Wawa', a: 'wawa|sitio wawa|wawa dam|montalban gorge|wawa san rafael',
    lat: 14.7304349, lng: 121.1852683, k: 'landmark', c: 'San Rafael, Rodriguez (Montalban), Rizal' },

  /* ---------------------------------------------------------------------
   * RODRIGUEZ (MONTALBAN) — all 11 barangays
   * -------------------------------------------------------------------*/
  { n: 'Barangay San Jose', a: 'san jose|barangay san jose|brgy san jose|san jose rodriguez|sanjose',
    lat: 14.7312924, lng: 121.1351854, k: 'barangay', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Barangay San Isidro', a: 'san isidro|barangay san isidro|brgy san isidro',
    lat: 14.7612122, lng: 121.1535874, k: 'barangay', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Barangay San Rafael', a: 'san rafael|barangay san rafael|brgy san rafael',
    lat: 14.7353584, lng: 121.1523099, k: 'barangay', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Barangay Balite', a: 'balite|barangay balite|brgy balite',
    lat: 14.7353808, lng: 121.1460440, k: 'barangay', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Barangay Burgos', a: 'burgos|barangay burgos|brgy burgos',
    lat: 14.7186922, lng: 121.1405007, k: 'barangay', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Barangay Geronimo', a: 'geronimo|barangay geronimo|brgy geronimo',
    lat: 14.7317964, lng: 121.1477210, k: 'barangay', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Barangay Macabud', a: 'macabud|barangay macabud|brgy macabud',
    lat: 14.7976175, lng: 121.1395334, k: 'barangay', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Barangay Manggahan', a: 'manggahan|barangay manggahan|brgy manggahan',
    lat: 14.7243425, lng: 121.1429034, k: 'barangay', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Barangay Mascap', a: 'mascap|barangay mascap|brgy mascap',
    lat: 14.7633002, lng: 121.1832997, k: 'barangay', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Barangay Puray', a: 'puray|barangay puray|brgy puray',
    lat: 14.7719401, lng: 121.2044695, k: 'barangay', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Barangay Rosario', a: 'rosario|barangay rosario|brgy rosario',
    lat: 14.7296447, lng: 121.1416601, k: 'barangay', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Montalban (Rodriguez) Town Proper',
    a: 'montalban|rodriguez|rodriguez rizal|montalban rizal|bayan ng montalban|poblacion montalban|town proper',
    lat: 14.7324642, lng: 121.1453418, k: 'town', c: 'Rodriguez (Montalban), Rizal' },

  /* ---------------------------------------------------------------------
   * GOVERNMENT / EMERGENCY
   * -------------------------------------------------------------------*/
  { n: 'Rodriguez Municipal Hall', a: 'municipal hall|rodriguez municipal hall|montalban municipal hall|town hall|munisipyo',
    lat: 14.7324486, lng: 121.1454780, k: 'gov', c: 'J.P. Rizal Avenue, Rodriguez (Montalban), Rizal' },
  { n: 'Rodriguez Municipal Health Office', a: 'municipal health office|health office|mho',
    lat: 14.7334295, lng: 121.1450238, k: 'health', c: 'J.P. Rizal Avenue, Rodriguez (Montalban), Rizal' },
  { n: 'Rodriguez Municipal Gymnasium', a: 'municipal gym|rodriguez gym|gymnasium',
    lat: 14.7324060, lng: 121.1450331, k: 'landmark', c: 'J.P. Rizal Avenue, Rodriguez (Montalban), Rizal' },
  { n: 'Rodriguez Fire Station (BFP)', a: 'fire station|bfp|bureau of fire protection|rodriguez fire|fire',
    lat: 14.7305211, lng: 121.1364830, k: 'gov', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Rodriguez Police Station (PNP)', a: 'police|pnp|police station|rodriguez police|presinto',
    lat: 14.7305574, lng: 121.1364094, k: 'gov', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Compact 4 PNP Sub-Station', a: 'compact 4|compact 4 pnp|pnp substation compact 4',
    lat: 14.7461667, lng: 121.1391198, k: 'gov', c: 'Kasiglahan, Rodriguez (Montalban), Rizal' },
  { n: 'Area 4 Barangay Satellite Office', a: 'area 4|barangay satellite office|area 4 office|satellite office',
    lat: 14.7461155, lng: 121.1372244, k: 'gov', c: 'Pinatubo Street, Rodriguez (Montalban), Rizal' },
  { n: 'San Rafael Barangay Hall', a: 'san rafael barangay hall|barangay hall san rafael',
    lat: 14.7361992, lng: 121.1519836, k: 'gov', c: 'San Rafael, Rodriguez (Montalban), Rizal' },
  { n: 'Burgos Barangay Sub-Station', a: 'burgos substation|barangay sub station burgos',
    lat: 14.7188683, lng: 121.1382835, k: 'gov', c: 'Burgos, Rodriguez (Montalban), Rizal' },

  /* ---------------------------------------------------------------------
   * SHOPPING / COMMERCIAL
   * -------------------------------------------------------------------*/
  { n: 'Robinsons Supermarket Rodriguez', a: 'robinsons|robinsons supermarket|robinsons rodriguez|robinons',
    lat: 14.7306217, lng: 121.1386687, k: 'shop', c: 'E. Rodriguez Highway, Rodriguez (Montalban), Rizal' },
  { n: 'Puregold Rodriguez', a: 'puregold|puregold rodriguez|pure gold',
    lat: 14.7359578, lng: 121.1541734, k: 'shop', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Zuñiga Supermarket', a: 'zuniga supermarket|zuñiga supermarket|zuniga',
    lat: 14.7293729, lng: 121.1426093, k: 'shop', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Mercury Drug (J.P. Rizal)', a: 'mercury drug|mercury|botika|mercury drug jp rizal',
    lat: 14.7288437, lng: 121.1442923, k: 'health', c: 'J.P. Rizal Avenue, Rodriguez (Montalban), Rizal' },
  { n: 'Mercury Drug (E. Rodriguez Highway)', a: 'mercury drug e rodriguez|mercury drug highway',
    lat: 14.7299330, lng: 121.1381739, k: 'health', c: 'E. Rodriguez Highway, Rodriguez, Rizal' },
  { n: 'The Generics Pharmacy (TGP)', a: 'tgp|generics pharmacy|the generics pharmacy',
    lat: 14.7291474, lng: 121.1441020, k: 'health', c: 'J.P. Rizal Avenue, Rodriguez, Rizal' },
  { n: 'Pena Drug Store', a: 'pena drug|pena drugstore',
    lat: 14.7295638, lng: 121.1445351, k: 'health', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Montalban Infirmary Pharmacy', a: 'montalban infirmary pharmacy|infirmary pharmacy',
    lat: 14.7462864, lng: 121.1388112, k: 'health', c: 'Pinatubo Street, Kasiglahan, Rodriguez, Rizal' },
  { n: 'BDO Rodriguez', a: 'bdo|banco de oro|bdo rodriguez|bdo montalban|atm',
    lat: 14.7296646, lng: 121.1394786, k: 'shop', c: 'E. Rodriguez Highway, Rodriguez, Rizal' },
  { n: 'BPI Family Savings Bank Rodriguez', a: 'bpi|bpi family|bpi rodriguez|bpi montalban',
    lat: 14.7287307, lng: 121.1439740, k: 'shop', c: 'E. Rodriguez Highway cor. J.P. Rizal Ave., Rodriguez, Rizal' },

  /* ---------------------------------------------------------------------
   * SCHOOLS / CHURCHES / HEALTH
   * -------------------------------------------------------------------*/
  { n: 'Collegio de Montalban', a: 'collegio de montalban|collegio|cdm',
    lat: 14.7504147, lng: 121.1416362, k: 'school', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Sacred Heart School', a: 'sacred heart school|sacred heart',
    lat: 14.7149492, lng: 121.1367680, k: 'school', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'The Eastbridge School', a: 'eastbridge|the eastbridge school|east bridge school',
    lat: 14.7266730, lng: 121.1433062, k: 'school', c: 'J.P. Rizal Avenue, Rodriguez (Montalban), Rizal' },
  { n: 'Lukutan Malaki Elementary School', a: 'lukutan malaki elementary|elementary school lukutan',
    lat: 14.7830036, lng: 121.1681017, k: 'school', c: 'San Isidro, Rodriguez (Montalban), Rizal' },
  { n: 'Iglesia ni Cristo — Lokal ng Bagong Buhay', a: 'iglesia ni cristo|inc bagong buhay|bagong buhay',
    lat: 14.7542001, lng: 121.1385275, k: 'worship', c: 'Sub-Urban, Rodriguez (Montalban), Rizal' },
  { n: 'Pentecostal Missionary Church (Kasiglahan)', a: 'pentecostal church|pmcc 4th watch kasiglahan',
    lat: 14.7455854, lng: 121.1412170, k: 'worship', c: 'Kasiglahan Village, Rodriguez, Rizal' },
  { n: 'Mahogany Camp', a: 'mahogany camp|mahogany',
    lat: 14.7260091, lng: 121.1952403, k: 'landmark', c: 'Sitio Kalungo, San Rafael, Rodriguez, Rizal' },
  { n: 'Biak na Mukha Viewpoint', a: 'biak na mukha|viewpoint biak na mukha',
    lat: 14.8168113, lng: 121.1779012, k: 'landmark', c: 'Macabud, Rodriguez (Montalban), Rizal' },

  /* ---------------------------------------------------------------------
   * MAIN ROADS (searchable as destinations / landmarks)
   * -------------------------------------------------------------------*/
  { n: 'E. Rodriguez Highway', a: 'e rodriguez highway|rodriguez highway|highway|e rodriguez hwy',
    lat: 14.7313858, lng: 121.1348379, k: 'road', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'J.P. Rizal Avenue', a: 'jp rizal avenue|j p rizal ave|rizal avenue|jp rizal ave',
    lat: 14.7324486, lng: 121.1454780, k: 'road', c: 'Rodriguez (Montalban), Rizal' },
  { n: 'Montalban Bypass Road', a: 'bypass|montalban bypass|rodriguez bypass|bypass road',
    lat: 14.7390, lng: 121.1290, k: 'road', c: 'San Jose, Rodriguez (Montalban), Rizal', ap: 1 }

];
