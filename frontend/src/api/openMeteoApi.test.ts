import axios, { type AxiosResponse } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OpenMeteoHourly } from '../types/openMeteo'
import type { LonLat } from '../types/tripPlan'
import { getHourlyForecasts } from './openMeteoApi'

const hourly: OpenMeteoHourly = {
  time: ['2026-10-13T13:00'],
  wind_gusts_10m: [10],
  wind_speed_10m: [5],
  rain: [0],
  showers: [0],
  snowfall: [0],
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getHourlyForecasts', () => {
  it('asks Open-Meteo for the points and hours in GMT, mph and inches', async () => {
    const getSpy = vi.spyOn(axios, 'get').mockResolvedValue({ data: [{ hourly }, { hourly }] } as AxiosResponse)
    const points: LonLat[] = [
      [-96.797, 32.7767],
      [-95.3698, 29.7604],
    ]

    const forecasts = await getHourlyForecasts(
      points,
      new Date('2026-10-13T13:00:00Z'),
      new Date('2026-10-13T16:00:00Z'),
    )

    expect(forecasts).toEqual([hourly, hourly])
    const params = getSpy.mock.calls[0][1]?.params
    expect(params).toMatchObject({
      latitude: '32.7767,29.7604',
      longitude: '-96.797,-95.3698',
      wind_speed_unit: 'mph',
      precipitation_unit: 'inch',
      timezone: 'GMT',
      start_hour: '2026-10-13T13:00',
      end_hour: '2026-10-13T16:00',
    })
  })

  it('reads the single object Open-Meteo returns for one point', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: { hourly } } as AxiosResponse)

    const forecasts = await getHourlyForecasts([[-96.797, 32.7767]], new Date(), new Date())

    expect(forecasts).toEqual([hourly])
  })

  it('splits more than 100 points into batches', async () => {
    const getSpy = vi
      .spyOn(axios, 'get')
      .mockResolvedValueOnce({ data: Array(100).fill({ hourly }) } as AxiosResponse)
      .mockResolvedValueOnce({ data: Array(50).fill({ hourly }) } as AxiosResponse)
    const points: LonLat[] = Array(150).fill([-96.797, 32.7767])

    const forecasts = await getHourlyForecasts(points, new Date(), new Date())

    expect(getSpy).toHaveBeenCalledTimes(2)
    expect(forecasts).toHaveLength(150)
  })
})
