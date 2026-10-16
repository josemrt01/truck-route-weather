import type { AxiosResponse } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Place } from '../types/tripPlan'
import { apiClient } from './apiClient'
import { searchPlaces } from './placeSearchApi'

const dallas: Place = { label: 'Dallas, Texas', lat: 32.7767, lon: -96.797 }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('searchPlaces', () => {
  it('asks the backend for the typed text and returns its places', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [dallas] } as AxiosResponse)
    const signal = new AbortController().signal

    const places = await searchPlaces('Dal', signal)

    expect(places).toEqual([dallas])
    expect(getSpy).toHaveBeenCalledWith('/api/places', { params: { q: 'Dal' }, signal })
  })
})
