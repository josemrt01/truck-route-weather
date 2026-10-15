import type { RiskLevel } from './risk'
import type { LonLat } from './tripPlan'

// Body of POST /api/heatmap; matches HeatmapRequestSerializer in the backend.
export type HeatmapRequest = {
  // The trip plan's corridor_points, sent back unchanged.
  points: LonLat[]
  weight_lb: number
}

// One grid point and its risk level for each forecast hour; matches heatmap_service in the backend.
export type HeatmapPoint = {
  lon: number
  lat: number
  // levels[0] is start_hour_utc, levels[48] is 48 hours later.
  levels: RiskLevel[]
}

// Response of POST /api/heatmap.
export type Heatmap = {
  // ISO time in UTC of hour 0 (the current hour when the heatmap was made).
  start_hour_utc: string
  hours: number
  points: HeatmapPoint[]
}

// Where the heatmap request is; used by App and RiskLegend.
export const HeatmapStatus = {
  LOADING: 'loading',
  READY: 'ready',
  FAILED: 'failed',
} as const

export type HeatmapStatus = (typeof HeatmapStatus)[keyof typeof HeatmapStatus]
