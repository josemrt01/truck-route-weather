import { describe, expect, it } from 'vitest'
import { buildTripPlanRequest, type TripFormValues } from './tripPlanRequest'

// Values that pass validation, typed without picking a suggestion; tests change one at a time.
const typedValues: TripFormValues = {
  origin: '  Dallas, TX ',
  originPoint: null,
  destination: 'Houston, TX',
  destinationPoint: null,
  departureLocal: '2026-10-13T08:00',
  spacingMi: 25,
  weightLb: 45_000,
}

describe('buildTripPlanRequest', () => {
  it('sends trimmed text and no points when nothing was picked', () => {
    expect(buildTripPlanRequest(typedValues)).toEqual({
      origin: 'Dallas, TX',
      destination: 'Houston, TX',
      departure: '2026-10-13T13:00:00.000Z',
      spacing_mi: 25,
      weight_lb: 45_000,
    })
  })

  it('sends the point of a picked place next to its text', () => {
    const request = buildTripPlanRequest({ ...typedValues, originPoint: [-96.797, 32.7767] })

    expect(request.origin_point).toEqual([-96.797, 32.7767])
    expect('destination_point' in request).toBe(false)
  })
})
