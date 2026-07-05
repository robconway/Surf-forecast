'use strict';

const WINDY_KEY  = 'nLTvWT2UmcDdp3GkdRiQWDFUdRR5wY19';
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwk3M1tSBx4gVeQY218gTTvQjNIi5SPOUbFpFRYnHHqRi1JkuTkr14NeuPb3W-pgTXXiw/exec';
const CREW_KEY   = 'mlw_crew';
// Free key from https://coastalmonitoring.org/ccoresources/api/, Referer-locked to this domain.
// Leave blank to disable the buoy sanity check entirely.
const CCO_API_KEY = '01eb4cef4d2081defb985705e8450ef8';

function getCrewCode() {
  return (localStorage.getItem(CREW_KEY) || '').toUpperCase().trim() || null;
}
function setCrewCode(raw) {
  const code = (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  if (code) localStorage.setItem(CREW_KEY, code);
  else localStorage.removeItem(CREW_KEY);
  fetchGlobalBias();
  return code;
}

const FB_PROMPTS = [
  'Worth getting up for?', 'Live up to the forecast?', 'Glad you paddled out?',
  'Worth the wetsuit struggle?', 'Better than work?',
  'Did we lie?', 'Were we close?', 'How wrong were we?', 'Rate our guess:',
  'Stoked or skunked?', 'How\'d it go?', 'Get barrelled?',
  'Should\'ve been here an hour ago?', 'Magic or tragic?',
  'Worth the drive?', 'Regret it?', 'Tell us the truth:',
];
function fbPrompt() { return FB_PROMPTS[Math.floor(Math.random() * FB_PROMPTS.length)]; }

// ── Time slots (MSW style: rows) ──────────────────────────────────────────────
const SLOTS = [
  { label: 'DAWN', hour: 6,  spread: 2 },
  { label: 'AM',   hour: 9,  spread: 2 },
  { label: 'NOON', hour: 12, spread: 1 },
  { label: 'PM',   hour: 15, spread: 2 },
  { label: 'DUSK', hour: 18, spread: 2 },
];

// ── Global surf spots database ────────────────────────────────────────────────
const SURF_SPOTS = [
  // UK & Ireland
  { name: 'Fistral Beach',     lat: 50.4145, lon: -5.1044, facing: 315 },
  { name: 'Watergate Bay',     lat: 50.4467, lon: -5.0558, facing: 315 },
  { name: 'Polzeath',          lat: 50.5742, lon: -4.8728, facing: 315 },
  { name: 'Perranporth',       lat: 50.3467, lon: -5.1503, facing: 270 },
  { name: 'Sennen Cove',       lat: 50.0703, lon: -5.6986, facing: 260 },
  { name: 'Bude',              lat: 50.8272, lon: -4.5436, facing: 270 },
  { name: 'Croyde',            lat: 51.1236, lon: -4.2282, facing: 270, noFoil: true,
    offshore: [45, 135], closesOut: 2.3, ability: 'intermediate-advanced', reliability: 4,
    quirks: { tide: 'aroundLow', tideWindow: 2, tideBonus: 2 } },
  { name: 'Croyde Reef',       lat: 51.125,  lon: -4.242,  facing: 270, hidden: true,
    offshore: [45, 135], closesOut: 2.8, ability: 'advanced', reliability: 3,
    notes: 'Holds bigger swell than the beach',
    quirks: { tide: 'aroundLow', tideWindow: 2, tideBonus: 2 } },
  { name: 'Downend Point',     lat: 51.121,  lon: -4.245,  facing: 270,
    offshore: [45, 135], closesOut: 2.3, ability: 'advanced', reliability: 2,
    notes: 'Long lefts on the right swell',
    quirks: { tide: 'pushing', tideBonus: 2, tideWindow: 2 } },
  { name: 'Saunton Sands',     lat: 51.1000, lon: -4.2100, facing: 292, exposure: 0.55,
    offshore: [45, 135], closesOut: 1.9, ability: 'beginner-intermediate',
    quirks: { tide: 'beforeHigh', tideWindow: 2, tideBonus: 2, tideBadHigh: true, windShelter: [315, 45] } },
  { name: 'Putsborough',       lat: 51.1406, lon: -4.2469, facing: 270, exposure: 0.75,
    offshore: [45, 135], closesOut: 1.2, ability: 'beginner-longboard',
    quirks: { tide: 'pushing', tideBonus: 2, tideBadHighWide: true, tideBadLow: true, tideWindow: 2, windShelter: [200, 260] } },
  { name: 'Woolacombe',        lat: 51.1706, lon: -4.2143, facing: 280,
    offshore: [45, 135], closesOut: 1.2, ability: 'beginner-intermediate' },
  { name: 'Combesgate',        lat: 51.175,  lon: -4.206,  facing: 292,
    offshore: [45, 135], closesOut: 1.6, ability: 'intermediate', reliability: 3,
    notes: 'Rights off reef on pushing tide. More shape than Woolacombe',
    quirks: { tide: 'pushing', tideBonus: 2, tideWindow: 2 } },
  { name: 'Grunta Beach',      lat: 51.184,  lon: -4.215,  facing: 300,
    offshore: [45, 135], closesOut: 1.2, ability: 'intermediate', reliability: 1,
    notes: 'Fickle cove near Morte Point — reward when it clicks but rarely does',
    quirks: { tide: 'aroundLow', tideWindow: 2, tideBonus: 2 } },
  { name: 'Lynmouth',          lat: 51.229,  lon: -3.834,  facing: 292,
    offshore: [135, 225], closesOut: 2.3, ability: 'advanced', reliability: 3 },
  { name: 'Westward Ho!',      lat: 51.049,  lon: -4.231,  facing: 292,
    offshore: [90, 180],  closesOut: 1.0, ability: 'beginner', reliability: 3 },
  { name: 'Spekes Mill',       lat: 50.988,  lon: -4.524,  facing: 292,
    offshore: [45, 135], closesOut: 3.5, ability: 'advanced', reliability: 2,
    notes: 'Big day escape toward Hartland — only worth it on serious groundswell' },
  { name: 'Saltburn',          lat: 54.5844, lon: -0.9728, facing:  30 },
  { name: 'Thurso East',       lat: 58.5936, lon: -3.5239, facing:  10 },
  { name: 'Tiree',             lat: 56.5000, lon: -6.9167, facing: 270 },
  { name: 'Portrush',          lat: 55.2044, lon: -6.6612, facing: 350 },
  { name: 'Bundoran',          lat: 54.4776, lon: -8.2782, facing: 315 },
  { name: 'Rossnowlagh',       lat: 54.6417, lon: -8.2083, facing: 305 },
  { name: 'Easkey',            lat: 54.2942, lon: -8.9611, facing: 315 },
  { name: 'Lahinch',           lat: 52.9335, lon: -9.3438, facing: 260 },
  { name: 'Inch Beach',        lat: 52.1417, lon: -9.9417, facing: 225 },
  // France & Spain
  { name: 'Hossegor',          lat: 43.6528, lon: -1.4456, facing: 270 },
  { name: 'Biarritz',          lat: 43.4832, lon: -1.5586, facing: 315 },
  { name: 'Mundaka',           lat: 43.4067, lon: -2.6844, facing: 350 },
  { name: 'Zarautz',           lat: 43.2856, lon: -2.1714, facing: 355 },
  { name: 'Zurriola',          lat: 43.3266, lon: -1.9728, facing: 350 },
  { name: 'Pantín',            lat: 43.6167, lon: -7.8500, facing: 315 },
  { name: 'Rodiles',           lat: 43.5342, lon: -5.4697, facing: 350 },
  // Portugal
  { name: 'Nazaré',            lat: 39.6000, lon: -9.0667, facing: 270 },
  { name: 'Peniche',           lat: 39.3556, lon: -9.3814, facing: 270 },
  { name: 'Ericeira',          lat: 38.9667, lon: -9.4167, facing: 270 },
  { name: 'Sagres',            lat: 37.0133, lon: -8.9378, facing: 200 },
  // Morocco & Canaries
  { name: 'Taghazout',         lat: 30.5442, lon: -9.7089, facing: 315 },
  { name: 'Anchor Point',      lat: 30.5592, lon: -9.7169, facing: 315 },
  { name: 'El Médano',         lat: 28.0461, lon: -16.5358, facing: 180 },
  { name: 'Las Palmas',        lat: 28.1272, lon: -15.4194, facing: 315 },
  // Hawaii
  { name: 'Pipeline',          lat: 21.6645, lon: -158.0530, facing:   0 },
  { name: 'Sunset Beach',      lat: 21.6789, lon: -158.0400, facing:  10 },
  { name: 'Waimea Bay',        lat: 21.6433, lon: -158.0644, facing: 355 },
  { name: 'Jaws (Peahi)',      lat: 20.9378, lon: -156.3906, facing:  10 },
  // USA
  { name: 'Mavericks',         lat: 37.4939, lon: -122.5011, facing: 315 },
  { name: 'Steamer Lane',      lat: 36.9521, lon: -122.0231, facing: 270 },
  { name: 'Rincon',            lat: 34.3726, lon: -119.4784, facing: 220 },
  { name: 'Trestles',          lat: 33.3833, lon: -117.5833, facing: 220 },
  { name: 'Huntington Beach',  lat: 33.6595, lon: -118.0057, facing: 225 },
  { name: 'The Wedge',         lat: 33.5933, lon: -117.8844, facing: 180 },
  // Mexico & Central America
  { name: 'Puerto Escondido',  lat: 15.8656, lon: -97.0703, facing: 175 },
  { name: 'Sayulita',          lat: 20.8681, lon: -105.4347, facing: 270 },
  { name: 'Tamarindo',         lat: 10.2997, lon: -85.8369, facing: 275 },
  { name: 'Pavones',           lat:  8.4411, lon: -83.1594, facing: 210 },
  // Pacific & Polynesia
  { name: "Teahupo'o",         lat: -17.8672, lon: -149.2622, facing: 210 },
  { name: 'Cloudbreak',        lat: -17.9781, lon:  177.2139, facing: 260 },
  // Indonesia & Asia
  { name: 'Uluwatu',           lat:  -8.8294, lon:  115.0849, facing: 220 },
  { name: 'Padang Padang',     lat:  -8.8108, lon:  115.0917, facing: 225 },
  { name: 'Kuta Beach',        lat:  -8.7189, lon:  115.1686, facing: 260 },
  { name: 'Desert Point',      lat:  -8.7872, lon:  115.9247, facing: 315 },
  { name: 'G-Land',            lat:  -8.6667, lon:  114.4333, facing: 185 },
  { name: 'Cloud 9, Siargao',  lat:   9.8498, lon:  126.0458, facing:  80 },
  { name: 'Arugam Bay',        lat:   6.8419, lon:   81.8361, facing:  90 },
  // Australia
  { name: 'Snapper Rocks',     lat: -28.1753, lon:  153.5558, facing:  80 },
  { name: 'Kirra',             lat: -28.1694, lon:  153.5586, facing:  90 },
  { name: 'Lennox Head',       lat: -28.7942, lon:  153.5928, facing:  80 },
  { name: 'Manly Beach',       lat: -33.7969, lon:  151.2855, facing:  90 },
  { name: 'Bondi Beach',       lat: -33.8908, lon:  151.2743, facing:  90 },
  { name: 'Bells Beach',       lat: -38.3667, lon:  144.2833, facing: 210 },
  { name: 'Margaret River',    lat: -33.9539, lon:  114.7519, facing: 210 },
  // South Africa
  { name: "Jeffreys Bay",      lat: -34.0500, lon:   24.9167, facing: 235 },
  { name: 'Big Bay',           lat: -33.7325, lon:   18.4756, facing: 300 },
  { name: 'Durban',            lat: -29.8587, lon:   31.0218, facing:  80 },
  // South America
  { name: 'Punta Rocas',       lat: -12.4739, lon:  -76.8278, facing: 225 },
  { name: 'Lobitos',           lat:  -4.4525, lon:  -81.2731, facing: 215 },
  { name: 'Florianópolis',     lat: -27.5969, lon:  -48.5495, facing:  90 },
  { name: 'Itacaré',           lat: -14.2774, lon:  -38.9946, facing:  80 },
];

// ── Tidal reference nodes (MHWS/MHWN/MLWN/MLWS metres above Chart Datum) ─────
// Nearest node is used, then interpolated with moon phase for springs vs neaps.
//
// m2phase: M2 tidal constituent phase for this station, expressed as hours past
// the Unix epoch (mod 12.4167 h).  HW occurs at times t where
//   (t_epoch_hours - m2phase) mod 12.4167 == 0
// UK/Ireland values are calibrated against published Admiralty tide tables
// (reference date 5 Jul 2026, verified against multiple sources).
// Non-UK/global values are derived from longitude, anchored to the same date,
// and give a reasonable approximation for the open-ocean M2 tide.
const TIDAL_NODES = [
  // m2phase derived from observed HW times (UTC) on 2026-07-05, reference epoch hours = 486576
  // formula: m2phase = (2.78 + HW_UTC_hours) % 12.4167
  { lat: 51.21, lon:  -4.11, mhws: 8.0, mhwn: 6.0, mlwn: 2.3, mlws: 0.7, m2phase: 11.81 }, // Ilfracombe / N Devon  — HW 09:02 UTC
  { lat: 51.45, lon:  -3.18, mhws: 9.5, mhwn: 7.1, mlwn: 2.5, mlws: 0.7, m2phase:  0.80 }, // Cardiff / Bristol Ch  — HW 10:26 UTC
  { lat: 50.83, lon:  -4.54, mhws: 6.7, mhwn: 5.1, mlwn: 2.1, mlws: 0.8, m2phase: 11.68 }, // Bude                  — HW 08:54 UTC
  { lat: 50.41, lon:  -5.08, mhws: 5.7, mhwn: 4.3, mlwn: 1.8, mlws: 0.5, m2phase: 10.98 }, // Newquay               — HW 08:12 UTC
  { lat: 50.35, lon:  -5.15, mhws: 5.5, mhwn: 4.1, mlwn: 1.6, mlws: 0.5, m2phase: 10.98 }, // Perranporth           — HW ~08:12 UTC (≈ Newquay)
  { lat: 50.57, lon:  -4.87, mhws: 5.4, mhwn: 4.0, mlwn: 1.6, mlws: 0.5, m2phase: 11.33 }, // Polzeath/Padstow      — HW ~08:33 UTC
  { lat: 50.07, lon:  -5.70, mhws: 5.3, mhwn: 3.9, mlwn: 1.5, mlws: 0.5, m2phase: 10.53 }, // Sennen                — HW 07:45 UTC
  { lat: 54.58, lon:  -0.97, mhws: 5.1, mhwn: 3.9, mlwn: 1.7, mlws: 0.5, m2phase:  9.28 }, // Saltburn              — HW 06:30 UTC
  { lat: 58.59, lon:  -3.52, mhws: 3.5, mhwn: 2.8, mlwn: 1.2, mlws: 0.5, m2phase:  2.28 }, // Thurso                — HW 11:55 UTC
  { lat: 56.50, lon:  -6.92, mhws: 3.6, mhwn: 2.6, mlwn: 1.1, mlws: 0.4, m2phase: 11.66 }, // Tiree                 — HW 08:53 UTC
  { lat: 55.20, lon:  -6.66, mhws: 1.5, mhwn: 1.1, mlwn: 0.5, mlws: 0.2, m2phase:  0.20 }, // Portrush              — HW 09:50 UTC
  { lat: 54.48, lon:  -8.28, mhws: 3.8, mhwn: 2.9, mlwn: 1.1, mlws: 0.3, m2phase:  0.23 }, // Bundoran              — HW ~09:52 UTC
  { lat: 52.93, lon:  -9.34, mhws: 4.7, mhwn: 3.5, mlwn: 1.4, mlws: 0.4, m2phase: 12.11 }, // Lahinch               — HW ~09:20 UTC
  { lat: 52.14, lon:  -9.94, mhws: 3.5, mhwn: 2.6, mlwn: 0.9, mlws: 0.3, m2phase: 10.03 }, // Inch Beach            — HW ~07:25 UTC
  // Non-UK: m2phase = (lonPhase + 2.78) % 12.4167 where lonPhase = ((lon+180)/360)*12.4167
  { lat: 43.65, lon:  -1.45, mhws: 3.8, mhwn: 2.8, mlwn: 1.0, mlws: 0.4, m2phase:  8.94 }, // Hossegor
  { lat: 43.48, lon:  -1.56, mhws: 3.8, mhwn: 2.8, mlwn: 1.0, mlws: 0.4, m2phase:  8.94 }, // Biarritz
  { lat: 43.41, lon:  -2.68, mhws: 4.2, mhwn: 3.2, mlwn: 1.2, mlws: 0.5, m2phase:  8.90 }, // Mundaka
  { lat: 39.60, lon:  -9.07, mhws: 3.8, mhwn: 2.8, mlwn: 1.2, mlws: 0.4, m2phase:  8.68 }, // Nazaré
  { lat: 39.36, lon:  -9.38, mhws: 3.8, mhwn: 2.8, mlwn: 1.2, mlws: 0.4, m2phase:  8.67 }, // Peniche
  { lat: 38.97, lon:  -9.42, mhws: 3.7, mhwn: 2.7, mlwn: 1.1, mlws: 0.4, m2phase:  8.67 }, // Ericeira
  { lat: 37.01, lon:  -8.94, mhws: 3.2, mhwn: 2.4, mlwn: 0.9, mlws: 0.3, m2phase:  8.68 }, // Sagres
  { lat: 30.54, lon:  -9.71, mhws: 3.0, mhwn: 2.2, mlwn: 0.8, mlws: 0.3, m2phase:  8.66 }, // Taghazout
  { lat: 28.10, lon: -14.35, mhws: 1.5, mhwn: 1.1, mlwn: 0.5, mlws: 0.2, m2phase:  8.50 }, // Lanzarote
  { lat: 27.90, lon: -15.58, mhws: 1.5, mhwn: 1.1, mlwn: 0.5, mlws: 0.2, m2phase:  8.45 }, // Gran Canaria
  { lat: 36.95, lon:-122.05, mhws: 1.7, mhwn: 1.3, mlwn: 0.5, mlws: 0.0, m2phase:  4.78 }, // Santa Cruz CA
  { lat: 34.03, lon:-118.80, mhws: 1.6, mhwn: 1.3, mlwn: 0.5, mlws: 0.0, m2phase:  4.89 }, // Malibu CA
  { lat: 21.30, lon:-157.80, mhws: 0.6, mhwn: 0.4, mlwn: 0.2, mlws: 0.1, m2phase:  3.55 }, // Oahu HI
  { lat: -8.70, lon: 115.20, mhws: 2.0, mhwn: 1.5, mlwn: 0.5, mlws: 0.2, m2phase:  0.55 }, // Bali
  { lat:-33.90, lon:  18.40, mhws: 1.8, mhwn: 1.5, mlwn: 0.6, mlws: 0.3, m2phase:  9.63 }, // Cape Town
  { lat:-33.90, lon: 151.30, mhws: 1.3, mhwn: 1.0, mlwn: 0.5, mlws: 0.2, m2phase:  1.79 }, // Sydney
  { lat:-31.90, lon: 115.90, mhws: 0.7, mhwn: 0.5, mlwn: 0.2, mlws: 0.1, m2phase:  0.57 }, // Perth
  { lat:  0,    lon:   0,    mhws: 1.5, mhwn: 1.1, mlwn: 0.5, mlws: 0.2, m2phase:  8.99 }, // open-ocean fallback
];

// ── DOM refs ──────────────────────────────────────────────────────────────────
const locationInput  = document.getElementById('locationInput');
const searchBtn      = document.getElementById('searchBtn');
const locateBtn      = document.getElementById('locateBtn');
const splash         = document.getElementById('splash');
const appEl          = document.getElementById('app');
const errorEl        = document.getElementById('error');
const loadingEl      = document.getElementById('loading');
const locationName   = document.getElementById('locationName');
const locationCoords = document.getElementById('locationCoords');
const camBtn         = document.getElementById('camBtn');
const nowBanner      = document.getElementById('nowBanner');
const buoyReadoutEl  = document.getElementById('buoyReadout');
const nearbySpotsEl  = document.getElementById('nearbySpots');
const suggestionsEl  = document.getElementById('suggestions');

// ── Autocomplete ──────────────────────────────────────────────────────────────
let debounceTimer;
locationInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const q = locationInput.value.trim();
  if (q.length < 3) { suggestionsEl.innerHTML = ''; return; }
  debounceTimer = setTimeout(() => fetchSuggestions(q), 300);
});

