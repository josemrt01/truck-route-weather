import { RISK_LEVEL_LABELS } from '../config/riskConfig'
import { formatDistance, formatDuration, formatEta } from '../lib/formatters'
import type { RoutePlan } from '../types/tripPlan'
import { RiskColorSwatch } from './RiskColorSwatch'

type RouteCardProps = {
  route: RoutePlan
  isRecommended: boolean
  // Why the recommended route wins; shown only on that card.
  reason: string
  isSelected: boolean
  // Called when the card is clicked; App then draws this route with risk colors.
  onSelect: () => void
}

// One route option: time, distance, risk, and the recommendation when it is the best route.
export function RouteCard({ route, isRecommended, reason, isSelected, onSelect }: RouteCardProps) {
  const miles = route.miles_by_level
  // The selected card gets a thicker blue border.
  const borderClassName = isSelected ? 'border-2 border-primary' : 'border border-border'

  return (
    // A button, so the card works with the mouse, the keyboard (Tab + Enter) and screen readers.
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`flex cursor-pointer flex-col gap-0.5 rounded-md p-2 text-left ${borderClassName}`}
    >
      <span className="flex items-center justify-between">
        <strong>Route {route.id}</strong>
        {isRecommended && <span className="rounded bg-primary px-1.5 text-xs text-surface">Recommended</span>}
      </span>

      <span>
        {formatDistance(route.distance_mi)} · {formatDuration(route.duration_s)} · Arrives{' '}
        {formatEta(route.arrival_utc)}
      </span>

      <span className="flex items-center gap-1.5">
        <RiskColorSwatch level={route.worst_level} />
        Worst: {RISK_LEVEL_LABELS[route.worst_level]} · Avg risk {route.avg_risk.toFixed(2)}
      </span>

      {/* No Travel only when there is some; Severe and High always, since the ranking compares them. */}
      <span className="text-muted-foreground">
        {miles.no_travel > 0 && `No Travel ${formatDistance(miles.no_travel)} · `}
        Severe {formatDistance(miles.severe)} · High {formatDistance(miles.high)}
      </span>

      {isRecommended && <span className="text-muted-foreground">{reason}</span>}
    </button>
  )
}
