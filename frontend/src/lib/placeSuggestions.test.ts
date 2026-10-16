import { describe, expect, it } from 'vitest'
import type { Place } from '../types/tripPlan'
import { findPlaceByLabel } from './placeSuggestions'

const dallas: Place = { label: 'Dallas, Texas', lat: 32.7767, lon: -96.797 }
const houston: Place = { label: 'Houston, Texas', lat: 29.7604, lon: -95.3698 }

describe('findPlaceByLabel', () => {
  it('returns the place whose label is exactly the text', () => {
    expect(findPlaceByLabel([dallas, houston], 'Houston, Texas')).toBe(houston)
  })

  it('returns null when no label matches', () => {
    expect(findPlaceByLabel([dallas, houston], 'Austin, Texas')).toBeNull()
  })

  it('does not match part of a label', () => {
    expect(findPlaceByLabel([dallas, houston], 'Dallas')).toBeNull()
  })
})