async function fetchSuggestions(q) {
  try {
    const res  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`);
    const data = await res.json();
    renderSuggestions(data.results || []);
  } catch (_) { suggestionsEl.innerHTML = ''; }
}

function renderSuggestions(results) {
  suggestionsEl.innerHTML = '';
  results.forEach(r => {
    const li = document.createElement('li');
    li.textContent = [r.name, r.admin1, r.country_code].filter(Boolean).join(', ');
    li.addEventListener('click', () => {
      locationInput.value = li.textContent;
      suggestionsEl.innerHTML = '';
      loadForecast(r.latitude, r.longitude, li.textContent);
    });
    suggestionsEl.appendChild(li);
  });
}

document.addEventListener('click', e => {
  if (!e.target.closest('.autocomplete-wrapper')) suggestionsEl.innerHTML = '';
});

// ── Search / Locate ───────────────────────────────────────────────────────────
searchBtn.addEventListener('click', doSearch);
locationInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

async function doSearch() {
  suggestionsEl.innerHTML = '';
  const q = locationInput.value.trim();
  if (!q) return;
  showLoading();
  try {
    const res  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`);
    const data = await res.json();
    if (!data.results?.length) throw new Error(`No results found for "${q}".`);
    const r = data.results[0];
    loadForecast(r.latitude, r.longitude, [r.name, r.admin1, r.country_code].filter(Boolean).join(', '));
  } catch (err) { showError(err.message); }
}

locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) { showError('Geolocation not supported by your browser.'); return; }
  showLoading();
  navigator.geolocation.getCurrentPosition(
    async ({ coords: { latitude: lat, longitude: lon } }) => {
      const name = await reverseGeocode(lat, lon);
      loadForecast(lat, lon, name);
    },
    (err) => {
      if (err.code === 1) {
        showError('Location access was denied. In Safari, go to Settings → Privacy → Location Services and allow access for your browser.');
      } else if (err.code === 2) {
        showError('Your location couldn\'t be determined — Macs and desktops sometimes struggle with this. Try searching for your nearest town or surf spot instead.');
      } else {
        showError('Location request timed out. Try again, or search for your spot manually.');
      }
    },
    { timeout: 12000, maximumAge: 300000 }
  );
});

async function reverseGeocode(lat, lon) {
  try {
    // Nominatim supports true reverse geocoding (Open-Meteo geocoding API does not)
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const a    = data.address || {};
    const place = a.village || a.town || a.city || a.suburb || a.county || a.state;
    const country = a.country_code?.toUpperCase();
    if (place) return country ? `${place}, ${country}` : place;
  } catch (_) {}
  return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
}

// Silent sanity check against the real Bideford Bay wave buoy (Channel Coastal
// Observatory, free API) — North Devon spots only. Console-only, never shown in
// the UI; lets us spot-check exposure/tide-multiplier assumptions over time.
const BIDEFORD_BAY_BUOY = { lat: 51.0584, lon: -4.2768 };

async function checkBuoySanity(lat, lon, nearestSpot, swellH, exposure) {
  try {
    if (haversine(lat, lon, BIDEFORD_BAY_BUOY.lat, BIDEFORD_BAY_BUOY.lon) > 15) return;
    // buoy.json is written every 30 min by a GitHub Actions workflow — same origin, no CORS
    const res = await fetch('./buoy.json?t=' + Math.floor(Date.now() / 1800000));
    if (!res.ok) return;
    const data = await res.json();
    const buoyHs = data.hs;
    if (buoyHs == null) return;
    const buoyFt = Math.round(buoyHs * 3.281);
    const appFt  = swellH != null ? Math.round(swellH * 3.281) : null;
    const tpStr  = data.tp  != null ? ` · ${Math.round(data.tp)}s` : '';
    const dirStr = data.dir != null ? ` · ${dirName(data.dir)}` : '';
    const msg = `Bideford Bay buoy: ${buoyFt}ft${tpStr}${dirStr} · app: ${appFt ?? '—'}ft`;
    buoyReadoutEl.textContent = msg;
    buoyReadoutEl.classList.remove('hidden');
    console.info('[buoy check]', msg, `(exposure=${exposure})`);
  } catch (err) {
    console.warn('[buoy check] failed:', err.message);
  }
}

