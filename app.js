'use strict';

const WINDY_KEY = 'nLTvWT2UmcDdp3GkdRiQWDFUdRR5wY19';

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
  { name: 'Fistral Beach',     lat: 50.4145, lon: -5.1044 },
  { name: 'Watergate Bay',     lat: 50.4467, lon: -5.0558 },
  { name: 'Polzeath',          lat: 50.5742, lon: -4.8728 },
  { name: 'Perranporth',       lat: 50.3467, lon: -5.1503 },
  { name: 'Sennen Cove',       lat: 50.0703, lon: -5.6986 },
  { name: 'Bude',              lat: 50.8272, lon: -4.5436 },
  { name: 'Croyde',            lat: 51.1236, lon: -4.2282 },
  { name: 'Saunton Sands',     lat: 51.1197, lon: -4.2322 },
  { name: 'Saltburn',          lat: 54.5844, lon: -0.9728 },
  { name: 'Thurso East',       lat: 58.5936, lon: -3.5239 },
  { name: 'Tiree',             lat: 56.5000, lon: -6.9167 },
  { name: 'Portrush',          lat: 55.2044, lon: -6.6612 },
  { name: 'Bundoran',          lat: 54.4776, lon: -8.2782 },
  { name: 'Rossnowlagh',       lat: 54.6417, lon: -8.2083 },
  { name: 'Easkey',            lat: 54.2942, lon: -8.9611 },
  { name: 'Lahinch',           lat: 52.9335, lon: -9.3438 },
  { name: 'Inch Beach',        lat: 52.1417, lon: -9.9417 },
  // France & Spain
  { name: 'Hossegor',          lat: 43.6528, lon: -1.4456 },
  { name: 'Biarritz',          lat: 43.4832, lon: -1.5586 },
  { name: 'Mundaka',           lat: 43.4067, lon: -2.6844 },
  { name: 'Zarautz',           lat: 43.2856, lon: -2.1714 },
  { name: 'Zurriola',          lat: 43.3266, lon: -1.9728 },
  { name: 'Pantín',            lat: 43.6167, lon: -7.8500 },
  { name: 'Rodiles',           lat: 43.5342, lon: -5.4697 },
  // Portugal
  { name: 'Nazaré',            lat: 39.6000, lon: -9.0667 },
  { name: 'Peniche',           lat: 39.3556, lon: -9.3814 },
  { name: 'Ericeira',          lat: 38.9667, lon: -9.4167 },
  { name: 'Sagres',            lat: 37.0133, lon: -8.9378 },
  // Morocco & Canaries
  { name: 'Taghazout',         lat: 30.5442, lon: -9.7089 },
  { name: 'Anchor Point',      lat: 30.5592, lon: -9.7169 },
  { name: 'El Médano',         lat: 28.0461, lon: -16.5358 },
  { name: 'Las Palmas',        lat: 28.1272, lon: -15.4194 },
  // Hawaii
  { name: 'Pipeline',          lat: 21.6645, lon: -158.0530 },
  { name: 'Sunset Beach',      lat: 21.6789, lon: -158.0400 },
  { name: 'Waimea Bay',        lat: 21.6433, lon: -158.0644 },
  { name: 'Jaws (Peahi)',      lat: 20.9378, lon: -156.3906 },
  // USA
  { name: 'Mavericks',         lat: 37.4939, lon: -122.5011 },
  { name: 'Steamer Lane',      lat: 36.9521, lon: -122.0231 },
  { name: 'Rincon',            lat: 34.3726, lon: -119.4784 },
  { name: 'Trestles',          lat: 33.3833, lon: -117.5833 },
  { name: 'Huntington Beach',  lat: 33.6595, lon: -118.0057 },
  { name: 'The Wedge',         lat: 33.5933, lon: -117.8844 },
  // Mexico & Central America
  { name: 'Puerto Escondido',  lat: 15.8656, lon: -97.0703 },
  { name: 'Sayulita',          lat: 20.8681, lon: -105.4347 },
  { name: 'Tamarindo',         lat: 10.2997, lon: -85.8369 },
  { name: 'Pavones',           lat:  8.4411, lon: -83.1594 },
  // Pacific & Polynesia
  { name: "Teahupo'o",         lat: -17.8672, lon: -149.2622 },
  { name: 'Cloudbreak',        lat: -17.9781, lon:  177.2139 },
  // Indonesia & Asia
  { name: 'Uluwatu',           lat:  -8.8294, lon:  115.0849 },
  { name: 'Padang Padang',     lat:  -8.8108, lon:  115.0917 },
  { name: 'Kuta Beach',        lat:  -8.7189, lon:  115.1686 },
  { name: 'Desert Point',      lat:  -8.7872, lon:  115.9247 },
  { name: 'G-Land',            lat:  -8.6667, lon:  114.4333 },
  { name: 'Cloud 9, Siargao',  lat:   9.8498, lon:  126.0458 },
  { name: 'Arugam Bay',        lat:   6.8419, lon:   81.8361 },
  // Australia
  { name: 'Snapper Rocks',     lat: -28.1753, lon:  153.5558 },
  { name: 'Kirra',             lat: -28.1694, lon:  153.5586 },
  { name: 'Lennox Head',       lat: -28.7942, lon:  153.5928 },
  { name: 'Manly Beach',       lat: -33.7969, lon:  151.2855 },
  { name: 'Bondi Beach',       lat: -33.8908, lon:  151.2743 },
  { name: 'Bells Beach',       lat: -38.3667, lon:  144.2833 },
  { name: 'Margaret River',    lat: -33.9539, lon:  114.7519 },
  // South Africa
  { name: "Jeffreys Bay",      lat: -34.0500, lon:   24.9167 },
  { name: 'Big Bay',           lat: -33.7325, lon:   18.4756 },
  { name: 'Durban',            lat: -29.8587, lon:   31.0218 },
  // South America
  { name: 'Punta Rocas',       lat: -12.4739, lon:  -76.8278 },
  { name: 'Lobitos',           lat:  -4.4525, lon:  -81.2731 },
  { name: 'Florianópolis',     lat: -27.5969, lon:  -48.5495 },
  { name: 'Itacaré',           lat: -14.2774, lon:  -38.9946 },
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
const nowBanner      = document.getElementById('nowBanner');
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
    () => showError('Could not get your location. Please allow location access and try again.')
  );
});

