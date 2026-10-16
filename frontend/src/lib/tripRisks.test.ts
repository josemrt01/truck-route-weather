import { describe, expect, it } from 'vitest'
import type { OpenMeteoHourly } from '../types/openMeteo'
import { RiskCause, RiskLevel } from '../types/risk'
import type { PlannedRoute, PlannedTrip, TripRisks } from '../types/tripPlan'
import { buildTripRisksRequest, getCheckpointPoints, getForecastWindow, mergeTripRisks } from './tripRisks'

// Two routes leaving at 13:10; A arrives at 15:20, B at 16:40.
const routeA: PlannedRoute = {
  id: 'A',
  geometry: [
    [-96.8, 32.8],
    [-95.4, 29.8],
  ],
  distance_mi: 240,
  duration_s: 7800,
  arrival_utc: '2026-10-13T15:20:00Z',
  checkpoints: [
    { mile: 0, lat: 32.8, lon: -96.8, eta_utc: '2026-10-13T13:10:00Z', previous_point_index: 0 },
    { mile: 240, lat: 29.8, lon: -95.4, eta_utc: '2026-10-13T15:20:00Z', previous_point_index: 0 },
  ],
}
const routeB: PlannedRoute = {
  ...routeA,
  id: 'B',
  duration_s: 12600,
  arrival_utc: '2026-10-13T16:40:00Z',
  checkpoints: [
    { mile: 0, lat: 32.8, lon: -96.8, eta_utc: '2026-10-13T13:10:00Z', previous_point_index: 0 },
    { mile: 260, lat: 29.7, lon: -95.3, eta_utc: '2026-10-13T16:40:00Z', previous_point_index: 0 },
  ],
}

// A forecast with only its first hour mattering here; tests tell forecasts apart by that hour.
function buildForecast(firstHour: string): OpenMeteoHourly {
  return { time: [firstHour], wind_gusts_10m: [0], wind_speed_10m: [0], rain: [0], showers: [0], snowfall: [0] }
}

describe('getCheckpointPoints', () => {
  it('lists every checkpoint as [lon, lat], route by route', () => {
    expect(getCheckpointPoints([routeA, routeB])).toEqual([
      [-96.8, 32.8],
      [-95.4, 29.8],
      [-96.8, 32.8],
      [-95.3, 29.7],
    ])
  })
})

describe('getForecastWindow', () => {
  it('covers the departure hour to the hour after the latest arrival', () => {
    expect(getForecastWindow([routeA, routeB])).toEqual({
      firstHourUtc: new Date('2026-10-13T13:00:00Z'),
      // B arrives last, at 16:40.
      lastHourUtc: new Date('2026-10-13T17:00:00Z'),
    })
  })
})

describe('buildTripRisksRequest', () => {
  it('gives each checkpoint the forecast at its position in the list', () => {
    const forecasts = ['A0', 'A1', 'B0', 'B1'].map(buildForecast)

    const request = buildTripRisksRequest([routeA, routeB], forecasts, 45_000)

    expect(request.weight_lb).toBe(45_000)
    expect(request.routes.map((route) => [route.id, route.duration_s])).toEqual([
      ['A', 7800],
      ['B', 12600],
    ])
    expect(request.routes[1].checkpoints[1]).toEqual({
      mile: 260,
      eta_utc: '2026-10-13T16:40:00Z',
      forecast: buildForecast('B1'),
    })
  })
})

describe('mergeTripRisks', () => {
  const plannedTrip: PlannedTrip = {
    origin: { label: 'Dallas, Texas', lat: 32.8, lon: -96.8 },
    destination: { label: 'Houston, Texas', lat: 29.8, lon: -95.4 },
    departure_utc: '2026-10-13T13:10:00Z',
    notes: ['Only 1 route found between these places.'],
    routes: [routeA],
    corridor_points: [[-96.875, 32.875]],
    corridor_cell_size_deg: 0.25,
  }
  const calmCheckpoint = {
    forecast_hour_utc: '2026-10-13T13:00:00Z',
    wind_gust_mph: 10,
    wind_speed_mph: 5,
    rain_in_hr: 0,
    snow_in_hr: 0,
    level: RiskLevel.LOW,
    cause: RiskCause.NONE,
  }
  const tripRisks: TripRisks = {
    recommended_route_id: 'A',
    reason: 'The only route found.',
    warning: null,
    routes: [
      {
        id: 'A',
        rank: 1,
        miles_by_level: { low: 240, moderate: 0, high: 0, severe: 0, no_travel: 0 },
        avg_risk: 0,
        worst_level: RiskLevel.LOW,
        checkpoints: [calmCheckpoint, { ...calmCheckpoint, forecast_hour_utc: '2026-10-13T15:00:00Z' }],
      },
    ],
  }

  it('adds the recommendation and each route risk to the planned trip', () => {
    const tripPlan = mergeTripRisks(plannedTrip, tripRisks)

    expect(tripPlan.recommended_route_id).toBe('A')
    expect(tripPlan.notes).toEqual(['Only 1 route found between these places.'])
    expect(tripPlan.routes[0].rank).toBe(1)
    expect(tripPlan.routes[0].geometry).toEqual(routeA.geometry)
  })

  it('joins each checkpoint position with its weather and risk', () => {
    const checkpoint = mergeTripRisks(plannedTrip, tripRisks).routes[0].checkpoints[1]

    expect(checkpoint).toEqual({ ...routeA.checkpoints[1], ...calmCheckpoint, forecast_hour_utc: '2026-10-13T15:00:00Z' })
  })
})
