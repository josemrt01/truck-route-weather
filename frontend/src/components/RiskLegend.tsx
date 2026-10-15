import { RISK_LEVEL_LABELS, RISK_LEVELS_IN_ORDER } from '../config/riskConfig'
import { RiskColorSwatch } from './RiskColorSwatch'

// Explains the route colors; floats in the map's bottom-right corner, above the map credits.
export function RiskLegend() {
  return (
    <div className="absolute right-3 bottom-8 flex flex-col gap-1 rounded-md bg-surface p-2 text-xs shadow-floating-panel">
      <strong>Risk</strong>
      {RISK_LEVELS_IN_ORDER.map((level) => (
        <span key={level} className="flex items-center gap-1.5">
          <RiskColorSwatch level={level} />
          {RISK_LEVEL_LABELS[level]}
        </span>
      ))}
    </div>
  )
}
