'use strict';

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
const currentConds   = document.getElementById('currentConditions');
const forecastBody   = document.getElementById('forecastBody');
const tideGrid       = document.getElementById('tideGrid');

// ── Autocomplete ──────────────────────────────────────────────────────────────
// Wrap input in a relative div for suggestion dropdown
(function setupAutocomplete() {
  const wrapper = document.createElement('div');
  wrapper.className = 'autocomplete-wrapper';
  locationInput.parentNode.insertBefore(wrapper, locationInput);
  wrapper.appendChild(locationInput);

  const ul = document.createElement('ul');
  ul.id = 'suggestions';
  wrapper.appendChild(ul);
})();

const suggestionsEl = document.getElementById('suggestions');
let debounceTimer;

locationInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const q = locationInput.value.trim();
  if (q.length < 3) { suggestionsEl.innerHTML = ''; return; }
  debounceTimer = setTimeout(() => fetchSuggestions(q), 300);
});

async function fetchSuggestions(q) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`;
    const res = await fetch(url);
    const data = await res.json();
    renderSuggestions(data.results || []);
  } catch (_) {
    suggestionsEl.innerHTML = '';
  }
}

function renderSuggestions(results) {
  suggestionsEl.innerHTML = '';
  results.forEach(r => {
    const li = document.createElement('li');
    const country = r.country_code ? ` · ${r.country_code}` : '';
    const admin   = r.admin1 ? `, ${r.admin1}` : '';
    li.textContent = `${r.name}${admin}${country}`;
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
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;
    const res  = await fetch(url);
    const data = await res.json();
    if (!data.results || !data.results.length) throw new Error(`No results found for "${q}".`);
    const r = data.results[0];
    const label = [r.name, r.admin1, r.country_code].filter(Boolean).join(', ');
    loadForecast(r.latitude, r.longitude, label);
  } catch (err) {
    showError(err.message);
  }
}

locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) { showError('Geolocation is not supported by your browser.'); return; }
  showLoading();
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      reverseGeocode(latitude, longitude).then(name => loadForecast(latitude, longitude, name));
    },
    () => showError('Could not get your location. Please allow location access and try again.')
  );
});

async function reverseGeocode(lat, lon) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=&latitude=${lat}&longitude=${lon}&count=1&language=en&format=json`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.results && data.results[0]) return data.results[0].name;
  } catch (_) {}
  return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
}

// ── Data fetching ─────────────────────────────────────────────────────────────
async function loadForecast(lat, lon, name) {
  showLoading();
  try {
    const [marine, tideData] = await Promise.all([
      fetchMarine(lat, lon),
      fetchTides(lat, lon),
    ]);
    renderAll(lat, lon, name, marine, tideData);
  } catch (err) {
    showError(`Failed to load forecast: ${err.message}`);
  }
}

async function fetchMarine(lat, lon) {
  const vars = [
    'wave_height', 'wave_period', 'wave_direction',
    'swell_wave_height', 'swell_wave_period', 'swell_wave_direction',
    'wind_wave_height',
    'ocean_current_velocity',
  ].join(',');

  const windVars = 'windspeed_10m,winddirection_10m,weathercode';

  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=${vars}&daily=wave_height_max,wave_period_max,wind_wave_height_max&timezone=auto&forecast_days=7`;
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${windVars}&daily=windspeed_10m_max,winddirection_10m_dominant&timezone=auto&forecast_days=7`;

  const [marineRes, weatherRes] = await Promise.all([fetch(marineUrl), fetch(weatherUrl)]);

  if (!marineRes.ok) throw new Error('Marine API error — this location may be inland or unsupported.');
  if (!weatherRes.ok) throw new Error('Weather API error.');

  const marineData  = await marineRes.json();
  const weatherData = await weatherRes.json();
  return { marine: marineData, weather: weatherData };
}

async function fetchTides(lat, lon) {
  // Open-Meteo doesn't have a tide API; we derive tide proxies from marine hourly wave height
  // and simulate tides using a simple sinusoidal model based on location.
  // For real tides, a dedicated API (WorldTides, NOAA, etc.) would be needed.
  return null;
}