async function reverseGeocode(lat, lon) {
  try {
    const res  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=&latitude=${lat}&longitude=${lon}&count=1&language=en&format=json`);
    const data = await res.json();
    if (data.results?.[0]) return data.results[0].name;
  } catch (_) {}
  return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
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
    .map(s => ({ ...s, dist: haversine(lat, lon, s.lat, s.lon) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, n);
}

// ── Webcams (Windy API) ───────────────────────────────────────────────────────
async function fetchWebcams(lat, lon) {
  const url = `https://api.windy.com/api/webcams/v2/list/nearby/${lat},${lon},100` +
              `?show=webcams:image,location,url&key=${WINDY_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Windy API error');
  const data = await res.json();
  return (data.result?.webcams || []).filter(w => w.status === 'active');
}

function renderWebcams(lat, lon) {
  const section = document.getElementById('webcamSection');
  const row     = document.getElementById('webcamRow');
  row.innerHTML = '<span class="wc-loading">Loading cameras…</span>';
  section.classList.remove('hidden');

  fetchWebcams(lat, lon)
    .then(cams => {
      if (!cams.length) { section.classList.add('hidden'); return; }
      const sorted = cams
        .map(c => ({ ...c, dist: haversine(lat, lon, c.location.latitude, c.location.longitude) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 6);

      row.innerHTML = '';
      sorted.forEach(c => {
        const thumb = c.image?.current?.preview || c.image?.current?.thumbnail;
        const link  = c.url?.current?.desktop   || `https://www.windy.com/webcams/${c.id}`;
        const card  = document.createElement('a');
        card.className = 'webcam-card';
        card.href      = link;
        card.target    = '_blank';
        card.rel       = 'noopener noreferrer';
        card.innerHTML = `
          ${thumb ? `<img src="${thumb}" alt="${c.title}" loading="lazy"/>` : '<div class="wc-no-img">📷</div>'}
          <div class="wc-name">${c.title}</div>
          <div class="wc-dist">${Math.round(c.dist)}km away</div>`;
        row.appendChild(card);
      });
    })
    .catch(() => section.classList.add('hidden'));
}

