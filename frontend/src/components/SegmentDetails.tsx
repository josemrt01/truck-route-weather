import { RISK_CAUSE_LABELS, RISK_LEVEL_LABELS } from '../config/riskConfig'
import { formatEta, formatPrecipitationRate, formatSpeed } from '../lib/formatters'
import { getWorseCheckpoint } from '../lib/routeGeometry'
import type { Checkpoint } from '../types/tripPlan'
import { RiskColorSwatch } from './RiskColorSwatch'

type SegmentDetailsProps = {
  // The checkpoints at both ends of the clicked stretch.
  start: Checkpoint
  end: Checkpoint
}

// Popup content for a route stretch: where and when, its risk, and the weather that caused it.
export function SegmentDetails({ start, end }: SegmentDetailsProps) {
  // Show the weather of the end that gave the stretch its color, so the numbers explain the color.
  const worse = getWorseCheckpoint(start, end)

  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <strong>
        Miles {start.mile}–{end.mile}
      </strong>
      <span>
        {formatEta(start.eta_utc)} – {formatEta(end.eta_utc)}
      </span>

      <span className="mt-1 flex items-center gap-1.5 font-semibold">
        <RiskColorSwatch level={worse.level} />
        {RISK_LEVEL_LABELS[worse.level]} · {RISK_CAUSE_LABELS[worse.cause]}
      </span>

      <span className="text-muted">
        Mile {worse.mile}, forecast for {formatEta(worse.forecast_hour_utc)}
      </span>
      <span>
        Gusts {formatSpeed(worse.wind_gust_mph)} · Wind {formatSpeed(worse.wind_speed_mph)}
      </span>
      <span>
        Rain {formatPrecipitationRate(worse.rain_in_hr)} · Snow {formatPrecipitationRate(worse.snow_in_hr)}
      </span>
    </div>
  )
}
