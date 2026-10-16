import { RISK_LEVEL_LABELS } from '../config/riskConfig'
import type { RoutePlan } from '../types/tripPlan'
import { formatDuration } from './formatters'
import { getRouteOptionName } from './tripPlanRoutes'

// The one line shown at the drawer's low stop, e.g. "Option 1 · 3 h 27 min · Low risk"; "Plan a trip" before a plan.
export function getDrawerSummaryText(selectedRoute: RoutePlan | null): string {
  if (selectedRoute === null) {
    return 'Plan a trip'
  }

  const optionName = getRouteOptionName(selectedRoute)
  const duration = formatDuration(selectedRoute.duration_s)
  const worstRisk = RISK_LEVEL_LABELS[selectedRoute.worst_level]

  return `${optionName} · ${duration} · ${worstRisk} risk`
}