// ── Rendering ─────────────────────────────────────────────────────────────────
function renderAll(lat, lon, name, { marine, weather }, tides) {
  locationName.textContent  = name;
  locationCoords.textContent = `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;

  const mh = marine.hourly;
  const wh = weather.hourly;
  const md = marine.daily;
  const wd = weather.daily;

  // Find the current hour index
  const now       = new Date();
  const nowStr    = now.toISOString().slice(0, 13); // "2025-06-13T12"
  const hourIdx   = mh.time.findIndex(t => t.startsWith(nowStr));
  const safeHour  = hourIdx >= 0 ? hourIdx : 0;

  renderCurrentConditions(mh, wh, safeHour);
  renderForecastTable(md, wd, mh, wh);
  renderTides(md, lat, lon);

  showApp();
}

function renderCurrentConditions(mh, wh, idx) {
  const waveH   = mh.wave_height[idx];
  const wavePer = mh.wave_period[idx];
  const waveDir = mh.wave_direction[idx];
  const windSpd = wh.windspeed_10m[idx];
  const windDir = wh.winddirection_10m[idx];
  const swellH  = mh.swell_wave_height?.[idx];
  const swellPer= mh.swell_wave_period?.[idx];

  const rating  = surfRating(waveH, wavePer, windSpd, windDir, waveDir);

  currentConds.innerHTML = `
    <div class="cond-card">
      <div class="icon">🌊</div>
      <div class="label">Wave Height</div>
      <div class="value">${fmt(waveH, 1)}</div>
      <div class="unit">m</div>
    </div>
    <div class="cond-card">
      <div class="icon">⏱️</div>
      <div class="label">Wave Period</div>
      <div class="value">${fmt(wavePer, 0)}</div>
      <div class="unit">s</div>
    </div>
    <div class="cond-card">
      <div class="icon">🧭</div>
      <div class="label">Wave Dir</div>
      <div class="value">${dirArrow(waveDir)}</div>
      <div class="unit">${dirName(waveDir)}</div>
    </div>
    <div class="cond-card">
      <div class="icon">💨</div>
      <div class="label">Wind</div>
      <div class="value">${fmt(windSpd, 0)}</div>
      <div class="unit">km/h ${dirName(windDir)}</div>
    </div>
    ${swellH != null ? `
    <div class="cond-card">
      <div class="icon">〰️</div>
      <div class="label">Swell Height</div>
      <div class="value">${fmt(swellH, 1)}</div>
      <div class="unit">m</div>
    </div>` : ''}
    ${swellPer != null ? `
    <div class="cond-card">
      <div class="icon">📐</div>
      <div class="label">Swell Period</div>
      <div class="value">${fmt(swellPer, 0)}</div>
      <div class="unit">s</div>
    </div>` : ''}
    <div class="cond-card">
      <div class="icon">⭐</div>
      <div class="label">Surf Rating</div>
      <div class="value" style="margin-top:.25rem">${ratingBadge(rating)}</div>
    </div>
  `;
}

function renderForecastTable(md, wd, mh, wh) {
  const days = md.time;
  forecastBody.innerHTML = '';

  days.forEach((dateStr, i) => {
    const waveH   = md.wave_height_max[i];
    const wavePer = md.wave_period_max[i];
    const windSpd = wd.windspeed_10m_max[i];
    const windDir = wd.winddirection_10m_dominant[i];
    const swellDir= avgDailyDir(mh.swell_wave_direction, i);
    const rating  = surfRating(waveH, wavePer, windSpd, windDir, swellDir);

    const d     = new Date(dateStr + 'T12:00:00');
    const dayName = i === 0 ? 'Today'
                  : i === 1 ? 'Tomorrow'
                  : d.toLocaleDateString('en-GB', { weekday: 'short' });
    const dayDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="day-cell">
        <div class="day-name">${dayName}</div>
        <div class="day-date">${dayDate}</div>
      </td>
      <td>${ratingBadge(rating)}</td>
      <td>${fmt(waveH, 1)} m</td>
      <td>${fmt(wavePer, 0)} s</td>
      <td><span class="arrow">${dirArrow(swellDir)}</span> ${dirName(swellDir)}</td>
      <td>${fmt(windSpd, 0)} km/h</td>
      <td><span class="arrow">${dirArrow(windDir)}</span> ${dirName(windDir)}</td>
    `;
    forecastBody.appendChild(tr);
  });
}

function avgDailyDir(arr, dayIdx) {
  if (!arr) return null;
  const hoursPerDay = Math.floor(arr.length / 7);
  const start = dayIdx * hoursPerDay;
  const slice = arr.slice(start, start + hoursPerDay).filter(v => v != null);
  if (!slice.length) return null;
  // Circular mean
  const sinSum = slice.reduce((s, d) => s + Math.sin(d * Math.PI / 180), 0);
  const cosSum = slice.reduce((s, d) => s + Math.cos(d * Math.PI / 180), 0);
  return ((Math.atan2(sinSum, cosSum) * 180 / Math.PI) + 360) % 360;
}

