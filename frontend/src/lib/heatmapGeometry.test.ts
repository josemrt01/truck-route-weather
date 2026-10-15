import { describe, expect, it } from 'vitest'
import { RiskLevel } from '../types/risk'
import type { Heatmap } from '../types/heatmap'
import { buildHeatmapPoints, getHeatmapColorExpression, getHeatmapRadiusAtZoom0 } from './heatmapGeometry'

// Two points with three hours each; only levels and positions matter here.
const heatmap: Heatmap = {
  start_hour_utc: '2026-10-13T13:00:00Z',
  hours: 3,
  points: [
    { lon: -96.875, lat: 32.875, levels: [RiskLevel.LOW, RiskLevel.HIGH, RiskLevel.SEVERE] },
    { lon: -95.375, lat: 29.875, levels: [RiskLevel.MODERATE, RiskLevel.LOW, RiskLevel.LOW] },
  ],
}

describe('buildHeatmapPoints', () => {
  it('makes one [lon, lat] point per heatmap point', () => {
    const points = buildHeatmapPoints(heatmap)

    expect(points.features.map((feature) => feature.geometry.coordinates)).toEqual([
      [-96.875, 32.875],
      [-95.375, 29.875],
    ])
  })

  it('stores the level of each hour as r0, r1, r2', () => {
    const points = buildHeatmapPoints(heatmap)

    expect(points.features[0].properties).toEqual({ r0: 0, r1: 2, r2: 3 })
  })
})

describe('getHeatmapColorExpression', () => {
  it('reads the property of the given hour', () => {
    expect(getHeatmapColorExpression(6)[1]).toEqual(['get', 'r6'])
  })
})

describe('getHeatmapRadiusAtZoom0', () => {
  it('reaches past one 0.25-degree cell at zoom 0, so neighbors overlap', () => {
    // 0.25 degrees x 512 / 360 pixels per degree x 1.25 = about 0.444 pixels.
    expect(getHeatmapRadiusAtZoom0(0.25)).toBeCloseTo(0.4444, 4)
  })
})
