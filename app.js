'use strict';

// Time slots shown in the forecast grid
const SLOTS = [
  { label: 'AM',   hour: 9  },
  { label: 'PM',   hour: 14 },
  { label: 'EVE',  hour: 18 },
];

// ── DOM refs ─────────────────────────────────────────────────────────────────
const locationInput = document.getElementById('locationInput');
const searchBtn     = document.getElementById('searchBtn');
const locateBtn     = document.getElementById('locateBtn');
const splash        = document.getElementById('splash');
const appEl         = document.getElementById('app');
const errorEl       = document.getElementById('error');
const loadingEl     = document.getElementById('loading');
const locationName  = document.getElementById('locationName');
const locationCoords= document.getElementById('locationCoords');
const nowBanner     = document.getElementById('nowBanner');
const suggestionsEl = document.getElementById('suggestions');

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

  const mh = marine.hourly;
  const wh = weather.hourly;
  const now = new Date();

  const todayStr = now.toISOString().slice(0, 10);
  const nowHStr  = now.toISOString().slice(0, 13);
  const baseIdx  = Math.max(0, mh.time.findIndex(t => t.startsWith(todayStr)));
  const nowIdx   = mh.time.findIndex(t => t.startsWith(nowHStr));
  const safeNow  = nowIdx >= 0 ? nowIdx : baseIdx + now.getHours();

  renderNowBanner(mh, wh, safeNow);
  renderForecastGrid(mh, wh, baseIdx);
  renderTides(lat, lon);
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

  nowBanner.innerHTML = `
    <div class="now-stat">
      <span class="ns-label">Now</span>
      <span class="ns-value"><span class="stars ${starsClass(stars)}">${renderStars(stars)}</span></span>
    </div>
    <div class="now-stat">
      <span class="ns-label">Waves</span>
      <span class="ns-value ${waveClass(waveH)}">${fmt(waveH,1)}<small>m</small></span>
    </div>
    <div class="now-stat">
      <span class="ns-label">Period</span>
      <span class="ns-value">${fmt(wavePer,0)}<small>s</small></span>
    </div>
    <div class="now-stat">
      <span class="ns-label">Swell</span>
      <span class="ns-value">${fmt(swellH,1)}<small>m</small></span>
    </div>
    <div class="now-stat">
      <span class="ns-label">Wind</span>
      <span class="ns-value ${windClass(windSpd,windDir,waveDir)}">${dirArrow(windDir)} ${fmt(windSpd,0)}<small>km/h</small></span>
    </div>
    <div class="now-stat">
      <span class="ns-label">Direction</span>
      <span class="ns-value">${dirArrow(waveDir)} ${dirName(waveDir)}</span>
    </div>
  `;
}

// ── MSW-style forecast grid ───────────────────────────────────────────────────
function renderForecastGrid(mh, wh, baseIdx) {
  const now = new Date();
  const days = [];

  for (let d = 0; d < 7; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const slots = SLOTS.map(slot => {
      const idx     = baseIdx + d * 24 + slot.hour;
      const waveH   = safeVal(mh.wave_height, idx);
      const wavePer = safeVal(mh.wave_period, idx);
      const waveDir = safeVal(mh.wave_direction, idx);
      const windSpd = safeVal(wh.windspeed_10m, idx);
      const windDir = safeVal(wh.winddirection_10m, idx);
      return { label: slot.label, waveH, wavePer, waveDir, windSpd, windDir,
               stars: surfStars(waveH, wavePer, windSpd, windDir, waveDir) };
    });
    days.push({
      label:   d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : date.toLocaleDateString('en-GB', { weekday: 'short' }),
      dateStr: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      slots,
    });
  }

  const S = SLOTS.length;

  let t = '<table class="msw-table" cellspacing="0">';

  // ── Row 1: Day headers ──
  t += '<tr class="tr-days"><th class="th-label"></th>';
  days.forEach(day => {
    t += `<th class="th-day" colspan="${S}"><div class="dh-name">${day.label}</div><div class="dh-date">${day.dateStr}</div></th>`;
  });
  t += '</tr>';

  // ── Row 2: Slot sub-headers ──
  t += '<tr class="tr-slots"><th class="th-label"></th>';
  days.forEach(day => {
    day.slots.forEach((s, i) => {
      t += `<th class="th-slot${i === 0 ? ' ds' : ''}">${s.label}</th>`;
    });
  });
  t += '</tr>';

  // ── Row 3: Stars ──
  t += '<tr class="tr-data">';
  t += '<td class="td-label">Rating</td>';
  days.forEach(day => {
    day.slots.forEach((s, i) => {
      const rc = s.stars >= 4 ? ` r${s.stars}` : '';
      t += `<td class="td-slot td-rating${i===0?' ds':''}${rc}"><span class="stars ${starsClass(s.stars)}">${renderStars(s.stars)}</span></td>`;
    });
  });
  t += '</tr>';

  // ── Row 4: Wave height ──
  t += '<tr class="tr-data tr-alt">';
  t += '<td class="td-label">Waves</td>';
  days.forEach(day => {
    day.slots.forEach((s, i) => {
      t += `<td class="td-slot td-wave${i===0?' ds':''}"><span class="${waveClass(s.waveH)}">${fmt(s.waveH,1)}<small>m</small></span></td>`;
    });
  });
  t += '</tr>';

  // ── Row 5: Period ──
  t += '<tr class="tr-data">';
  t += '<td class="td-label">Period</td>';
  days.forEach(day => {
    day.slots.forEach((s, i) => {
      t += `<td class="td-slot${i===0?' ds':''}">${fmt(s.wavePer,0)}<small>s</small></td>`;
    });
  });
  t += '</tr>';

  // ── Row 6: Wind ──
  t += '<tr class="tr-data tr-alt">';
  t += '<td class="td-label">Wind</td>';
  days.forEach(day => {
    day.slots.forEach((s, i) => {
      const wc = windClass(s.windSpd, s.windDir, s.waveDir);
      t += `<td class="td-slot td-wind${i===0?' ds':''}">
        <span class="wind-arrow ${wc}">${dirArrow(s.windDir)}</span>
        <span class="${wc}">${fmt(s.windSpd,0)}</span>
      </td>`;
    });
  });
  t += '</tr>';

  // ── Row 7: Swell direction ──
  t += '<tr class="tr-data">';
  t += '<td class="td-label">Swell</td>';
  days.forEach(day => {
    day.slots.forEach((s, i) => {
      t += `<td class="td-slot${i===0?' ds':''}">${dirArrow(s.waveDir)} <small>${dirName(s.waveDir)}</small></td>`;
    });
  });
  t += '</tr>';

  t += '</table>';
  document.getElementById('forecastGrid').innerHTML = t;
}