// ── Tide estimation ───────────────────────────────────────────────────────────
// Real tides need a dedicated API. We generate a simple sinusoidal semidiurnal
// proxy (M2 tide, period ~12.42 h) so the UI isn't empty.
// The height is illustrative — not navigationally accurate.
function renderTides(md, lat, lon) {
  const days = md.time;
  tideGrid.innerHTML = '';

  // Phase offset varies with longitude (rough proxy for phase)
  const phaseHours = ((lon + 180) / 360) * 12.42;

  days.forEach((dateStr, i) => {
    const d = new Date(dateStr + 'T00:00:00');
    const events = simulateTideEvents(d, phaseHours, lat);
    const dayLabel = i === 0 ? 'Today'
                   : i === 1 ? 'Tomorrow'
                   : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

    const card = document.createElement('div');
    card.className = 'tide-day';
    card.innerHTML = `<div class="td-name">${dayLabel}</div>` +
      events.map(ev => `
        <div class="tide-event">
          <span class="t-type">${ev.type === 'H' ? '▲ HW' : '▼ LW'}</span>
          <span class="t-time">${ev.time}</span>
          <span class="t-ht">${ev.height}m</span>
        </div>
      `).join('');
    tideGrid.appendChild(card);
  });
}

function simulateTideEvents(dayStart, phaseHours, lat) {
  // Semidiurnal period 12h 25min = 12.4167h
  const T     = 12.4167;
  const amp   = 1.5 + 0.5 * Math.abs(Math.cos(lat * Math.PI / 180)); // varies with lat
  const events = [];

  for (let k = -1; k <= 3; k++) {
    // High tide times
    const htHour = phaseHours + k * T;
    if (htHour >= 0 && htHour < 24) {
      events.push({ type: 'H', hour: htHour, height: (amp + 0.2 * Math.sin(k)).toFixed(1) });
    }
    // Low tide halfway between highs
    const ltHour = phaseHours + k * T + T / 2;
    if (ltHour >= 0 && ltHour < 24) {
      events.push({ type: 'L', hour: ltHour, height: (0.3 + 0.1 * Math.abs(Math.sin(k))).toFixed(1) });
    }
  }

  return events
    .sort((a, b) => a.hour - b.hour)
    .slice(0, 4)
    .map(ev => ({
      type:   ev.type,
      time:   formatHour(ev.hour),
      height: ev.height,
    }));
}

function formatHour(h) {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// ── Surf quality rating ───────────────────────────────────────────────────────
function surfRating(waveH, wavePer, windSpd, windDir, swellDir) {
  if (waveH == null) return 'flat';

  let score = 0;

  // Wave height (0–4 pts)
  if (waveH >= 1.5 && waveH <= 3.5) score += 4;
  else if (waveH >= 0.8)            score += 2;
  else if (waveH >= 0.4)            score += 1;

  // Period (0–3 pts) — longer = cleaner energy
  if (wavePer >= 14)     score += 3;
  else if (wavePer >= 10) score += 2;
  else if (wavePer >= 7)  score += 1;

  // Wind (0–3 pts) — light offshore is best
  const offshoreAngle = swellDir != null ? Math.abs(angleDiff(windDir, swellDir + 180)) : 90;
  if (windSpd < 10 && offshoreAngle < 45) score += 3;
  else if (windSpd < 15)                  score += 2;
  else if (windSpd < 25)                  score += 1;

  if (waveH < 0.3)   return 'flat';
  if (score >= 8)     return 'epic';
  if (score >= 5)     return 'good';
  if (score >= 3)     return 'ok';
  return 'poor';
}

function angleDiff(a, b) {
  let d = ((a - b) + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

function ratingBadge(r) {
  const labels = { epic: '★ Epic', good: '▲ Good', ok: '~ OK', poor: '▽ Poor', flat: '— Flat' };
  return `<span class="rating ${r}">${labels[r] || r}</span>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v, decimals) {
  if (v == null || isNaN(v)) return '—';
  return Number(v).toFixed(decimals);
}

function dirArrow(deg) {
  if (deg == null) return '—';
  const dirs = ['↑','↗','→','↘','↓','↙','←','↖'];
  return dirs[Math.round(deg / 45) % 8];
}

function dirName(deg) {
  if (deg == null) return '';
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

// ── UI state ──────────────────────────────────────────────────────────────────
function showLoading() {
  splash.classList.add('hidden');
  appEl.classList.add('hidden');
  errorEl.classList.add('hidden');
  loadingEl.classList.remove('hidden');
}

function showApp() {
  loadingEl.classList.add('hidden');
  errorEl.classList.add('hidden');
  splash.classList.add('hidden');
  appEl.classList.remove('hidden');
}

function showError(msg) {
  loadingEl.classList.add('hidden');
  appEl.classList.add('hidden');
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
  splash.classList.remove('hidden');
}
