// Risk levels the backend sends, from calm to worst; must match RiskLevel in backend/trips/types.py.
export const RiskLevel = {
  LOW: 0,
  MODERATE: 1,
  HIGH: 2,
  SEVERE: 3,
  NO_TRAVEL: 4,
} as const

export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel]

// What caused a checkpoint's level; must match RiskCause in backend/trips/types.py.
export const RiskCause = {
  NONE: 'none',
  WIND: 'wind',
  // Wind made worse because the truck is heavy.
  WIND_LOAD_RULE: 'wind_load_rule',
  RAIN: 'rain',
  SNOW: 'snow',
} as const

export type RiskCause = (typeof RiskCause)[keyof typeof RiskCause]
