import { CircleCheckIcon, ClockIcon, FlagIcon, LightbulbIcon, RouteIcon, TriangleAlertIcon, ZapIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { RISK_LEVEL_COLORS, RISK_LEVEL_LABELS, RISK_LEVEL_TEXT_COLORS } from '../config/riskConfig'
import { formatDistance, formatDuration, formatEta } from '../lib/formatters'
import { getRiskyMiles, getRiskyPercent } from '../lib/routeRisk'
import { getRouteOptionName } from '../lib/tripPlanRoutes'
import type { RoutePlan } from '../types/tripPlan'

type RouteCardProps = {
  route: RoutePlan
  isRecommended: boolean
  // True on the quickest route; it gets a "Fastest" pill.
  isFastest: boolean
  // Why the recommended route wins; shown only on that card.
  reason: string
  isSelected: boolean
  // Called when the card is clicked; App then draws this route with risk colors.
  onSelect: () => void
}

// One route option. The recommended one gets a green band on top and a green box with the reason;
// facts come two per row (left and right), each with its own colored icon.
export function RouteCard({ route, isRecommended, isFastest, reason, isSelected, onSelect }: RouteCardProps) {
  const miles = route.miles_by_level
  const riskyMiles = getRiskyMiles(miles)
  const worstLevelColor = RISK_LEVEL_COLORS[route.worst_level]

  // The worst levels this route has, worst first, e.g. "Severe 12.0 mi · High 4.0 mi".
  const riskyLevelParts: string[] = []
  if (miles.no_travel > 0) riskyLevelParts.push(`No Travel ${formatDistance(miles.no_travel)}`)
  if (miles.severe > 0) riskyLevelParts.push(`Severe ${formatDistance(miles.severe)}`)
  if (miles.high > 0) riskyLevelParts.push(`High ${formatDistance(miles.high)}`)

  // Selected: thick blue ring on a soft blue background. Otherwise the recommended card keeps a thin green ring,
  // so it never looks selected.
  let frameClassName = 'ring-1 ring-border hover:bg-muted'
  if (isSelected) {
    frameClassName = 'bg-accent ring-2 ring-primary'
  } else if (isRecommended) {
    frameClassName = 'ring-1 ring-success hover:bg-muted'
  }

  return (
    // A button, so the card works with the mouse, the keyboard (Tab + Enter) and screen readers.
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`flex cursor-pointer flex-col overflow-hidden rounded-xl text-left ${frameClassName}`}
    >
      {isRecommended && (
        <span className="flex items-center gap-1.5 bg-success px-3 py-1.5 text-sm font-semibold text-surface">
          <CircleCheckIcon className="size-4" aria-hidden="true" />
          Recommended
        </span>
      )}

      <span className="flex flex-col gap-3 p-3">
        <span className="flex items-center justify-between gap-2">
          <strong className="text-lg">{getRouteOptionName(route)}</strong>
          {isFastest && (
            <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-sm font-semibold text-primary">
              <ZapIcon className="size-3.5" aria-hidden="true" />
              Fastest
            </span>
          )}
        </span>

        <span className="flex flex-col gap-2">
          <CardRow>
            <CardFact icon={ClockIcon} iconClassName="text-primary">
              {/* Bold only on the recommended card, so its time is the one the eye lands on. */}
              <span className={`text-xl ${isRecommended ? 'font-bold' : 'font-medium'}`}>
                {formatDuration(route.duration_s)}
              </span>
            </CardFact>
            <CardFact icon={FlagIcon} iconClassName="text-arrival">
              Arrives {formatEta(route.arrival_utc)}
            </CardFact>
          </CardRow>

          <CardRow>
            <CardFact icon={RouteIcon} iconClassName="text-distance">
              {formatDistance(route.distance_mi)}
            </CardFact>
            {/* The warning icon takes the worst level's color: green when calm, red when Severe.
                "Risky" means High or worse; the hover text says so. */}
            <span title="Miles at High risk or worse">
              <CardFact icon={TriangleAlertIcon} iconColor={worstLevelColor}>
                {riskyMiles > 0
                  ? `${formatDistance(riskyMiles)} risky · ${getRiskyPercent(riskyMiles, route.distance_mi)}%`
                  : 'No risky miles'}
              </CardFact>
            </span>
          </CardRow>

          <CardRow>
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">Worst risk</span>
              {/* The worst level met anywhere on the route, as a pill in its own color. */}
              <span
                className="rounded-full px-2 py-0.5 text-sm font-semibold"
                style={{ backgroundColor: worstLevelColor, color: RISK_LEVEL_TEXT_COLORS[route.worst_level] }}
              >
                {RISK_LEVEL_LABELS[route.worst_level]}
              </span>
            </span>
            {/* With one risky level its miles equal the risky total above, so the split shows only for two or more. */}
            {riskyLevelParts.length > 1 && (
              <span className="text-right text-muted-foreground">{riskyLevelParts.join(' · ')}</span>
            )}
          </CardRow>
        </span>

        {isRecommended && (
          <span className="flex items-start gap-2 rounded-lg bg-success-soft p-2.5 text-success">
            <LightbulbIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {reason}
          </span>
        )}
      </span>
    </button>
  )
}

type CardRowProps = {
  children: ReactNode
}

// A card row with one fact pushed to the left and one to the right.
function CardRow({ children }: CardRowProps) {
  return <span className="flex items-center justify-between gap-3">{children}</span>
}

type CardFactProps = {
  icon: LucideIcon
  // Tailwind text color for the icon, e.g. "text-primary".
  iconClassName?: string
  // Icon color from data (the risk colors live in config, not in Tailwind); used instead of iconClassName.
  iconColor?: string
  children: ReactNode
}

// One fact: a small colored icon, then the text.
function CardFact({ icon: Icon, iconClassName = '', iconColor, children }: CardFactProps) {
  return (
    <span className="flex items-center gap-2">
      <Icon className={`size-4 shrink-0 ${iconClassName}`} style={{ color: iconColor }} aria-hidden="true" />
      {children}
    </span>
  )
}
