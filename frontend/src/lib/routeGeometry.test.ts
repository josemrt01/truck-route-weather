import { describe, expect, it } from 'vitest'
import type { Checkpoint, LonLat } from '../types/tripPlan'
import { buildCheckpointPoints, buildRouteSegments } from './routeGeometry'

// Builds a checkpoint for the tests; only position and previous_point_index matter here.
function makeCheckpoint(lon: number, lat: number, previousPointIndex: number): Checkpoint {
  return { mile: 0, lon, lat, eta_utc: '2026-10-13T13:00:00Z', previous_point_index: previousPointIndex }
}

describe('buildRouteSegments', () => {
  // Route points: 0 (0,0), 1 (10,0), 2 (20,0), 3 (30,0).
  const straightRoute: LonLat[] = [
    [0, 0],
    [10, 0],
    [20, 0],
    [30, 0],
  ]

  it('makes one stretch per pair of neighboring checkpoints', () => {
    const checkpoints = [makeCheckpoint(0, 0, 0), makeCheckpoint(15, 0, 1), makeCheckpoint(30, 0, 2)]

    const segments = buildRouteSegments(straightRoute, checkpoints)

    expect(segments.features.map((feature) => feature.properties.index)).toEqual([0, 1])
  })

  it('includes the route points between two checkpoints', () => {
    // The start lies after point 0 (between points 0 and 1), the end after point 2 (between points 2 and 3).
    const checkpoints = [makeCheckpoint(5, 0, 0), makeCheckpoint(25, 0, 2)]

    const segments = buildRouteSegments(straightRoute, checkpoints)

    expect(segments.features[0].geometry.coordinates).toEqual([
      [5, 0],
      [10, 0],
      [20, 0],
      [25, 0],
    ])
  })

  it('is a straight piece when both checkpoints lie between the same two route points', () => {
    const checkpoints = [makeCheckpoint(12, 0, 1), makeCheckpoint(18, 0, 1)]

    const segments = buildRouteSegments(straightRoute, checkpoints)

    expect(segments.features[0].geometry.coordinates).toEqual([
      [12, 0],
      [18, 0],
    ])
  })
})

describe('buildCheckpointPoints', () => {
  it('makes one [lon, lat] point per checkpoint', () => {
    const points = buildCheckpointPoints([makeCheckpoint(-96.8, 32.8, 0), makeCheckpoint(-95.4, 29.8, 3)])

    expect(points.features.map((feature) => feature.geometry.coordinates)).toEqual([
      [-96.8, 32.8],
      [-95.4, 29.8],
    ])
  })
})