// ── Tide section ──────────────────────────────────────────────────────────────
// Semidiurnal (M2) tide estimate — illustrative only, not navigational.
function renderTides(lat, lon) {
  const tideRow = document.getElementById('tideRow');
  // Phase: use longitude to roughly offset local HW time
  const phaseH = ((lon + 180) / 360) * 12.42;
  const amp    = 1.5 + 0.5 * Math.abs(Math.cos(lat * Math.PI / 180));
  const now    = new Date();

  tideRow.innerHTML = '';
  for (let d = 0; d < 7; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const dayLabel = d === 0 ? 'Today'
                   : d === 1 ? 'Tomorrow'
                   : date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const events = tideEvents(phaseH, amp, d);
    const card   = document.createElement('div');
    card.className = 'tide-card';
    card.innerHTML = `<div class="tc-day">${dayLabel}</div>
      ${tideSVG(phaseH, amp, d)}
      ${events.map(e => `
        <div class="tide-event">
          <span class="${e.type === 'H' ? 't-type-hw' : 't-type-lw'}">${e.type === 'H' ? '▲ HW' : '▼ LW'}</span>
          <span class="t-time">${e.time}</span>
          <span class="t-ht">${e.height}m</span>
        </div>`).join('')}`;
    tideRow.appendChild(card);
  }
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

function tideSVG(phaseH, amp, dayOff) {
  const W = 94, H = 34, P = 3, T = 12.4167;
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const hr = (i / 48) * 24;
    const th = amp * Math.cos(2 * Math.PI * (hr + dayOff * 24 - phaseH) / T);
    pts.push(`${(P + (i/48) * (W-2*P)).toFixed(1)},${(P + (1 - (th+amp)/(2*amp)) * (H-2*P)).toFixed(1)}`);
  }
  const path = 'M ' + pts.join(' L ');
  const dots = tideEvents(phaseH, amp, dayOff).map(e => {
    const th = amp * Math.cos(2 * Math.PI * (e.hour + dayOff * 24 - phaseH) / T);
    const cx = (P + (e.hour/24) * (W-2*P)).toFixed(1);
    const cy = (P + (1 - (th+amp)/(2*amp)) * (H-2*P)).toFixed(1);
    return `<circle cx="${cx}" cy="${cy}" r="2.5" fill="${e.type==='H'?'#60a5fa':'#475569'}"/>`;
  }).join('');
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;margin:.3rem 0 .35rem">
    <path d="${path}" fill="none" stroke="#1e3a5f" stroke-width="3"/>
    <path d="${path}" fill="none" stroke="#38bdf8" stroke-width="1.5" opacity=".75"/>
    ${dots}
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

  // Wave height
  if      (waveH >= 3.0) score += 6;
  else if (waveH >= 2.0) score += 5;
  else if (waveH >= 1.5) score += 4;
  else if (waveH >= 1.0) score += 3;
  else if (waveH >= 0.6) score += 1;

  // Period (longer = cleaner energy)
  if      (wavePer >= 15) score += 4;
  else if (wavePer >= 12) score += 3;
  else if (wavePer >= 9)  score += 2;
  else if (wavePer >= 6)  score += 1;

  // Wind (offshore + light = best)
  const offshore = windDir != null && swellDir != null &&
    angleDiff(windDir, (swellDir + 180) % 360) < 50;
  if (windSpd != null) {
    if      (windSpd < 10 && offshore)  score += 5;
    else if (windSpd < 15 && offshore)  score += 4;
    else if (windSpd < 10)              score += 3;
    else if (windSpd < 20)              score += 2;
    else if (windSpd < 30)              score += 1;
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
