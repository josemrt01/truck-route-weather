import { RiskCause, RiskLevel } from '../types/risk'

// Color per risk level; a JS value because MapLibre paints on a canvas and can't read CSS variables;
// used by the map route colors, RiskLegend and SegmentDetails.
export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: '#2da44e',
  [RiskLevel.MODERATE]: '#d4a72c',
  [RiskLevel.HIGH]: '#e16f24',
  [RiskLevel.SEVERE]: '#cf222e',
  [RiskLevel.NO_TRAVEL]: '#6e2b8f',
}

// Name shown for each risk level; used by RiskLegend and SegmentDetails.
export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: 'Low',
  [RiskLevel.MODERATE]: 'Moderate',
  [RiskLevel.HIGH]: 'High',
  [RiskLevel.SEVERE]: 'Severe',
  [RiskLevel.NO_TRAVEL]: 'No Travel',
}

// Text shown for what caused a level; used by SegmentDetails.
export const RISK_CAUSE_LABELS: Record<RiskCause, string> = {
  [RiskCause.NONE]: 'Calm weather',
  [RiskCause.WIND]: 'Wind gusts',
  [RiskCause.WIND_LOAD_RULE]: 'Wind gusts + heavy load',
  [RiskCause.RAIN]: 'Rain',
  [RiskCause.SNOW]: 'Snow',
}

// Levels in order from calm to worst; used by RiskLegend to list them.
export const RISK_LEVELS_IN_ORDER: RiskLevel[] = [
  RiskLevel.LOW,
  RiskLevel.MODERATE,
  RiskLevel.HIGH,
  RiskLevel.SEVERE,
  RiskLevel.NO_TRAVEL,
]
