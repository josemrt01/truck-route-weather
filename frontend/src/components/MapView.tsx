import Map, { NavigationControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { INITIAL_MAP_VIEW, MAP_STYLE_URL } from '../config/mapConfig'
// Runs once to tell MapLibre where its worker file is; must load before any map is created.
import '../lib/maplibreWorker'

export function MapView() {
  return (
    <Map initialViewState={INITIAL_MAP_VIEW} mapStyle={MAP_STYLE_URL} style={{ width: '100%', height: '100%' }}>
      {/* Zoom +/- buttons and compass. */}
      <NavigationControl position="top-right" />
    </Map>
  )
}
