import type { ExpressionSpecification } from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import { RISK_LEVEL_COLORS } from '../config/riskConfig'
import { HEATMAP_CELL_COVERAGE, HEATMAP_LOW_OPACITY, HEATMAP_RISK_OPACITY } from '../config/mapConfig'
import { RiskLevel } from '../types/risk'
import type { Heatmap } from '../types/heatmap'

// MapLibre draws the whole 360-degree world 512 pixels wide at zoom 0; used by getHeatmapRadiusExpression.
const PIXELS_PER_DEGREE_AT_ZOOM_0 = 512 / 360

// Highest zoom MapLibre supports; the radius rule must reach it.
const MAX_ZOOM = 22

// Fully transparent, for a level the frontend doesn't know (shouldn't happen); used by getHeatmapColorExpression.
const TRANSPARENT_COLOR = 'rgba(0, 0, 0, 0)'

// One map point per grid cell, with its level for every hour as properties r0 ... r48.
// The slider only changes which r<hour> the layer reads, so sliding never rebuilds this data.
export function buildHeatmapPoints(heatmap: Heatmap): FeatureCollection<Point> {
  const features: FeatureCollection<Point>['features'] = []

  for (const point of heatmap.points) {
    const properties: Record<string, number> = {}
    for (let hour = 0; hour < point.levels.length; hour++) {
      properties[`r${hour}`] = point.levels[hour]
    }

    features.push({ type: 'Feature', properties, geometry: { type: 'Point', coordinates: [point.lon, point.lat] } })
  }

  return { type: 'FeatureCollection', features }
}

// Color rule for one forecast hour: each circle takes the color of its level that hour.
export function getHeatmapColorExpression(hour: number): ExpressionSpecification {
  return [
    'match',
    ['get', `r${hour}`],
    RiskLevel.LOW,
    RISK_LEVEL_COLORS[RiskLevel.LOW],
    RiskLevel.MODERATE,
    RISK_LEVEL_COLORS[RiskLevel.MODERATE],
    RiskLevel.HIGH,
    RISK_LEVEL_COLORS[RiskLevel.HIGH],
    RiskLevel.SEVERE,
    RISK_LEVEL_COLORS[RiskLevel.SEVERE],
    RiskLevel.NO_TRAVEL,
    RISK_LEVEL_COLORS[RiskLevel.NO_TRAVEL],
    TRANSPARENT_COLOR,
  ]
}

// Opacity rule for one forecast hour: Low cells are fainter than risky ones, so calm areas stay in the background.
export function getHeatmapOpacityExpression(hour: number): ExpressionSpecification {
  return ['match', ['get', `r${hour}`], RiskLevel.LOW, HEATMAP_LOW_OPACITY, HEATMAP_RISK_OPACITY]
}

// Circle radius in pixels at zoom 0 that covers part of one grid cell, so neighboring circles blend.
export function getHeatmapRadiusAtZoom0(cellSizeDeg: number): number {
  return cellSizeDeg * PIXELS_PER_DEGREE_AT_ZOOM_0 * HEATMAP_CELL_COVERAGE
}

// Radius rule: it doubles with every zoom level, like the map itself, so circles keep covering their cell.
export function getHeatmapRadiusExpression(cellSizeDeg: number): ExpressionSpecification {
  const radiusAtZoom0 = getHeatmapRadiusAtZoom0(cellSizeDeg)

  return ['interpolate', ['exponential', 2], ['zoom'], 0, radiusAtZoom0, MAX_ZOOM, radiusAtZoom0 * 2 ** MAX_ZOOM]
}
