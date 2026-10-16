import { describe, expect, it } from 'vitest'
import { getMissingPlaceErrors } from './tripFormValidation'

describe('getMissingPlaceErrors', () => {
  it('reports both places when both are blank', () => {
    expect(getMissingPlaceErrors('', '   ')).toEqual({
      origin: 'Enter an origin.',
      destination: 'Enter a destination.',
    })
  })

  it('reports only the blank place', () => {
    expect(getMissingPlaceErrors('Dallas, TX', '')).toEqual({ destination: 'Enter a destination.' })
  })

  it('reports nothing when both places are filled', () => {
    expect(getMissingPlaceErrors('Dallas, TX', 'Houston, TX')).toEqual({})
  })
})
