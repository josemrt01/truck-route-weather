import { setWorkerUrl } from 'maplibre-gl'
// URL of MapLibre's background worker file, resolved by Vite in dev and build; used by setWorkerUrl below.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

// Tell MapLibre where the worker is, instead of letting it guess (its guess breaks under Vite).
setWorkerUrl(workerUrl)
