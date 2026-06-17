# Magic Lie Weed 🏄

Built fir a bit of fun. A surf forecast progressive web app for North Devon and beyond, built with plain HTML/CSS/JS and deployed on GitHub Pages.

**Live app:** https://robconway.github.io/surf-forecast/

---

## Features

- **7-day surf forecast** — wave height, swell period & direction, wind speed & direction
- **MSW-style grid** — DAWN / AM / NOON / PM / DUSK time slots with star ratings
- **Secondary swell** — pulled from the MeteoFrance wave model
- **Now banner** — current conditions at a glance with face-height range
- **Live buoy data** — Bideford Bay (CCO station 97) updated every 30 min via GitHub Actions, shown in the footer when viewing North Devon spots
- **Per-spot scoring** — each spot has a facing direction, offshore wind range, exposure factor, tide quirks, and a closeout threshold; scoring adjusts accordingly
- **Tide curve** — SVG tide chart per slot, generated from harmonic tidal data
- **Wind model switcher** — Open-Meteo Best Match, GFS, or ECMWF
- **Location memory** — remembers your last location and wind model across sessions
- **Nearby spots strip** — suggests closest known breaks when you search
- **Star rating feedback** — rate how the surf actually was; ratings feed a personal bias adjustment
- **Crew codes** — share a crew code to pool feedback ratings with friends
- **PWA** — installable on iOS and Android, works offline for cached forecasts

---

## Spot database

Covers North Devon (Croyde, Saunton, Putsborough, Woolacombe, Combesgate, Lynmouth, Westward Ho!, Spekes Mill, Grunta Beach, Downend Point), plus Cornwall, Ireland, France, Spain, Portugal, Morocco, Hawaii, USA, Indonesia, and Australia.

Each North Devon spot includes:
- `facing` — optimal swell direction
- `offshore` — wind direction range that is offshore
- `closesOut` — wave height (m) above which the spot closes out and scoring drops to zero
- `exposure` — attenuation factor for sheltered spots (Saunton 0.55, Putsborough 0.75)
- `quirks` — tide bonuses/penalties and wind shelter adjustments
- `ability` — surfer level
- `reliability` — how consistent the break is (1–5)

---

## Data sources

| Source | What it provides |
|--------|-----------------|
| [Open-Meteo Marine API](https://open-meteo.com/en/docs/marine-weather-api) | Wave height, swell height/period/direction |
| [Open-Meteo Weather API](https://open-meteo.com/en/docs) | Wind speed & direction (Best Match / GFS / ECMWF) |
| [MeteoFrance via Open-Meteo](https://open-meteo.com) | Secondary swell train |
| [CCO Bideford Bay buoy](https://coastalmonitoring.org) | Real-time significant wave height, peak period & direction |

---

## Architecture

- No framework, no build step — a single `app.js`, `style.css`, `index.html`
- GitHub Pages serves the static files directly from `main`
- A GitHub Actions workflow (`.github/workflows/update-buoy.yml`) fetches CCO buoy data every 30 minutes and commits `buoy.json` to the repo
- Cache-busting via `?v=N` query strings on CSS/JS assets

---

## Local development

```bash
# Any static file server works
npx serve .
# or
python3 -m http.server 8080
```

Open `http://localhost:8080` in your browser.

---

## Contributing

Spot data additions and corrections are welcome. Each entry in the `SURF_SPOTS` array in `app.js` accepts: `name`, `lat`, `lon`, `facing`, `offshore`, `closesOut`, `exposure`, `ability`, `reliability`, `notes`, and `quirks`.