// ── Nearest surf spots ────────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestSpots(lat, lon, n = 3) {
  return SURF_SPOTS
    .filter(s => !s.hidden)
    .map(s => ({ ...s, dist: haversine(lat, lon, s.lat, s.lon) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, n);
}

// ── Webcams (Windy API + YouTube fallback) ───────────────────────────────────
async function fetchWebcams(lat, lon) {
  const endpoints = [
    // v3 — newer key format
    `https://api.windy.com/webcams/api/v3/webcams?nearby=${lat},${lon},100&limit=10&include=images,urls,location&apiKey=${WINDY_KEY}`,
    // v2 — older key format
    `https://api.windy.com/api/webcams/v2/list/nearby/${lat},${lon},100?show=webcams:image,location,url&key=${WINDY_KEY}`,
  ];
  for (const url of endpoints) {
    try {
      const res  = await fetch(url);
      const data = await res.json();
      // Handle both v3 ({ webcams: [...] }) and v2 ({ result: { webcams: [...] } })
      const list = data.webcams || data.result?.webcams || [];
      const active = list.filter(w => w.status === 'active');
      if (!active.length) continue;
      return active.map(w => ({
        title: w.title,
        dist:  haversine(lat, lon, w.location?.latitude ?? w.location?.lat,
                                   w.location?.longitude ?? w.location?.lon),
        thumb: w.images?.current?.preview || w.images?.current?.thumbnail ||
               w.image?.current?.preview  || w.image?.current?.thumbnail,
        link:  w.urls?.detail || w.url?.current?.desktop ||
               `https://www.windy.com/webcams/${w.webcamId || w.id}`,
      }));
    } catch (_) { continue; }
  }
  return [];
}

function renderWebcams(lat, lon, locationName) {
  const section = document.getElementById('webcamSection');
  const row     = document.getElementById('webcamRow');
  row.innerHTML = '<span class="wc-loading">Loading cameras…</span>';
  section.classList.remove('hidden');

  fetchWebcams(lat, lon).then(cams => {
    row.innerHTML = '';
    if (cams.length) {
      // Show Windy thumbnail cards
      cams.sort((a, b) => a.dist - b.dist).slice(0, 6).forEach(c => {
        const card = document.createElement('a');
        card.className = 'webcam-card';
        card.href = c.link; card.target = '_blank'; card.rel = 'noopener noreferrer';
        card.innerHTML = `
          ${c.thumb ? `<img src="${c.thumb}" alt="${c.title}" loading="lazy"/>` : '<div class="wc-no-img">📷</div>'}
          <div class="wc-name">${c.title}</div>
          <div class="wc-dist">${Math.round(c.dist)}km away</div>`;
        row.appendChild(card);
      });
    } else {
      const place = (locationName || '').split(',')[0].trim();
      const q     = encodeURIComponent(`${place} surf cam`);
      row.innerHTML = `<a class="wc-search-link" href="https://www.google.com/search?q=${q}" target="_blank" rel="noopener noreferrer">🔍 Search surf cams for ${place}</a>`;
    }
  });
}

// ── Nearest surf spots (OSM) ──────────────────────────────────────────────────
// Query OpenStreetMap via Overpass API for real surf spots nearby
async function fetchOSMSpots(lat, lon) {
  // Broad query — filter commercially in JS rather than risk excluding real breaks
  const q = `[out:json][timeout:15];(`+
    `node["sport"="surfing"](around:150000,${lat},${lon});`+
    `way["sport"="surfing"](around:150000,${lat},${lon});`+
    `);out center;`;
  const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('Overpass error');
  const data = await res.json();
  const COMMERCIAL = /\b(school|surf school|hire|lesson|academy|coaching|tuition|ltd|llc|plc)\b/i;
  return data.elements
    .filter(el => {
      if (!el.tags?.name) return false;
      if (el.tags.amenity === 'surf_school') return false;
      if (el.tags.shop) return false;
      if (COMMERCIAL.test(el.tags.name)) return false;
      return true;
    })
    .map(el => ({
      name: el.tags.name,
      lat:  el.lat  ?? el.center?.lat,
      lon:  el.lon  ?? el.center?.lon,
    }))
    .filter(s => s.lat != null);
}

// Always merge OSM results with hardcoded list, dedupe at 0.3 km
function renderNearbySpots(lat, lon) {
  nearbySpotsEl.innerHTML = '<span class="nearby-label">Nearby spots:</span><span class="nearby-loading">…</span>';
  nearbySpotsEl.classList.remove('hidden');

  fetchOSMSpots(lat, lon)
    .then(osmSpots => mergeAndPaint(lat, lon, osmSpots))
    .catch(()      => mergeAndPaint(lat, lon, []));
}

function mergeAndPaint(lat, lon, osmSpots) {
  // Combine OSM results with the hardcoded list, ranked by distance
  const all = [...osmSpots, ...SURF_SPOTS.filter(s => !s.hidden)]
    .map(s => ({ ...s, dist: haversine(lat, lon, s.lat, s.lon) }))
    .sort((a, b) => a.dist - b.dist);

  // Deduplicate at 0.3 km so adjacent beaches (Croyde/Saunton) both appear
  const picks = [];
  for (const s of all) {
    if (!picks.some(e => haversine(s.lat, s.lon, e.lat, e.lon) < 0.3)) {
      picks.push(s);
      if (picks.length === 4) break;
    }
  }
  paintSpotButtons(picks, lat, lon);
}

// ── Favourite spots ───────────────────────────────────────────────────────────
const FAVS_KEY = 'mlw_favs';

function loadFavs() {
  try { return JSON.parse(localStorage.getItem(FAVS_KEY) || '[]'); } catch { return []; }
}

function isFav(spot) {
  return loadFavs().some(f => haversine(f.lat, f.lon, spot.lat, spot.lon) < 0.3);
}

function toggleFav(spot, nearbySpots, lat, lon) {
  const favs = loadFavs();
  const idx  = favs.findIndex(f => haversine(f.lat, f.lon, spot.lat, spot.lon) < 0.3);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.push({ name: spot.name, lat: spot.lat, lon: spot.lon });
  localStorage.setItem(FAVS_KEY, JSON.stringify(favs));
  paintSpotButtons(nearbySpots, lat, lon);
}

function paintSpotButtons(nearbySpots, lat, lon) {
  const favs = loadFavs().map(f => ({ ...f, dist: haversine(lat, lon, f.lat, f.lon) }));

  // Favs first, then nearby (skip anything already in favs by proximity)
  const combined = [...favs];
  for (const s of nearbySpots) {
    if (!combined.some(e => haversine(s.lat, s.lon, e.lat, e.lon) < 0.3)) {
      combined.push({ ...s, dist: s.dist ?? haversine(lat, lon, s.lat, s.lon) });
    }
  }

  nearbySpotsEl.innerHTML = '<span class="nearby-label">Nearby spots:</span>';
  combined.forEach(s => {
    const starred = isFav(s);
    const btn = document.createElement('button');
    btn.className = `spot-btn${starred ? ' is-fav' : ''}`;
    btn.innerHTML = `<span class="spot-star">${starred ? '★' : '☆'}</span>${s.name} <span class="spot-dist">${Math.round(s.dist)}km</span>`;

    btn.querySelector('.spot-star').addEventListener('click', e => {
      e.stopPropagation();
      toggleFav(s, nearbySpots, lat, lon);
    });

    btn.addEventListener('click', () => loadForecast(s.lat, s.lon, s.name));
    nearbySpotsEl.appendChild(btn);
  });
}

// ── API ───────────────────────────────────────────────────────────────────────
let currentLat = null, currentLon = null, currentName = null;
let currentModel    = localStorage.getItem('mlw_model')    || 'openmeteo';
let currentActivity = localStorage.getItem('mlw_activity') || 'surf';
let cachedRenderArgs = null;

// Tide data fetched from tides.json (written daily by a GitHub Actions workflow
// using the WorldTides API).  null until the file is loaded; falls back to the
// m2phase tidal model when unavailable.
let tideData = null;

async function loadTideData() {
  try {
    // Cache-bust once per day so the browser always gets the day's fresh file.
    const res = await fetch('./tides.json?t=' + Math.floor(Date.now() / 86400000));
    if (!res.ok) return;
    const data = await res.json();
    if (data && Array.isArray(data.nodes) && data.nodes.length > 0) {
      tideData = data;
      console.info('[tides] loaded', data.nodes.length, 'stations, updated', data.updated);
    }
  } catch (err) {
    console.warn('[tides] could not load tides.json:', err.message);
  }
}
const LAST_LOC_KEY = 'mlw_last_loc';

async function loadForecast(lat, lon, name) {
  currentLat = lat; currentLon = lon; currentName = name;
  localStorage.setItem(LAST_LOC_KEY, JSON.stringify({ lat, lon, name }));
  await reloadForecast();
}

async function reloadForecast() {
  const lat = currentLat, lon = currentLon, name = currentName;
  showLoading();
  try {
    let marine, weather;
    // Wind model variant: best_match, gfs_seamless, or ecmwf_ifs025
    const windModel = currentModel === 'gfs' ? '&models=gfs_seamless'
                    : currentModel === 'ecmwf' ? '&models=ecmwf_ifs025'
                    : '';
    const vars = 'wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period';
    const secVars = 'secondary_swell_wave_height,secondary_swell_wave_direction,secondary_swell_wave_period';
    const [mRes, wRes, sRes] = await Promise.all([
      fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=${vars}&timezone=auto&forecast_days=7`),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=windspeed_10m,winddirection_10m&timezone=auto&forecast_days=7${windModel}`),
      fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=${secVars}&models=meteofrance_wave&timezone=auto&forecast_days=7`).catch(() => null),
    ]);
    if (!mRes.ok) throw new Error('Marine API error — this location may be inland or unsupported.');
    if (!wRes.ok) throw new Error('Weather API error.');
    [marine, weather] = await Promise.all([mRes.json(), wRes.json()]);
    await mergeSecondarySwell(marine.hourly, sRes);
    renderAll(lat, lon, name, marine, weather);
  } catch (err) {
    showError(`Failed to load forecast: ${err.message}`);
  }
}

// Secondary swell (a second, distinct swell train) is only available from the
// MeteoFrance wave model, fetched separately so its absence/failure never
// blocks the main forecast.
async function mergeSecondarySwell(mh, sRes) {
  try {
    if (!sRes || !sRes.ok) return;
    const sec = await sRes.json();
    const sh = sec.hourly;
    if (!sh || !sh.time) return;
    const idxByTime = {};
    sh.time.forEach((t, i) => { idxByTime[t] = i; });
    for (const key of ['secondary_swell_wave_height', 'secondary_swell_wave_direction', 'secondary_swell_wave_period']) {
      mh[key] = mh.time.map(t => {
        const i = idxByTime[t];
        return i != null ? sh[key][i] : null;
      });
    }
  } catch (_) {
    // secondary swell is supplementary — ignore failures
  }
}


// ── Master render ─────────────────────────────────────────────────────────────
function renderAll(lat, lon, name, marine, weather) {
  cachedRenderArgs = { lat, lon, name, marine, weather };
  locationName.textContent = name;
  // Show GPS coords only when geocoding couldn't find a place name (fallback is raw "lat, lon")
  const hasName = name && !/^-?\d/.test(name.trim());
  locationCoords.textContent = hasName ? '' : `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
  // Cam button — link to Google search for this spot's surf cams
  const place = (name || '').split(',')[0].trim() || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  camBtn.href = `https://www.google.com/search?q=${encodeURIComponent(place + ' surf cam')}`;
  camBtn.classList.remove('hidden');

  const mh  = marine.hourly;
  const wh  = weather.hourly;
  const now = new Date();

  const todayStr = now.toISOString().slice(0, 10);
  const nowHStr  = now.toISOString().slice(0, 13);
  const baseIdx  = Math.max(0, mh.time.findIndex(t => t.startsWith(todayStr)));
  const nowIdx   = mh.time.findIndex(t => t.startsWith(nowHStr));
  const safeNow  = nowIdx >= 0 ? nowIdx : baseIdx + now.getHours();

  renderNearbySpots(lat, lon);
  renderNowBanner(mh, wh, safeNow, lat, lon, baseIdx);
  renderForecastGrid(mh, wh, baseIdx, lat, lon);
  showApp();

}

function safeVal(arr, idx) {
  return arr && idx >= 0 && idx < arr.length ? arr[idx] : null;
}

// Find the nearest named spot within 5km, for exposure/facing/quirks lookup
function findNearestSpot(lat, lon) {
  let nearestSpot = null, nearestDist = Infinity;
  for (const s of SURF_SPOTS) {
    if (s.hidden) continue;
    const dist = haversine(lat, lon, s.lat, s.lon);
    if (dist < nearestDist) { nearestDist = dist; nearestSpot = s; }
  }
  return nearestDist <= 5 ? nearestSpot : null;
}

// ── Current conditions banner ─────────────────────────────────────────────────
function renderNowBanner(mh, wh, idx, lat, lon, baseIdx) {
  const nearestSpot = findNearestSpot(lat, lon);
  const exposure = nearestSpot?.exposure ?? 1.0;
  const { phaseH } = tidalParams(lat, lon, new Date());
  const absHour  = idx - baseIdx;
  const tideMult = tideHeightMultiplier(nearestSpot?.quirks, phaseH, absHour);
  const effScale = exposure * tideMult;
  const wavePer = safeVal(mh.wave_period, idx);
  const waveDir = safeVal(mh.wave_direction, idx);
  const swellHRaw = safeVal(mh.swell_wave_height, idx);
  const swellH  = swellHRaw != null ? swellHRaw * effScale : null;
  // Surf height is driven by the swell component, not total Hs — see waveRangeFt()
  const waveH   = swellH;
  const secSwellLabel = secondarySwellLabel(
    safeVal(mh.secondary_swell_wave_height, idx),
    safeVal(mh.secondary_swell_wave_direction, idx),
    safeVal(mh.secondary_swell_wave_period, idx),
    effScale
  );
  const windSpd = safeVal(wh.windspeed_10m, idx);
  const windDir = safeVal(wh.winddirection_10m, idx);
  const offshoreRange = nearestSpot?.offshore ?? null;
  const closesOut     = nearestSpot?.closesOut ?? null;
  const stars = currentActivity === 'foil'
    ? (nearestSpot?.noFoil ? 0 : foilStars(waveH, wavePer, windSpd, windDir, waveDir, nearestSpot?.facing ?? null, offshoreRange))
    : surfStars(waveH, wavePer, windSpd, windDir, waveDir, nearestSpot?.facing ?? null, offshoreRange, closesOut);

  const waveRange = surfFaceHeightFt(waveH);
  const waveRangeStr = waveRange ? `${waveRange.lo}-${waveRange.hi}` : '—';
  const swellHFt = swellH != null ? Math.round(swellH * 3.281) : null;
  nowBanner.innerHTML = `
    <div class="now-stat">
      <span class="ns-label">Now</span>
      <span class="ns-value"><span class="stars ${starsClass(stars)}">${renderStars(stars)}</span></span>
    </div>
    <div class="now-stat">
      <span class="ns-label">Waves</span>
      <span class="ns-value ${waveClass(waveH)}">${waveRangeStr}<small>ft</small></span>
    </div>
    <div class="now-stat">
      <span class="ns-label">Period</span>
      <span class="ns-value">${fmt(wavePer,0)}<small>s</small></span>
    </div>
    <div class="now-stat">
      <span class="ns-label">Swell</span>
      <span class="ns-value">${swellHFt ?? '—'}<small>ft</small></span>
      ${secSwellLabel ? `<span class="ns-dir">${secSwellLabel}</span>` : ''}
    </div>
    <div class="now-stat">
      <span class="ns-label">Wind</span>
      <span class="ns-value ${windClass(windSpd,windDir,waveDir,offshoreRange)}">${dirArrow(windDir)} ${windSpd != null ? Math.round(windSpd) : '—'}<small>km/h</small></span>
      <span class="ns-dir">${dirArrow(waveDir)} ${dirName(waveDir)}</span>
    </div>
  `;
  checkBuoySanity(lat, lon, nearestSpot, swellH, exposure);
}

// ── MSW-style forecast: days as sections, time slots as rows ─────────────────
function renderForecastGrid(mh, wh, baseIdx, lat, lon) {
  const now     = new Date();
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const { hwH, lwH, phaseH } = tidalParams(lat, lon, now);

  // Find nearest named spot within 5 km for swell direction scoring + quirks
  const nearestSpot = findNearestSpot(lat, lon);
  const spotFacing = nearestSpot ? nearestSpot.facing : null;
  const exposure = nearestSpot?.exposure ?? 1.0;

  const existingRatings = {};
  loadFeedback().forEach(e => { existingRatings[`${e.date}|${e.slot}`] = e.actual; });
  const isoToday = now.toISOString().slice(0, 10);

  let html = `<div class="rate-callout">
    <span class="rate-callout-star">★</span>
    Rate each session after surfing — the app learns from your ratings to sharpen future predictions for you personally.
  </div>`;

  for (let d = 0; d < 7; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const dayLabel = d === 0 ? 'Today'
                   : d === 1 ? 'Tomorrow'
                   : date.toLocaleDateString('en-GB', { weekday: 'long' });
    const dateStr  = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

    html += `<div class="msw-day">
      <div class="msw-day-header">
        <span class="msw-day-name">${dayLabel}</span>
        <span class="msw-day-date">${dateStr}</span>
      </div>
      <div class="msw-col-hdrs">
        <span></span><span>${currentActivity === 'foil' ? 'FOIL' : 'SURF'}</span><span>SWELL</span><span>WIND</span>
      </div>`;

    for (const slot of SLOTS) {
      const idx     = baseIdx + d * 24 + slot.hour;
      const absHour = d * 24 + slot.hour;
      const tideMult = tideHeightMultiplier(nearestSpot?.quirks, phaseH, absHour);
      const effScale = exposure * tideMult;
      const wavePer = safeVal(mh.wave_period, idx);
      const waveDir = safeVal(mh.wave_direction, idx);
      const swellHRaw = safeVal(mh.swell_wave_height, idx);
      const swellH  = swellHRaw != null ? swellHRaw * effScale : null;
      // Surf height is driven by the swell component, not total Hs (which includes
      // local wind chop) — keeps the SURF range consistent with the SWELL figure.
      const waveH   = swellH;
      const swellPer= safeVal(mh.swell_wave_period, idx);
      const secSwellLabel = secondarySwellLabel(
        safeVal(mh.secondary_swell_wave_height, idx),
        safeVal(mh.secondary_swell_wave_direction, idx),
        safeVal(mh.secondary_swell_wave_period, idx),
        effScale
      );
      const windSpd = safeVal(wh.windspeed_10m, idx);
      const windDir = safeVal(wh.winddirection_10m, idx);
      const offshoreRange = nearestSpot?.offshore ?? null;
      const closesOut     = nearestSpot?.closesOut ?? null;
      let rawScore;
      if (currentActivity === 'foil') {
        rawScore = nearestSpot?.noFoil ? 0 : foilScore(waveH, wavePer, windSpd, windDir, waveDir, spotFacing, offshoreRange);
      } else {
        rawScore = surfScore(waveH, wavePer, windSpd, windDir, waveDir, spotFacing, offshoreRange, closesOut);
      }
      const score   = rawScore === 0 ? 0 : rawScore + tideQuirkAdj(nearestSpot ? nearestSpot.quirks : null, phaseH, absHour, windSpd, windDir);
      const stars   = score === 0 ? 0 : scoreToStars(score);

      // Wave range in feet (surf height → face height)
      const range   = waveRangeFt(mh, baseIdx, d, slot.hour, slot.spread, effScale);
      const rangeStr= range ? `${range.lo}-${range.hi}` : '—';

      const windKph = windSpd != null ? Math.round(windSpd) : null;
      const wc      = windClass(windSpd, windDir, waveDir, offshoreRange);
      const badge   = wc === 'wind-off' ? 'badge-off' : wc === 'wind-cross' ? 'badge-cross' : 'badge-on';

      // Swell in feet
      const swellFt = swellH != null ? Math.round(swellH * 3.281) : null;
      const swellPerDisp = swellPer ?? wavePer;

      // Highlight the current time slot on today
      const isNow  = d === 0 && nowHour >= slot.hour - slot.spread &&
                     nowHour < slot.hour + slot.spread;
      const isPast = d === 0 && nowHour >= slot.hour + slot.spread;

      html += `<div class="msw-row${isNow ? ' is-now' : ''}${isPast ? ' is-past' : ''}">
        <div class="msw-time">${slot.label}</div>
        <div class="msw-surf">
          <div class="wave-range ${waveClass(waveH)}">${rangeStr}<span class="ft">ft</span></div>
          <div class="slot-stars stars ${starsClass(stars)}">${renderStars(stars)}</div>
        </div>
        <div class="msw-swell">
          <div class="swell-ht">${swellFt != null ? swellFt : '—'}<small>ft</small>
            &nbsp;<span style="color:var(--muted);font-size:.8rem">${fmt(swellPerDisp,0)}s</span>
          </div>
          <div class="swell-meta">${dirArrow(waveDir)} ${dirName(waveDir)}<span class="swell-deg">${waveDir != null ? ' '+Math.round(waveDir)+'°' : ''}</span></div>
          ${secSwellLabel ? `<div class="swell-secondary">${secSwellLabel}</div>` : ''}
        </div>
        <div class="msw-wind">
          <div class="wind-mph">${dirArrow(windDir)} ${windKph ?? '—'}<small>km/h</small></div>
          <div class="wind-badge ${badge}">${dirName(windDir) || '—'}</div>
        </div>
      </div>`;

      if (isPast) {
        const fbKey    = `${isoToday}|${slot.label}`;
        const offshore = windDir != null && waveDir != null &&
          angleDiff(windDir, (waveDir + 180) % 360) < 50;
        const sdiff    = spotFacing != null && waveDir != null
          ? angleDiff(waveDir, spotFacing) : '';
        const existing = existingRatings[fbKey];
        html += existing
          ? `<div class="slot-feedback">
               <span class="fb-label">Rated</span>
               <span class="fb-rated">${'★'.repeat(existing)}${'☆'.repeat(5 - existing)}</span>
             </div>`
          : `<div class="slot-feedback"
                 data-date="${isoToday}" data-slot="${slot.label}"
                 data-predicted="${stars}"
                 data-lat="${lat}" data-lon="${lon}"
                 data-wh="${waveH?.toFixed(2) ?? ''}" data-per="${wavePer ?? ''}"
                 data-wsp="${windSpd ?? ''}" data-off="${offshore}" data-sdiff="${sdiff}">
               <span class="fb-stars">
                 ${[1,2,3,4,5].map(v => `<button class="fb-star" data-v="${v}">★</button>`).join('')}
               </span>
               <span class="fb-label">${fbPrompt()}</span>
             </div>`;
      }
    }

    // Tide strip at the bottom of each day.
    // Prefer real API data from tides.json; fall back to the m2phase model.
    const liveEvents = resolvedTideEvents(lat, lon, d);
    const events     = liveEvents ?? tideEvents(phaseH, hwH, lwH, d);

    // When real events are available, derive phaseH for the SVG curve from the
    // actual first HW of that day so the curve aligns with the displayed times.
    let svgPhaseH = phaseH, svgDayOff = d, svgHwH = hwH, svgLwH = lwH;
    if (liveEvents) {
      const firstHW = liveEvents.find(e => e.type === 'H');
      if (firstHW) { svgPhaseH = firstHW.hour; svgDayOff = 0; }
      // Use the day's actual heights for the SVG amplitude when both are present
      const hwEvt = liveEvents.filter(e => e.type === 'H');
      const lwEvt = liveEvents.filter(e => e.type === 'L');
      if (hwEvt.length) svgHwH = Math.max(...hwEvt.map(e => parseFloat(e.height)));
      if (lwEvt.length) svgLwH = Math.min(...lwEvt.map(e => parseFloat(e.height)));
    }

    html += `<div class="day-tide-strip">
      ${tideSVG(svgPhaseH, svgHwH, svgLwH, svgDayOff, d === 0 ? now : null, 340, 44)}
      <div class="day-tide-events">
        ${events.map(e => `
          <span class="dte ${e.type === 'H' ? 'dte-hw' : 'dte-lw'}">
            ${e.type === 'H' ? '▲' : '▼'} ${e.time}
            <span class="dte-ht">${e.height}m</span>
          </span>`).join('')}
      </div>
    </div>`;

    html += '</div>';
  }

  document.getElementById('mswForecast').innerHTML = html;
}

// Surf face height range in feet from a swell height in metres: lo = Hs, hi = face (~1.3× Hs)
function surfFaceHeightFt(swellHMeters) {
  if (swellHMeters == null) return null;
  const lo = Math.max(0, Math.round(swellHMeters * 3.281 * 0.85));
  const hi = Math.max(lo + 1, Math.round(swellHMeters * 3.281 * 1.3));
  return { lo, hi };
}

// Wave height as a feet range, based on the swell component (not total Hs, which
// includes local wind chop and would otherwise diverge from the displayed SWELL figure)
function waveRangeFt(mh, baseIdx, dayOff, centerHour, spread, exposure = 1.0) {
  const vals = [];
  for (let h = Math.max(0, centerHour - spread); h <= Math.min(23, centerHour + spread); h++) {
    const v = safeVal(mh.swell_wave_height, baseIdx + dayOff * 24 + h);
    if (v != null) vals.push(v);
  }
  if (!vals.length) return null;
  return surfFaceHeightFt(vals[Math.floor(vals.length / 2)] * exposure);
}


// ── Moon-phase helpers ────────────────────────────────────────────────────────
function moonAge(date) {
  const ref = new Date('2000-01-06T18:14:00Z');
  const synodic = 29.53058868;
  return (((date - ref) / 86400000) % synodic + synodic) % synodic;
}

function springNeapFactor(date) {
  // 1 at new/full moon (springs), 0 at quarter moons (neaps)
  const angle = (moonAge(date) / 29.53058868) * 4 * Math.PI;
  return (1 + Math.cos(angle)) / 2;
}

function tidalParams(lat, lon, date) {
  let best = TIDAL_NODES[TIDAL_NODES.length - 1], bestDist = Infinity;
  for (const n of TIDAL_NODES) {
    const d = haversine(lat, lon, n.lat, n.lon);
    if (d < bestDist) { bestDist = d; best = n; }
  }
  const f   = springNeapFactor(date);
  const hwH = best.mhwn + (best.mhws - best.mhwn) * f;
  const lwH = best.mlwn - (best.mlwn - best.mlws) * f;

  // Compute date-aware M2 phase in local clock time.
  // HW at station occurs when (epoch_hours - m2phase) ≡ 0 (mod T).
  // We find phaseH = first such time expressed as hours past local midnight,
  // which then drives tideEvents/tideSVG for all 7 forecast days.
  const T = 12.4167;
  const localMidnight  = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const localMidnightH = localMidnight.getTime() / 3600000; // hours since Unix epoch
  const phaseH = ((best.m2phase - localMidnightH % T) % T + T) % T;

  return { hwH, lwH, amp: (hwH - lwH) / 2, phaseH };
}

// Score modifier from spot-specific tidal/wind quirks
function tideQuirkAdj(quirks, phaseH, absHour, windSpd, windDir) {
  if (!quirks) return 0;
  const T = 12.4167;
  const phaseFromHW = ((absHour - phaseH) % T + T) % T; // 0=HW, T/2=LW, T=next HW
  const distFromHW  = Math.min(phaseFromHW, T - phaseFromHW);
  const phaseFromLW = Math.abs(phaseFromHW - T / 2);
  const distFromLW  = Math.min(phaseFromLW, T - phaseFromLW);
  const isRising    = phaseFromHW > T / 2;
  const w = quirks.tideWindow ?? 2;
  let adj = 0;

  if (quirks.tide === 'beforeHigh' && isRising && (T - phaseFromHW) <= w) adj += (quirks.tideBonus ?? 2);
  if (quirks.tide === 'aroundLow'  && distFromLW <= w)                    adj += (quirks.tideBonus ?? 2);
  if (quirks.tide === 'pushing'    && isRising)                            adj += (quirks.tideBonus ?? 2);

  if (quirks.tideBadHigh     && distFromHW < 1) adj -= 1;
  if (quirks.tideBadHighWide && distFromHW < 2) adj -= 1;
  if (quirks.tideBadLow      && distFromLW < w) adj -= 2;

  if (quirks.windShelter && windDir != null && windSpd > 5) {
    const [from, to] = quirks.windShelter;
    const sheltered = from > to
      ? (windDir >= from || windDir <= to)
      : (windDir >= from && windDir <= to);
    if (sheltered) adj += 1;
  }
  return adj;
}

// Tidal sandbank/bathymetry effects can make a spot noticeably bigger or smaller
// at certain points in the tide cycle (e.g. Saunton builds in the 2h before high).
// Mirrors the same windows as tideQuirkAdj but scales displayed/scored wave height directly.
function tideHeightMultiplier(quirks, phaseH, absHour) {
  if (!quirks) return 1.0;
  const T = 12.4167;
  const phaseFromHW = ((absHour - phaseH) % T + T) % T;
  const distFromHW  = Math.min(phaseFromHW, T - phaseFromHW);
  const phaseFromLW = Math.abs(phaseFromHW - T / 2);
  const distFromLW  = Math.min(phaseFromLW, T - phaseFromLW);
  const isRising    = phaseFromHW > T / 2;
  const w = quirks.tideWindow ?? 2;
  let mult = 1.0;

  if (quirks.tide === 'beforeHigh' && isRising && (T - phaseFromHW) <= w) mult *= 1.3;
  if (quirks.tide === 'aroundLow'  && distFromLW <= w)                    mult *= 1.2;
  if (quirks.tide === 'pushing'    && isRising)                            mult *= 1.15;

  if (quirks.tideBadHigh     && distFromHW < 1) mult *= 0.8;
  if (quirks.tideBadHighWide && distFromHW < 2) mult *= 0.8;
  if (quirks.tideBadLow      && distFromLW < w) mult *= 0.7;

  return mult;
}

function tideEvents(phaseH, hwH, lwH, dayOff) {
  const T = 12.4167;
  const events = [];
  for (let k = -2; k <= 5; k++) {
    const hwAbs = phaseH + k * T;
    const hwRel = hwAbs - dayOff * 24;
    if (hwRel >= 0 && hwRel < 24) {
      events.push({ type: 'H', hour: hwRel, height: hwH.toFixed(1) });
    }
    const lwRel = hwRel + T / 2;
    if (lwRel >= 0 && lwRel < 24) {
      events.push({ type: 'L', hour: lwRel, height: lwH.toFixed(1) });
    }
  }
  return events.sort((a, b) => a.hour - b.hour).map(e => ({ ...e, time: fmtH(e.hour) }));
}

// Returns HW/LW events for a given calendar day from the Stormglass-fetched data
// (tides.json).  dayOff: 0 = today, 1 = tomorrow, …  Returns the same
// {type, hour, height, time} shape as tideEvents(), or null when no data is
// available for this location/day (so callers can fall back to tideEvents()).
function resolvedTideEvents(lat, lon, dayOff) {
  if (!tideData || !Array.isArray(tideData.nodes) || !tideData.nodes.length) return null;

  // Find the nearest fetched station (same haversine approach as TIDAL_NODES)
  let best = null, bestDist = Infinity;
  for (const n of tideData.nodes) {
    const d = haversine(lat, lon, n.lat, n.lon);
    if (d < bestDist) { bestDist = d; best = n; }
  }
  // Only use the fetched station if it's within 200 km (keeps international spots
  // on the m2phase model where we have no fetched data).
  if (!best || bestDist > 200 || !Array.isArray(best.extremes)) return null;

  // Build local-time window for the requested day (midnight → next midnight).
  const ref      = new Date();
  const dayStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + dayOff);
  const dayEnd   = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + dayOff + 1);

  const events = best.extremes
    .filter(e => {
      // Stormglass stores the event time as an ISO 8601 string (e.time).
      const ms = new Date(e.time).getTime();
      return ms >= dayStart.getTime() && ms < dayEnd.getTime();
    })
    .map(e => {
      const dt   = new Date(e.time);
      const hour = dt.getHours() + dt.getMinutes() / 60;
      return {
        type:   e.type === 'High' ? 'H' : 'L',
        hour,
        height: e.height.toFixed(1),
        time:   fmtH(hour),
      };
    })
    .sort((a, b) => a.hour - b.hour);

  return events.length > 0 ? events : null;
}

// nowDate is passed only for today so we can draw the "current" white dot
function tideSVG(phaseH, hwH, lwH, dayOff, nowDate, W = 94, H = 34) {
  const P = 3, T = 12.4167;
  const amp = (hwH - lwH) / 2;
  const norm = th => (th + amp) / (2 * amp); // 0 = LW, 1 = HW
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const hr = (i / 48) * 24;
    const th = amp * Math.cos(2 * Math.PI * (hr + dayOff * 24 - phaseH) / T);
    pts.push(`${(P + (i/48)*(W-2*P)).toFixed(1)},${(P + (1-norm(th))*(H-2*P)).toFixed(1)}`);
  }
  const path = 'M ' + pts.join(' L ');

  const hwlwDots = tideEvents(phaseH, hwH, lwH, dayOff).map(e => {
    const th = amp * Math.cos(2 * Math.PI * (e.hour + dayOff * 24 - phaseH) / T);
    const cx = (P + (e.hour/24)*(W-2*P)).toFixed(1);
    const cy = (P + (1-norm(th))*(H-2*P)).toFixed(1);
    return `<circle cx="${cx}" cy="${cy}" r="2.5" fill="${e.type==='H'?'#60a5fa':'#475569'}"/>`;
  }).join('');

  let nowDot = '';
  if (nowDate) {
    const hr = nowDate.getHours() + nowDate.getMinutes() / 60;
    const th = amp * Math.cos(2 * Math.PI * (hr - phaseH) / T);
    const cx = (P + (hr/24)*(W-2*P)).toFixed(1);
    const cy = (P + (1-norm(th))*(H-2*P)).toFixed(1);
    nowDot = `<circle cx="${cx}" cy="${cy}" r="4" fill="white" stroke="#0b0f1c" stroke-width="1.5"/>`;
  }

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;margin:.3rem 0 .35rem">
    <path d="${path}" fill="none" stroke="#1e3a5f" stroke-width="3"/>
    <path d="${path}" fill="none" stroke="#38bdf8" stroke-width="1.5" opacity=".75"/>
    ${hwlwDots}${nowDot}
  </svg>`;
}

function fmtH(h) {
  const t = Math.round(h * 60);
  return `${String(Math.floor(t/60)%24).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
}

// ── Surf star rating (0–5) ────────────────────────────────────────────────────
function isOffshore(windDir, swellDir, offshoreRange) {
  if (windDir == null) return false;
  if (offshoreRange) {
    const [from, to] = offshoreRange;
    return from <= to ? (windDir >= from && windDir <= to) : (windDir >= from || windDir <= to);
  }
  return swellDir != null && angleDiff(windDir, (swellDir + 180) % 360) < 50;
}

function surfScore(waveH, wavePer, windSpd, windDir, swellDir, spotFacing = null, offshoreRange = null, closesOut = null) {
  if (!waveH || waveH < 0.3) return 0;
  if (closesOut != null && waveH > closesOut) return 0;
  let score = 0;

  if      (waveH >= 3.0) score += 3;
  else if (waveH >= 2.0) score += 4;
  else if (waveH >= 1.5) score += 5;
  else if (waveH >= 1.0) score += 2;

  if      (wavePer >= 15) score += 4;
  else if (wavePer >= 12) score += 3;
  else if (wavePer >= 9)  score += 2;
  else if (wavePer >= 6)  score += 1;

  const offshore = isOffshore(windDir, swellDir, offshoreRange);
  if (windSpd != null) {
    if      (windSpd < 10 && offshore) score += 4;
    else if (windSpd < 15 && offshore) score += 3;
    else if (windSpd < 10)             score += 2;
    else if (windSpd < 20)             score += 1;
  }

  // Big swell + strong onshore = dangerous closeouts, heavily penalised
  if (waveH >= 2.5 && windSpd != null && windSpd >= 25 && !offshore) score -= 3;

  if (spotFacing != null && swellDir != null) {
    const diff = angleDiff(swellDir, spotFacing);
    if      (diff <= 30) score += 2;
    else if (diff <= 60) score += 1;
    else if (diff >  90) score -= 1;
  }

  return score;
}

function scoreToStars(score) {
  // Bias shifts thresholds based on personal feedback (clamped to ±2 stars)
  const adj = Math.max(-2, Math.min(2, getStarBias())) * 3;
  if (score >= 11 - adj) return 5;
  if (score >= 8  - adj) return 4;
  if (score >= 5  - adj) return 3;
  if (score >= 2  - adj) return 2;
  return 1;
}

function surfStars(waveH, wavePer, windSpd, windDir, swellDir, spotFacing = null, offshoreRange = null, closesOut = null) {
  const score = surfScore(waveH, wavePer, windSpd, windDir, swellDir, spotFacing, offshoreRange, closesOut);
  return score === 0 ? 0 : scoreToStars(score);
}

function foilScore(waveH, wavePer, windSpd, windDir, swellDir, spotFacing = null, offshoreRange = null) {
  if (!waveH || waveH < 0.2) return 0;
  let score = 0;

  if      (waveH >= 2.5) score += 2;
  else if (waveH >= 1.5) score += 3;
  else if (waveH >= 0.8) score += 5;
  else if (waveH >= 0.5) score += 4;
  else if (waveH >= 0.2) score += 2;

  if      (wavePer >= 15) score += 5;
  else if (wavePer >= 12) score += 4;
  else if (wavePer >= 9)  score += 2;
  else if (wavePer >= 6)  score += 1;

  const offshore = isOffshore(windDir, swellDir, offshoreRange);
  if (windSpd != null) {
    if      (windSpd < 10 && offshore) score += 4;
    else if (windSpd < 20 && offshore) score += 3;
    else if (windSpd < 10)             score += 3;
    else if (windSpd < 20)             score += 2;
    else if (windSpd < 25)             score += 1;
    else score -= 2;
  }

  if (spotFacing != null && swellDir != null) {
    const diff = angleDiff(swellDir, spotFacing);
    if      (diff <= 30) score += 2;
    else if (diff <= 60) score += 1;
    else if (diff >  90) score -= 1;
  }

  return score;
}

function foilStars(waveH, wavePer, windSpd, windDir, swellDir, spotFacing = null, offshoreRange = null) {
  const score = foilScore(waveH, wavePer, windSpd, windDir, swellDir, spotFacing, offshoreRange);
  return score === 0 ? 0 : scoreToStars(score);
}

function angleDiff(a, b) {
  let d = ((a - b) + 360) % 360;
  return d > 180 ? 360 - d : d;
}

function renderStars(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }
function starsClass(n)  { return `stars-${n}`; }

function waveClass(h) {
  if (!h || h < 0.3) return 'wh-flat';
  if (h < 0.8)  return 'wh-small';
  if (h < 1.5)  return 'wh-medium';
  if (h < 2.5)  return 'wh-good';
  if (h < 4.0)  return 'wh-big';
  return 'wh-huge';
}

function windClass(spd, dir, waveDir, offshoreRange = null) {
  if (dir == null || spd == null) return '';
  if (spd > 35) return 'wind-on';
  if (offshoreRange) {
    const [from, to] = offshoreRange;
    const off = from <= to ? (dir >= from && dir <= to) : (dir >= from || dir <= to);
    const midOff = from <= to ? (from + to) / 2 : ((from + to + 360) / 2) % 360;
    const d = angleDiff(dir, midOff);
    if (off || d < 50)  return 'wind-off';
    if (d < 100) return 'wind-cross';
    return 'wind-on';
  }
  if (waveDir != null) {
    const d = angleDiff(dir, (waveDir + 180) % 360);
    if (d < 50)  return 'wind-off';
    if (d < 100) return 'wind-cross';
    return 'wind-on';
  }
  return spd < 15 ? 'wind-off' : spd < 25 ? 'wind-cross' : 'wind-on';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v, dec) {
  if (v == null || isNaN(v)) return '—';
  return Number(v).toFixed(dec);
}

const ARROWS = ['↑','↗','→','↘','↓','↙','←','↖'];
const NAMES  = ['N','NE','E','SE','S','SW','W','NW'];
function dirArrow(d) { return d == null ? '—' : ARROWS[Math.round(d/45)%8]; }

// Build a "+2ft SW 11s" label for a secondary swell train, or null if absent/too small to matter
function secondarySwellLabel(secHRaw, secDir, secPer, exposure) {
  if (secHRaw == null) return null;
  const secH = secHRaw * exposure;
  if (secH < 0.3) return null;
  const ft = Math.round(secH * 3.281);
  return `+${ft}ft ${dirName(secDir)} ${fmt(secPer, 0)}s`;
}
function dirName(d)  { return d == null ? '' : NAMES[Math.round(d/45)%8]; }

// ── UI state ──────────────────────────────────────────────────────────────────
function showLoading() {
  [splash, appEl, errorEl].forEach(el => el.classList.add('hidden'));
  buoyReadoutEl.classList.add('hidden');
  loadingEl.classList.remove('hidden');
}
function showApp() {
  [loadingEl, errorEl, splash].forEach(el => el.classList.add('hidden'));
  appEl.classList.remove('hidden');
  document.getElementById('modelTabs').classList.remove('hidden');
  document.getElementById('activityTabs').classList.remove('hidden');
  setTimeout(showInstallBanner, 4000);
}

// ── Add to Home Screen prompt ─────────────────────────────────────────────────
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

function showInstallBanner() {
  if (localStorage.getItem('mlw_install_dismissed')) return;
  const isStandalone = window.navigator.standalone ||
    window.matchMedia('(display-mode: standalone)').matches;
  if (isStandalone) return;

  const banner = document.getElementById('installBanner');
  const msg    = document.getElementById('installMsg');
  const btn    = document.getElementById('installBtn');
  const isIOS  = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (isIOS) {
    msg.innerHTML = '📲 Add to home screen: tap <strong>Share ↑</strong> then <strong>Add to Home Screen</strong>';
  } else if (deferredInstallPrompt) {
    msg.textContent = '📲 Install Magic Lie Weed for quick access from your home screen';
    btn.classList.remove('hidden');
    btn.addEventListener('click', () => {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(() => {
        deferredInstallPrompt = null;
        banner.classList.add('hidden');
        localStorage.setItem('mlw_install_dismissed', '1');
      });
    });
  } else {
    return;
  }

  banner.classList.remove('hidden');
  document.getElementById('installDismiss').addEventListener('click', () => {
    banner.classList.add('hidden');
    localStorage.setItem('mlw_install_dismissed', '1');
  });
}

// ── Crew code UI ──────────────────────────────────────────────────────────────
(function initCrew() {
  const input = document.getElementById('crewInput');
  const btn   = document.getElementById('crewSave');
  const saved = getCrewCode();
  if (saved) input.value = saved;
  btn.addEventListener('click', () => {
    const code = setCrewCode(input.value);
    input.value = code;
    btn.textContent = code ? '✓ Saved' : 'Cleared';
    setTimeout(() => { btn.textContent = 'Save'; }, 1500);
  });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });
})();

