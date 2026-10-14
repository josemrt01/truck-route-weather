import { describe, expect, it } from 'vitest'
import type { LonLat } from '../types/tripPlan'
import { buildRouteFeature, getRouteBounds } from './routeGeometry'

// A route that zigzags, so its corners come from different points.
const ZIGZAG_ROUTE: LonLat[] = [
  [-96.8, 32.8],
  [-95.0, 31.0],
  [-97.5, 30.0],
  [-95.4, 29.8],
]

describe('getRouteBounds', () => {
  it('returns the south-west and north-east corners around every point', () => {
    expect(getRouteBounds(ZIGZAG_ROUTE)).toEqual([
      [-97.5, 29.8],
      [-95.0, 32.8],
    ])
  })
})

describe('buildRouteFeature', () => {
  it('wraps the points in a GeoJSON LineString', () => {
    expect(buildRouteFeature(ZIGZAG_ROUTE)).toEqual({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: ZIGZAG_ROUTE },
    })
  })
})
