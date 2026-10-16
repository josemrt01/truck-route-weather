import { describe, expect, it } from 'vitest'
import { TripPlanField } from '../types/tripPlan'
import { getRequiredFieldErrors } from './tripFormValidation'

describe('getRequiredFieldErrors', () => {
  it('marks every blank field as Required', () => {
    const fieldErrors = getRequiredFieldErrors([
      { field: TripPlanField.ORIGIN, text: '' },
      { field: TripPlanField.DESTINATION, text: '   ' },
      { field: TripPlanField.WEIGHT_LB, text: '' },
    ])

    expect(fieldErrors).toEqual({ origin: 'Required', destination: 'Required', weight_lb: 'Required' })
  })

  it('marks only the blank fields', () => {
    const fieldErrors = getRequiredFieldErrors([
      { field: TripPlanField.ORIGIN, text: 'Dallas, TX' },
      { field: TripPlanField.DESTINATION, text: '' },
    ])

    expect(fieldErrors).toEqual({ destination: 'Required' })
  })

  it('reports nothing when every field is filled', () => {
    const fieldErrors = getRequiredFieldErrors([
      { field: TripPlanField.ORIGIN, text: 'Dallas, TX' },
      { field: TripPlanField.WEIGHT_LB, text: '45000' },
    ])

    expect(fieldErrors).toEqual({})
  })
})