// Model tab switching
document.getElementById('modelTabs').addEventListener('click', e => {
  const btn = e.target.closest('.model-tab');
  if (!btn || btn.classList.contains('active') || !currentLat) return;
  document.querySelectorAll('.model-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentModel = btn.dataset.model;
  localStorage.setItem('mlw_model', currentModel);
  reloadForecast();
});

// Reflect the restored wind model in the tab UI (data is re-fetched per the active model anyway)
document.querySelectorAll('.model-tab').forEach(b => {
  b.classList.toggle('active', b.dataset.model === currentModel);
});

// Activity tab switching (surf vs foil)
document.getElementById('activityTabs').addEventListener('click', e => {
  const btn = e.target.closest('.activity-tab');
  if (!btn || btn.classList.contains('active')) return;
  currentActivity = btn.dataset.activity;
  localStorage.setItem('mlw_activity', currentActivity);
  document.querySelectorAll('.activity-tab').forEach(b => b.classList.toggle('active', b === btn));
  if (cachedRenderArgs) {
    const { lat, lon, name, marine, weather } = cachedRenderArgs;
    renderAll(lat, lon, name, marine, weather);
  }
});

// Reflect restored activity in tab UI
document.querySelectorAll('.activity-tab').forEach(b => {
  b.classList.toggle('active', b.dataset.activity === currentActivity);
});
function showError(msg) {
  [loadingEl, appEl].forEach(el => el.classList.add('hidden'));
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
  splash.classList.remove('hidden');
}

// ── Personal feedback & calibration ──────────────────────────────────────────
const FB_KEY = 'mlw_fb';

function loadFeedback() {
  try { return JSON.parse(localStorage.getItem(FB_KEY) || '[]'); } catch { return []; }
}

function saveFeedback(arr) {
  localStorage.setItem(FB_KEY, JSON.stringify(arr.slice(-500)));
}

function deviceId() {
  let id = localStorage.getItem('mlw_did');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('mlw_did', id); }
  return id;
}

