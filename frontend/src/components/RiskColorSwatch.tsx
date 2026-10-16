import { RISK_LEVEL_COLORS } from '../config/riskConfig'
import type { RiskLevel } from '../types/risk'

type RiskColorSwatchProps = {
  level: RiskLevel
}

// A small square in a risk level's color; used by RiskLegend.
export function RiskColorSwatch({ level }: RiskColorSwatchProps) {
  return (
    // The color comes from config at runtime, so it's an inline style instead of a Tailwind class.
    <span
      className="inline-block size-3 shrink-0 rounded-sm"
      style={{ backgroundColor: RISK_LEVEL_COLORS[level] }}
      aria-hidden="true"
    />
  )
}
