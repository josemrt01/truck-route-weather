import { ClockIcon, CloudRainIcon, SnowflakeIcon, WindIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { RISK_CAUSE_LABELS, RISK_LEVEL_COLORS, RISK_LEVEL_LABELS, RISK_LEVEL_TEXT_COLORS } from '../config/riskConfig'
import { formatEta, formatPrecipitationRate, formatSpeed } from '../lib/formatters'
import { getWorseCheckpoint } from '../lib/routeGeometry'
import { RiskCause } from '../types/risk'
import type { Checkpoint } from '../types/tripPlan'

type SegmentDetailsProps = {
  // The checkpoints at both ends of the clicked stretch.
  start: Checkpoint
  end: Checkpoint
}

// Popup for a clicked stretch of route, in plain words: how risky it is and why, when the truck passes,
// and the weather there. The weather comes from the end that gave the stretch its color.
export function SegmentDetails({ start, end }: SegmentDetailsProps) {
  const worse = getWorseCheckpoint(start, end)
  const levelColor = RISK_LEVEL_COLORS[worse.level]
  const isWindCause = worse.cause === RiskCause.WIND || worse.cause === RiskCause.WIND_LOAD_RULE

  return (
    <div className="flex w-full flex-col gap-3 text-base">
      <div className="flex flex-col items-start gap-1.5">
        <span
          className="rounded-full px-2 py-0.5 text-sm font-semibold"
          style={{ backgroundColor: levelColor, color: RISK_LEVEL_TEXT_COLORS[worse.level] }}
        >
          {RISK_LEVEL_LABELS[worse.level]} risk
        </span>
        <strong className="text-lg leading-tight">{RISK_CAUSE_LABELS[worse.cause]}</strong>
        {worse.cause === RiskCause.WIND_LOAD_RULE && (
          <span className="text-sm text-muted-foreground">Strong gusts are more dangerous for a heavy truck.</span>
        )}
        <span className="text-sm text-muted-foreground">
          Miles {start.mile}–{end.mile} of your trip
        </span>
      </div>

      <span className="flex items-start gap-2">
        <ClockIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="flex flex-col">
          <span className="text-sm text-muted-foreground">You pass here</span>
          <span className="font-semibold">
            {formatEta(start.eta_utc)} – {formatEta(end.eta_utc)}
          </span>
        </span>
      </span>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <span className="text-sm text-muted-foreground">
          Weather at mile {worse.mile}, {formatEta(worse.forecast_hour_utc)}
        </span>
        <WeatherRow
          icon={WindIcon}
          label="Wind"
          value={`${formatSpeed(worse.wind_speed_mph)}, gusts ${formatSpeed(worse.wind_gust_mph)}`}
          causeColor={isWindCause ? levelColor : null}
        />
        {/* Rain and snow only when there is some, so calm segments stay short. */}
        {worse.rain_in_hr > 0 && (
          <WeatherRow
            icon={CloudRainIcon}
            label="Rain"
            value={formatPrecipitationRate(worse.rain_in_hr)}
            causeColor={worse.cause === RiskCause.RAIN ? levelColor : null}
          />
        )}
        {worse.snow_in_hr > 0 && (
          <WeatherRow
            icon={SnowflakeIcon}
            label="Snow"
            value={formatPrecipitationRate(worse.snow_in_hr)}
            causeColor={worse.cause === RiskCause.SNOW ? levelColor : null}
          />
        )}
      </div>
    </div>
  )
}

type WeatherRowProps = {
  icon: LucideIcon
  label: string
  value: string
  // The risk color when this condition caused the risk (its icon takes the color, its value turns bold); else null.
  causeColor: string | null
}

// One weather condition: icon and name on the left, the value on the right.
function WeatherRow({ icon: Icon, label, value, causeColor }: WeatherRowProps) {
  return (
    <span className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2">
        <Icon
          className="size-4 shrink-0 text-muted-foreground"
          style={{ color: causeColor ?? undefined }}
          aria-hidden="true"
        />
        {label}
      </span>
      <span className={causeColor ? 'font-semibold' : ''}>{value}</span>
    </span>
  )
}