// Blend personal, crew, and global crowd bias
function getStarBias() {
  const personal   = parseFloat(localStorage.getItem('mlw_bias') || '0');
  const crewBias   = parseFloat(localStorage.getItem('mlw_crew_bias') || '0');
  const globalBias = parseFloat(localStorage.getItem('mlw_global_bias') || '0');
  const count      = loadFeedback().length;
  // Crew bias replaces global when a crew code is set
  const community  = getCrewCode() ? crewBias : globalBias;
  if (count >= 10) return personal * 0.8 + community * 0.2;
  if (count >= 3)  return personal * 0.5 + community * 0.5;
  return community;
}

function recordFeedback(entry) {
  const all = loadFeedback().filter(e =>
    !(e.date === entry.date && e.slot === entry.slot &&
      e.lat  === entry.lat  && e.lon  === entry.lon));
  all.push(entry);
  saveFeedback(all);
  // bias = mean(actual - predicted); applied in scoreToStars
  const bias = all.reduce((s, e) => s + (e.actual - e.predicted), 0) / all.length;
  localStorage.setItem('mlw_bias', bias.toFixed(3));
  // Fire-and-forget POST to Google Sheet
  if (SHEETS_URL) {
    // mode: no-cors required for cross-origin POST to Apps Script (fire-and-forget)
    fetch(SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        deviceId: deviceId(),
        date: entry.date, slot: entry.slot,
        lat: entry.lat, lon: entry.lon,
        predicted: entry.predicted, actual: entry.actual,
        waveH: entry.waveH ?? null, period: entry.period ?? null,
        windSpd: entry.windSpd ?? null, offshore: entry.offshore ?? null,
        swellDiff: entry.swellAngleDiff ?? null,
        crew: getCrewCode() ?? '',
      }),
    }).catch(() => {});
  }
}

