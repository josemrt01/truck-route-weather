import { RISK_LEVEL_COLORS, RISK_LEVEL_LABELS } from '../config/riskConfig'
import { formatDistance } from '../lib/formatters'
import { getRiskBarSegments } from '../lib/routeRisk'
import type { MilesByLevel } from '../types/tripPlan'

type RiskBarProps = {
  milesByLevel: MilesByLevel
}

// A thin bar split by the miles driven at each risk level, in the map's risk colors.
export function RiskBar({ milesByLevel }: RiskBarProps) {
  const segments = getRiskBarSegments(milesByLevel)

  // Screen readers get the numbers the colors stand for, e.g. "Low 180.0 mi, Severe 12.0 mi".
  const description = segments
    .map((segment) => `${RISK_LEVEL_LABELS[segment.level]} ${formatDistance(segment.miles)}`)
    .join(', ')

  return (
    <div role="img" aria-label={description} className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      {segments.map((segment) => (
        // Width and color come from the data, so they are inline styles instead of Tailwind classes.
        <span
          key={segment.level}
          style={{ width: `${segment.percent}%`, backgroundColor: RISK_LEVEL_COLORS[segment.level] }}
        />
      ))}
    </div>
  )
}