// ── Nearest surf spots (OSM) ──────────────────────────────────────────────────
// Query OpenStreetMap via Overpass API for real surf spots nearby
async function fetchOSMSpots(lat, lon) {
  // Exclude surf schools, shops and clubs at the query level
  const filters = `["sport"="surfing"][!"amenity"][!"shop"][!"club"]["leisure"!="sports_centre"]`;
  const q = `[out:json][timeout:10];(`+
    `node${filters}(around:300000,${lat},${lon});`+
    `way${filters}(around:300000,${lat},${lon});`+
    `);out center;`;
  const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('Overpass error');
  const data = await res.json();
  const COMMERCIAL = /school|shop|hire|lesson|academy|coaching|tuition|club|centre|center|ltd|co\.|llc/i;
  return data.elements
    .filter(el => el.tags?.name && !COMMERCIAL.test(el.tags.name))
    .map(el => ({
      name: el.tags.name,
      lat:  el.lat  ?? el.center?.lat,
      lon:  el.lon  ?? el.center?.lon,
    }))
    .filter(s => s.lat != null);
}

// Show loading state immediately, then populate from OSM (fallback to hardcoded list)
function renderNearbySpots(lat, lon) {
  nearbySpotsEl.innerHTML = '<span class="nearby-label">Nearby spots:</span><span class="nearby-loading">…</span>';
  nearbySpotsEl.classList.remove('hidden');

  fetchOSMSpots(lat, lon)
    .then(osmSpots => {
      // Rank by distance, deduplicate spots within 2 km of each other
      const ranked = osmSpots
        .map(s => ({ ...s, dist: haversine(lat, lon, s.lat, s.lon) }))
        .sort((a, b) => a.dist - b.dist);

      const deduped = [];
      for (const s of ranked) {
        if (!deduped.some(e => haversine(s.lat, s.lon, e.lat, e.lon) < 2)) {
          deduped.push(s);
          if (deduped.length === 3) break;
        }
      }
      // If OSM gave us fewer than 3 results, pad with hardcoded fallback
      if (deduped.length < 3) {
        for (const s of nearestSpots(lat, lon)) {
          if (!deduped.some(e => haversine(s.lat, s.lon, e.lat, e.lon) < 5)) {
            deduped.push(s);
            if (deduped.length === 3) break;
          }
        }
      }
      paintSpotButtons(deduped, lat, lon);
    })
    .catch(() => paintSpotButtons(nearestSpots(lat, lon), lat, lon));
}

function paintSpotButtons(spots, lat, lon) {
  nearbySpotsEl.innerHTML = '<span class="nearby-label">Nearby spots:</span>';
  spots.forEach(s => {
    const dist = s.dist ?? haversine(lat, lon, s.lat, s.lon);
    const btn  = document.createElement('button');
    btn.className = 'spot-btn';
    btn.innerHTML = `${s.name} <span class="spot-dist">${Math.round(dist)}km</span>`;
    btn.addEventListener('click', () => loadForecast(s.lat, s.lon, s.name));
    nearbySpotsEl.appendChild(btn);
  });
}