// Fetch crowd bias (and crew bias if code set) from Google Sheet
async function fetchGlobalBias() {
  if (!SHEETS_URL) return;
  try {
    const res  = await fetch(SHEETS_URL, { redirect: 'follow' });
    const data = await res.json();
    if (typeof data.bias === 'number' && data.count >= 5) {
      localStorage.setItem('mlw_global_bias', data.bias.toFixed(3));
    }
    const crew = getCrewCode();
    if (crew) {
      const cr = await fetch(`${SHEETS_URL}?crew=${encodeURIComponent(crew)}`, { redirect: 'follow' });
      const cd = await cr.json();
      if (typeof cd.bias === 'number' && cd.count >= 3) {
        localStorage.setItem('mlw_crew_bias', cd.bias.toFixed(3));
      }
    }
  } catch (_) {}
}

// Event delegation: hover preview + click to rate
document.getElementById('mswForecast').addEventListener('mouseover', e => {
  const star = e.target.closest('.fb-star');
  if (!star) return;
  const v = parseInt(star.dataset.v, 10);
  star.closest('.fb-stars').querySelectorAll('.fb-star')
    .forEach(s => s.classList.toggle('hovered', parseInt(s.dataset.v, 10) <= v));
});

document.getElementById('mswForecast').addEventListener('mouseout', e => {
  const starsEl = e.target.closest('.fb-stars');
  if (starsEl && !starsEl.contains(e.relatedTarget)) {
    starsEl.querySelectorAll('.fb-star').forEach(s => s.classList.remove('hovered'));
  }
});

