import { RiskCause, RiskLevel } from '../types/risk'
import type { MilesByLevel } from '../types/tripPlan'

// Color per risk level; a JS value because MapLibre paints on a canvas and can't read CSS variables;
// used by the map route colors, RiskLegend and SegmentDetails.
export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: '#2da44e',
  [RiskLevel.MODERATE]: '#d4a72c',
  [RiskLevel.HIGH]: '#e16f24',
  [RiskLevel.SEVERE]: '#cf222e',
  [RiskLevel.NO_TRAVEL]: '#6e2b8f',
}

// Text color that stays readable on each level's color (dark on the light yellow); used by the risk pill on route cards.
export const RISK_LEVEL_TEXT_COLORS: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: '#ffffff',
  [RiskLevel.MODERATE]: '#1f2328',
  [RiskLevel.HIGH]: '#ffffff',
  [RiskLevel.SEVERE]: '#ffffff',
  [RiskLevel.NO_TRAVEL]: '#ffffff',
}

// Key of each level in a route's miles_by_level; used by routeRisk.
export const MILES_BY_LEVEL_KEYS: Record<RiskLevel, keyof MilesByLevel> = {
  [RiskLevel.LOW]: 'low',
  [RiskLevel.MODERATE]: 'moderate',
  [RiskLevel.HIGH]: 'high',
  [RiskLevel.SEVERE]: 'severe',
  [RiskLevel.NO_TRAVEL]: 'no_travel',
}

// Name shown for each risk level; used by RiskLegend, SegmentDetails and the route cards.
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
