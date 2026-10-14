import type { Feature, FeatureCollection, LineString, Point } from 'geojson'
import type { Checkpoint, LonLat } from '../types/tripPlan'

// Properties on each route stretch feature; index N is the stretch from checkpoint N to checkpoint N+1.
export type RouteSegmentProperties = { index: number }

// Cuts the route line into stretches that run from one checkpoint to the next.
export function buildRouteSegments(
  geometry: LonLat[],
  checkpoints: Checkpoint[],
): FeatureCollection<LineString, RouteSegmentProperties> {
  const features: Feature<LineString, RouteSegmentProperties>[] = []

  for (let index = 0; index < checkpoints.length - 1; index++) {
    const start = checkpoints[index]
    const end = checkpoints[index + 1]

    // The route points strictly between the two checkpoints: the ones after the start's previous point,
    // up to and including the end's previous point.
    const pointsBetween = geometry.slice(start.previous_point_index + 1, end.previous_point_index + 1)

    features.push({
      type: 'Feature',
      properties: { index },
      geometry: { type: 'LineString', coordinates: [[start.lon, start.lat], ...pointsBetween, [end.lon, end.lat]] },
    })
  }

  return { type: 'FeatureCollection', features }
}

export function buildCheckpointPoints(checkpoints: Checkpoint[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: checkpoints.map((checkpoint) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [checkpoint.lon, checkpoint.lat] },
    })),
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