document.getElementById('mswForecast').addEventListener('click', e => {
  const star = e.target.closest('.fb-star');
  if (!star) return;
  const fb     = star.closest('.slot-feedback');
  const actual = parseInt(star.dataset.v, 10);
  recordFeedback({
    date:     fb.dataset.date,
    slot:     fb.dataset.slot,
    lat:      parseFloat(fb.dataset.lat),
    lon:      parseFloat(fb.dataset.lon),
    predicted: parseInt(fb.dataset.predicted, 10),
    actual,
    waveH:    parseFloat(fb.dataset.wh)   || null,
    period:   parseFloat(fb.dataset.per)  || null,
    windSpd:  parseFloat(fb.dataset.wsp)  || null,
    offshore: fb.dataset.off === 'true',
    swellAngleDiff: fb.dataset.sdiff ? parseFloat(fb.dataset.sdiff) : null,
  });
  fb.innerHTML = `<span class="fb-label">Rated</span>
    <span class="fb-rated">${'★'.repeat(actual)}${'☆'.repeat(5 - actual)}</span>
    <span class="fb-count">${loadFeedback().length} session${loadFeedback().length === 1 ? '' : 's'} rated</span>`;
});

// Fetch crowd bias in the background on startup (updates mlw_global_bias cache)
fetchGlobalBias();

// Load WorldTides-fetched tide predictions (tides.json) once at startup so
// they are available when the first forecast renders.
loadTideData();

// Reopen the last-viewed location automatically instead of showing the splash screen
(function restoreLastLocation() {
  try {
    const last = JSON.parse(localStorage.getItem(LAST_LOC_KEY) || 'null');
    if (last && typeof last.lat === 'number' && typeof last.lon === 'number') {
      loadForecast(last.lat, last.lon, last.name);
    }
  } catch (_) {}
})();
