import type { Feature, LineString } from 'geojson'
import type { LonLat } from '../types/tripPlan'

export function buildRouteFeature(geometry: LonLat[]): Feature<LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: geometry },
  }
}

// Returns the [south-west, north-east] corners of the box that contains every route point.
export function getRouteBounds(geometry: LonLat[]): [LonLat, LonLat] {
  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity

  for (const [lon, lat] of geometry) {
    minLon = Math.min(minLon, lon)
    minLat = Math.min(minLat, lat)
    maxLon = Math.max(maxLon, lon)
    maxLat = Math.max(maxLat, lat)
  }

  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ]
}
