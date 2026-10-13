import Map, { NavigationControl } from 'react-map-gl/maplibre'
import '../lib/maplibreWorker'
import 'maplibre-gl/dist/maplibre-gl.css'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const INITIAL_VIEW = { longitude: -98.5, latitude: 39.5, zoom: 3.5 }

export function MapView() {
  return (
    <Map initialViewState={INITIAL_VIEW} mapStyle={MAP_STYLE} style={{ width: '100%', height: '100%' }}>
      <NavigationControl position="top-right" />
    </Map>
  )
}
