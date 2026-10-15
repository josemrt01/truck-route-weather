import { RISK_LEVEL_LABELS, RISK_LEVELS_IN_ORDER } from '../config/riskConfig'
import { RiskColorSwatch } from './RiskColorSwatch'

// One row explaining the route and heatmap colors; shown inside ForecastSlider.
export function RiskLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {RISK_LEVELS_IN_ORDER.map((level) => (
        <span key={level} className="flex items-center gap-1">
          <RiskColorSwatch level={level} />
          {RISK_LEVEL_LABELS[level]}
        </span>
      ))}
    </div>
  )
}
