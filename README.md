# Truck Route Weather

A web app that helps a truck driver pick the safest of three routes. It checks the weather forecast for the
moment the truck will reach each point of the trip, scores the risk with the load weight in mind, and
recommends a route with a one-line reason.

**Live demo:** https://truck-route-weather.onrender.com

## Features

- **Three routes** between two US places, with the recommended one first and the reason it wins
  (e.g. "Fewest Severe miles: 0.0 vs 40.0 on the next best route.").
- **Weather at the truck's ETA**: checkpoints every 10, 25 or 50 miles, each with the forecast for the hour
  the truck gets there.
- **Risk per segment**: the route is colored by risk level; click a segment to see when the truck passes,
  the wind, rain and snow there, and what caused the risk.
- **Weather heatmap over the next 48 hours**: a slider (with play) shows the risk around the routes hour by
  hour, with the truck moving along the selected route and a band marking the trip's hours.
- **Place autocomplete** for origin and destination, and a departure time up to 7 days ahead.
- **Responsive**: side panel on desktop and landscape tablets; on phones and portrait tablets the map
  fills the screen and the panel becomes a draggable bottom drawer.

## How it works

```
Origin, destination, departure, weight, checkpoint spacing
  │
  ├─ 1. GraphHopper: up to 3 alternative routes (geometry + driving time per stretch)
  ├─ 2. Checkpoints every N miles along each route, each with its ETA
  ├─ 3. Open-Meteo: hourly forecast at each checkpoint, for the full hour nearest its ETA
  ├─ 4. Risk level per checkpoint (wind gusts, rain, snow, load weight)
  ├─ 5. Miles at each level, average risk and worst level per route
  ├─ 6. Ranking and the reason the first route wins
  └─ 7. Heatmap (separate request): a grid around the routes, risk for each of the next 49 hours
```

The routes come back first; the heatmap is requested afterwards, so the routes never wait for it.

### Risk levels

Each checkpoint takes the worst level among wind, rain and snow.

| Level | Wind gusts (mph) | Rain (in/hr) | Snow (in/hr) |
|---|---|---|---|
| Low | < 25 | < 0.10 | < 0.5 |
| Moderate | 25 – 35 | 0.10 – 0.25 | 0.5 – 1.0 |
| High | 35 – 45 | 0.25 – 0.50 | 1.0 – 2.0 |
| Severe | 45 – 55 | 0.50 – 1.00 | 2.0 – 3.0 |
| No Travel | ≥ 55 | > 1.00 | > 3.0 |

Load rules (heavier trucks are more exposed to wind):

- Gusts of 45–55 mph and a load over 30,000 lb → **No Travel**.
- Gusts of 35–45 mph and a load over 40,000 lb → **Severe**.

### Recommendation

Routes are ranked by these values, lowest first; the first one that differs decides:

1. No Travel miles
2. Severe miles
3. High miles
4. Average risk (mileage-weighted, 0 = all Low, 4 = all No Travel)
5. Driving time

If even the best route crosses No Travel conditions, the app warns the driver to consider delaying departure.

## Tech stack

| Part | Choice |
|---|---|
| Backend | Python, Django 5.2, Django REST Framework, Gunicorn, WhiteNoise (no database) |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui on Base UI |
| Map | MapLibre GL via `react-map-gl`, OpenFreeMap "liberty" style (OpenStreetMap data, no key) |
| Routing and place search | GraphHopper Directions and Geocoding APIs (free plan) |
| Weather | Open-Meteo hourly forecast (no key) |
| Tests | pytest (backend), Vitest (frontend) |
| Hosting | Render, one web service: Django serves `/api/*` and the built React app |

## Project structure

```
backend/
  config/            Django settings and URLs
  trips/
    clients/         The only code that calls outside APIs (GraphHopper, Open-Meteo)
    logic/           Pure functions: checkpoints, risk, ranking, heatmap grid (unit tested without network)
    services/        Put clients and logic together for each endpoint
    views.py         API endpoints
    tests/
frontend/
  src/
    api/             Calls to the backend
    components/      React components (map, panel, drawer, forecast slider, route cards)
    lib/             Plain functions and hooks (unit tested)
    config/          Map, layout and style settings
    types/           Shared types and named constants
```

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Health check (used by Render) |
| `GET` | `/api/places?q=<text>` | Up to 5 US places matching the text |
| `POST` | `/api/trip-plans` | Routes, checkpoints with weather and risk, ranking and reason |
| `POST` | `/api/heatmap` | Risk level at each grid point for the next 49 hours |

## Run it locally

Requirements: Python 3.14, Node 22, and a free [GraphHopper API key](https://www.graphhopper.com/).

Create a `.env` file in the repository root:

```
GRAPHHOPPER_API_KEY=your-key
```

Backend (port 8000):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
python manage.py runserver
```

Frontend (port 5173; forwards `/api` to the backend):

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

### Tests

```bash
cd backend && pytest
cd frontend && npm test
```

## Deployment

`render.yaml` describes the Render service. `build.sh` builds the React app, pre-compresses its files for
WhiteNoise and installs the Python packages; Gunicorn then serves everything from one service.
Set `GRAPHHOPPER_API_KEY` in the Render dashboard; `DJANGO_SECRET_KEY` is generated by Render.