import type { Feature, FeatureCollection, LineString, Point } from 'geojson'
import type { RiskLevel } from '../types/risk'
import type { Checkpoint, LonLat, RoutePlan } from '../types/tripPlan'

// Properties on each route stretch feature; index N is the stretch from checkpoint N to checkpoint N+1,
// and level is the risk level that colors it.
export type RouteSegmentProperties = { index: number; level: RiskLevel }

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

    // Same rule as the backend summary: a stretch is as risky as its worse end.
    // Math.max returns a plain number, so tell TypeScript it is still a RiskLevel (0-4).
    const level = Math.max(start.level, end.level) as RiskLevel

    features.push({
      type: 'Feature',
      properties: { index, level },
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

// The end of a stretch that gave it its color; on a tie, the start.
export function getWorseCheckpoint(start: Checkpoint, end: Checkpoint): Checkpoint {
  if (end.level > start.level) {
    return end
  }

  return start
}

// Properties on each unselected route line; id is "A", "B" or "C".
export type OtherRouteProperties = { id: string }

// One line per route except the selected one; drawn gray under the selected route.
export function buildOtherRouteLines(
  routes: RoutePlan[],
  selectedRouteId: string,
): FeatureCollection<LineString, OtherRouteProperties> {
  const features: Feature<LineString, OtherRouteProperties>[] = []

  for (const route of routes) {
    if (route.id === selectedRouteId) {
      continue
    }

    features.push({
      type: 'Feature',
      properties: { id: route.id },
      geometry: { type: 'LineString', coordinates: route.geometry },
    })
  }

  return { type: 'FeatureCollection', features }
}
