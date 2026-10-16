import { CircleCheckIcon, ClockIcon, FlagIcon, LightbulbIcon, RouteIcon, TriangleAlertIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { RISK_LEVEL_COLORS, RISK_LEVEL_LABELS, RISK_LEVEL_TEXT_COLORS } from '../config/riskConfig'
import { formatDistance, formatDuration, formatEta } from '../lib/formatters'
import { getRiskyMiles, getRiskyPercent } from '../lib/routeRisk'
import type { RoutePlan } from '../types/tripPlan'
import { RiskBar } from './RiskBar'

type RouteCardProps = {
  route: RoutePlan
  isRecommended: boolean
  // True on the quickest route; its "Fastest" pill shows only when it isn't also the recommended one.
  isFastest: boolean
  // Why the recommended route wins; shown only on that card.
  reason: string
  isSelected: boolean
  // Called when the card is clicked; App then draws this route with risk colors.
  onSelect: () => void
}

// One route option, one fact per line: time, distance, arrival, then how risky it is.
export function RouteCard({ route, isRecommended, isFastest, reason, isSelected, onSelect }: RouteCardProps) {
  const miles = route.miles_by_level
  const riskyMiles = getRiskyMiles(miles)

  // The worst levels this route has, worst first, e.g. "Severe 12.0 mi · High 4.0 mi".
  const riskyLevelParts: string[] = []
  if (miles.no_travel > 0) riskyLevelParts.push(`No Travel ${formatDistance(miles.no_travel)}`)
  if (miles.severe > 0) riskyLevelParts.push(`Severe ${formatDistance(miles.severe)}`)
  if (miles.high > 0) riskyLevelParts.push(`High ${formatDistance(miles.high)}`)

  // Selected: soft blue background with a blue ring; others: a thin gray ring.
  const selectionClassName = isSelected ? 'bg-accent ring-2 ring-primary' : 'ring-1 ring-border hover:bg-muted'

  return (
    // A button, so the card works with the mouse, the keyboard (Tab + Enter) and screen readers.
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`flex cursor-pointer flex-col gap-3 rounded-xl p-3 text-left ${selectionClassName}`}
    >
      <span className="flex items-start justify-between gap-2">
        <strong className="text-base">{route.name}</strong>
        <span className="flex shrink-0 gap-1">
          {isRecommended && (
            <span className="flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
              <CircleCheckIcon className="size-3.5" />
              Recommended
            </span>
          )}
          {isFastest && !isRecommended && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Fastest</span>
          )}
        </span>
      </span>

      <span className="flex flex-col gap-1">
        <CardFact icon={ClockIcon}>
          <span className="text-xl font-bold">{formatDuration(route.duration_s)}</span>
        </CardFact>
        <CardFact icon={RouteIcon}>{formatDistance(route.distance_mi)}</CardFact>
        <CardFact icon={FlagIcon}>Arrives {formatEta(route.arrival_utc)}</CardFact>
      </span>

      <span className="flex flex-col gap-1.5">
        <CardFact icon={TriangleAlertIcon}>
          {/* The worst level as a pill in its own color, so routes look different at a glance. */}
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{
              backgroundColor: RISK_LEVEL_COLORS[route.worst_level],
              color: RISK_LEVEL_TEXT_COLORS[route.worst_level],
            }}
          >
            {RISK_LEVEL_LABELS[route.worst_level]}
          </span>
          <span className="text-muted-foreground">worst on this route</span>
        </CardFact>
        <RiskBar milesByLevel={miles} />
        {riskyMiles > 0 ? (
          <span className="flex flex-col text-muted-foreground">
            <span>
              {formatDistance(riskyMiles)} risky · {getRiskyPercent(riskyMiles, route.distance_mi)}% of the trip
            </span>
            <span>{riskyLevelParts.join(' · ')}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">No risky miles (High or worse)</span>
        )}
      </span>

      {isRecommended && (
        <CardFact icon={LightbulbIcon}>
          <span className="text-muted-foreground">{reason}</span>
        </CardFact>
      )}
    </button>
  )
}

type CardFactProps = {
  icon: LucideIcon
  children: ReactNode
}

// One line of the card: a small gray icon, then the fact.
function CardFact({ icon: Icon, children }: CardFactProps) {
  return (
    <span className="flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      {children}
    </span>
  )
}