// ── API ───────────────────────────────────────────────────────────────────────
async function loadForecast(lat, lon, name) {
  showLoading();
  try {
    const marineVars = 'wave_height,wave_period,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction';
    const [mRes, wRes] = await Promise.all([
      fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=${marineVars}&timezone=auto&forecast_days=7`),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=windspeed_10m,winddirection_10m&timezone=auto&forecast_days=7`),
    ]);
    if (!mRes.ok) throw new Error('Marine API error — this location may be inland or unsupported.');
    if (!wRes.ok) throw new Error('Weather API error.');
    const [marine, weather] = await Promise.all([mRes.json(), wRes.json()]);
    renderAll(lat, lon, name, marine, weather);
  } catch (err) {
    showError(`Failed to load forecast: ${err.message}`);
  }
}

// ── Master render ─────────────────────────────────────────────────────────────
function renderAll(lat, lon, name, marine, weather) {
  locationName.textContent   = name;
  locationCoords.textContent = `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;

  const mh  = marine.hourly;
  const wh  = weather.hourly;
  const now = new Date();

  const todayStr = now.toISOString().slice(0, 10);
  const nowHStr  = now.toISOString().slice(0, 13);
  const baseIdx  = Math.max(0, mh.time.findIndex(t => t.startsWith(todayStr)));
  const nowIdx   = mh.time.findIndex(t => t.startsWith(nowHStr));
  const safeNow  = nowIdx >= 0 ? nowIdx : baseIdx + now.getHours();

  renderNearbySpots(lat, lon);
  renderWebcams(lat, lon);
  renderNowBanner(mh, wh, safeNow);
  renderForecastGrid(mh, wh, baseIdx, lat, lon);
  showApp();

}

function safeVal(arr, idx) {
  return arr && idx >= 0 && idx < arr.length ? arr[idx] : null;
}

// ── Current conditions banner ─────────────────────────────────────────────────
function renderNowBanner(mh, wh, idx) {
  const waveH   = safeVal(mh.wave_height, idx);
  const wavePer = safeVal(mh.wave_period, idx);
  const waveDir = safeVal(mh.wave_direction, idx);
  const swellH  = safeVal(mh.swell_wave_height, idx);
  const windSpd = safeVal(wh.windspeed_10m, idx);
  const windDir = safeVal(wh.winddirection_10m, idx);
  const stars   = surfStars(waveH, wavePer, windSpd, windDir, waveDir);

  const waveHFt  = waveH  != null ? Math.round(waveH  * 3.281) : null;
  const swellHFt = swellH != null ? Math.round(swellH * 3.281) : null;
  const windMph  = windSpd != null ? Math.round(windSpd * 0.621) : null;

  nowBanner.innerHTML = `
    <div class="now-stat">
      <span class="ns-label">Now</span>
      <span class="ns-value"><span class="stars ${starsClass(stars)}">${renderStars(stars)}</span></span>
    </div>
    <div class="now-stat">
      <span class="ns-label">Waves</span>
      <span class="ns-value ${waveClass(waveH)}">${waveHFt ?? '—'}<small>ft</small></span>
    </div>
    <div class="now-stat">
      <span class="ns-label">Period</span>
      <span class="ns-value">${fmt(wavePer,0)}<small>s</small></span>
    </div>
    <div class="now-stat">
      <span class="ns-label">Swell</span>
      <span class="ns-value">${swellHFt ?? '—'}<small>ft</small></span>
    </div>
    <div class="now-stat">
      <span class="ns-label">Wind</span>
      <span class="ns-value ${windClass(windSpd,windDir,waveDir)}">${dirArrow(windDir)} ${windMph ?? '—'}<small>mph</small></span>
    </div>
    <div class="now-stat">
      <span class="ns-label">Direction</span>
      <span class="ns-value">${dirArrow(waveDir)} ${dirName(waveDir)}</span>
    </div>
  `;
}

// ── MSW-style forecast: days as sections, time slots as rows ─────────────────
function renderForecastGrid(mh, wh, baseIdx, lat, lon) {
  const now     = new Date();
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const phaseH  = ((lon + 180) / 360) * 12.42;
  const amp     = 1.5 + 0.5 * Math.abs(Math.cos(lat * Math.PI / 180));
  let   html    = '';

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
        <span></span><span>SURF</span><span>SWELL</span><span>WIND</span>
      </div>`;

    for (const slot of SLOTS) {
      const idx     = baseIdx + d * 24 + slot.hour;
      const waveH   = safeVal(mh.wave_height, idx);
      const wavePer = safeVal(mh.wave_period, idx);
      const waveDir = safeVal(mh.wave_direction, idx);
      const swellH  = safeVal(mh.swell_wave_height, idx);
      const swellPer= safeVal(mh.swell_wave_period, idx);
      const windSpd = safeVal(wh.windspeed_10m, idx);
      const windDir = safeVal(wh.winddirection_10m, idx);
      const stars   = surfStars(waveH, wavePer, windSpd, windDir, waveDir);

      // Wave range in feet (surf height → face height)
      const range   = waveRangeFt(mh, baseIdx, d, slot.hour, slot.spread);
      const rangeStr= range ? `${range.lo}-${range.hi}` : '—';

      // Wind in mph
      const windMph = windSpd != null ? Math.round(windSpd * 0.621) : null;
      const wc      = windClass(windSpd, windDir, waveDir);
      const badge   = wc === 'wind-off' ? 'badge-off' : wc === 'wind-cross' ? 'badge-cross' : 'badge-on';

      // Swell in feet
      const swellFt = swellH != null ? Math.round(swellH * 3.281) : null;
      const swellPerDisp = swellPer ?? wavePer;

      // Highlight the current time slot on today
      const isNow = d === 0 && nowHour >= slot.hour - slot.spread &&
                    nowHour < slot.hour + slot.spread;

      html += `<div class="msw-row${isNow ? ' is-now' : ''}">
        <div class="msw-time">${slot.label}</div>
        <div class="msw-surf">
          <div class="wave-range ${waveClass(waveH)}">${rangeStr}<span class="ft">ft</span></div>
          <div class="slot-stars stars ${starsClass(stars)}">${renderStars(stars)}</div>
        </div>
        <div class="msw-swell">
          <div class="swell-ht">${swellFt != null ? swellFt : '—'}<small>ft</small>
            &nbsp;<span style="color:var(--muted);font-size:.8rem">${fmt(swellPerDisp,0)}s</span>
          </div>
          <div class="swell-meta">${dirArrow(waveDir)} <span class="swell-deg">${waveDir != null ? Math.round(waveDir)+'°' : ''}</span></div>
        </div>
        <div class="msw-wind">
          <div class="wind-mph">${windMph ?? '—'}<small>mph</small></div>
          <div class="wind-badge ${badge}">${dirName(windDir) || '—'}</div>
        </div>
      </div>`;
    }

    // Tide strip at the bottom of each day
    const events = tideEvents(phaseH, amp, d);
    html += `<div class="day-tide-strip">
      ${tideSVG(phaseH, amp, d, d === 0 ? now : null, 340, 44)}
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

// Wave height as a feet range: lo = Hs in ft, hi = face height (~1.75× Hs)
function waveRangeFt(mh, baseIdx, dayOff, centerHour, spread) {
  const vals = [];
  for (let h = Math.max(0, centerHour - spread); h <= Math.min(23, centerHour + spread); h++) {
    const v = safeVal(mh.wave_height, baseIdx + dayOff * 24 + h);
    if (v != null) vals.push(v);
  }
  if (!vals.length) return null;
  const mid = vals[Math.floor(vals.length / 2)];
  const lo  = Math.max(1, Math.round(mid * 3.281));
  const hi  = Math.max(lo + 1, Math.round(mid * 3.281 * 1.75));
  return { lo, hi };
}


function tideEvents(phaseH, amp, dayOff) {
  const T = 12.4167;
  const events = [];
  for (let k = -2; k <= 5; k++) {
    const hwAbs = phaseH + k * T;
    const hwRel = hwAbs - dayOff * 24;
    if (hwRel >= 0 && hwRel < 24) {
      events.push({ type: 'H', hour: hwRel, height: (amp * 0.92 + 0.1 * Math.sin(k * 0.8)).toFixed(1) });
    }
    const lwRel = hwRel + T / 2;
    if (lwRel >= 0 && lwRel < 24) {
      events.push({ type: 'L', hour: lwRel, height: (amp * 0.1 + 0.05 * Math.abs(Math.cos(k))).toFixed(1) });
    }
  }
  return events.sort((a, b) => a.hour - b.hour).map(e => ({ ...e, time: fmtH(e.hour) }));
}

// nowDate is passed only for today so we can draw the "current" white dot
function tideSVG(phaseH, amp, dayOff, nowDate, W = 94, H = 34) {
  const P = 3, T = 12.4167;
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const hr = (i / 48) * 24;
    const th = amp * Math.cos(2 * Math.PI * (hr + dayOff * 24 - phaseH) / T);
    pts.push(`${(P + (i/48)*(W-2*P)).toFixed(1)},${(P + (1-(th+amp)/(2*amp))*(H-2*P)).toFixed(1)}`);
  }
  const path = 'M ' + pts.join(' L ');

  const hwlwDots = tideEvents(phaseH, amp, dayOff).map(e => {
    const th = amp * Math.cos(2 * Math.PI * (e.hour + dayOff * 24 - phaseH) / T);
    const cx = (P + (e.hour/24)*(W-2*P)).toFixed(1);
    const cy = (P + (1-(th+amp)/(2*amp))*(H-2*P)).toFixed(1);
    return `<circle cx="${cx}" cy="${cy}" r="2.5" fill="${e.type==='H'?'#60a5fa':'#475569'}"/>`;
  }).join('');

  let nowDot = '';
  if (nowDate) {
    const hr = nowDate.getHours() + nowDate.getMinutes() / 60;
    const th = amp * Math.cos(2 * Math.PI * (hr - phaseH) / T);
    const cx = (P + (hr/24)*(W-2*P)).toFixed(1);
    const cy = (P + (1-(th+amp)/(2*amp))*(H-2*P)).toFixed(1);
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
function surfStars(waveH, wavePer, windSpd, windDir, swellDir) {
  if (!waveH || waveH < 0.3) return 0;
  let score = 0;

  if      (waveH >= 3.0) score += 6;
  else if (waveH >= 2.0) score += 5;
  else if (waveH >= 1.5) score += 4;
  else if (waveH >= 1.0) score += 3;
  else if (waveH >= 0.6) score += 1;

  if      (wavePer >= 15) score += 4;
  else if (wavePer >= 12) score += 3;
  else if (wavePer >= 9)  score += 2;
  else if (wavePer >= 6)  score += 1;

  const offshore = windDir != null && swellDir != null &&
    angleDiff(windDir, (swellDir + 180) % 360) < 50;
  if (windSpd != null) {
    if      (windSpd < 10 && offshore) score += 5;
    else if (windSpd < 15 && offshore) score += 4;
    else if (windSpd < 10)             score += 3;
    else if (windSpd < 20)             score += 2;
    else if (windSpd < 30)             score += 1;
  }

  if (score >= 13) return 5;
  if (score >= 10) return 4;
  if (score >= 7)  return 3;
  if (score >= 4)  return 2;
  return 1;
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

function windClass(spd, dir, waveDir) {
  if (dir == null || spd == null) return '';
  if (spd > 35) return 'wind-on';
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
function dirName(d)  { return d == null ? '' : NAMES[Math.round(d/45)%8]; }

// ── UI state ──────────────────────────────────────────────────────────────────
function showLoading() {
  [splash, appEl, errorEl].forEach(el => el.classList.add('hidden'));
  loadingEl.classList.remove('hidden');
}
function showApp() {
  [loadingEl, errorEl, splash].forEach(el => el.classList.add('hidden'));
  appEl.classList.remove('hidden');
}
function showError(msg) {
  [loadingEl, appEl].forEach(el => el.classList.add('hidden'));
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
  splash.classList.remove('hidden');
}
