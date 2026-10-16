import { ClockIcon, MapPinIcon, MilestoneIcon, WeightIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatEta, formatWeight } from '../lib/formatters'
import type { TripPlan, TripSettings } from '../types/tripPlan'

type TripSummaryProps = {
  tripPlan: TripPlan
  tripSettings: TripSettings
}

// What the user entered, as a white band right under the toolbar and edge to edge, so it reads as "your trip"
// and not as one more route card: From and To, then the departure and truck settings as small chips.
// Edit and close live in the toolbar above it.
export function TripSummary({ tripPlan, tripSettings }: TripSummaryProps) {
  return (
    <section className="flex shrink-0 flex-col gap-3 border-b border-border bg-surface px-4 py-4 md:px-6">
      <div className="flex items-stretch gap-3">
        {/* Start circle, dotted line, end pin: the same picture as the form and the map. */}
        <div className="flex flex-col items-center py-1.5" aria-hidden="true">
          <span className="size-2.5 shrink-0 rounded-full border-2 border-muted-foreground" />
          <span className="my-1 flex-1 border-l-2 border-dotted border-muted-foreground" />
          <MapPinIcon className="size-4 shrink-0 text-error" />
        </div>

        <dl className="flex min-w-0 flex-1 flex-col gap-2">
          <PlaceLine label="From" place={tripPlan.origin.label} />
          <PlaceLine label="To" place={tripPlan.destination.label} />
        </dl>
      </div>

      <div className="flex flex-wrap gap-2">
        <SettingChip icon={ClockIcon}>Leaves {formatEta(tripPlan.departure_utc)}</SettingChip>
        <SettingChip icon={WeightIcon}>{formatWeight(tripSettings.weightLb)}</SettingChip>
        <SettingChip icon={MilestoneIcon}>Checks every {tripSettings.spacingMi} miles</SettingChip>
      </div>
    </section>
  )
}

type PlaceLineProps = {
  label: string
  place: string
}

// "From  Dallas, Texas": a small gray label, then the place in bold.
function PlaceLine({ label, place }: PlaceLineProps) {
  return (
    <div className="flex min-w-0 items-baseline gap-2">
      <dt className="w-10 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="truncate font-semibold">{place}</dd>
    </div>
  )
}

type SettingChipProps = {
  icon: LucideIcon
  children: ReactNode
}

// One trip setting as a small gray pill with an icon.
function SettingChip({ icon: Icon, children }: SettingChipProps) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-sm ring-1 ring-border">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      {children}
    </span>
  )
}
