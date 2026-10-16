import { MapPinIcon, PencilIcon, XIcon } from 'lucide-react'
import { formatEta, formatWeight } from '../lib/formatters'
import type { TripPlan, TripSettings } from '../types/tripPlan'

type TripSummaryProps = {
  tripPlan: TripPlan
  tripSettings: TripSettings
  // Called when Edit is pressed; App then shows the form again, still filled in.
  onEdit: () => void
  // Called when X is pressed; App removes the plan and shows an empty form.
  onClear: () => void
}

// The planned trip in a few lines, at the top of the results: start, end, departure and truck settings.
export function TripSummary({ tripPlan, tripSettings, onEdit, onClear }: TripSummaryProps) {
  return (
    <section className="flex items-start gap-3">
      {/* Start circle, dotted line, end pin: the same picture Google Maps uses for a trip. */}
      <div className="flex flex-col items-center pt-1" aria-hidden="true">
        <span className="size-2.5 rounded-full border-2 border-muted-foreground" />
        <span className="my-1 h-4 border-l-2 border-dotted border-muted-foreground" />
        <MapPinIcon className="size-4 text-error" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <span className="truncate font-semibold">{tripPlan.origin.label}</span>
        <span className="truncate font-semibold">{tripPlan.destination.label}</span>
        <span className="text-muted-foreground">
          Leaves {formatEta(tripPlan.departure_utc)} · {formatWeight(tripSettings.weightLb)} · checks every{' '}
          {tripSettings.spacingMi} mi
        </span>
      </div>

      <button
        type="button"
        onClick={onEdit}
        className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 font-semibold text-primary hover:bg-muted"
      >
        <PencilIcon className="size-3.5" />
        Edit
      </button>
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear trip"
        className="cursor-pointer rounded-lg p-2 text-muted-foreground hover:bg-muted"
      >
        <XIcon className="size-4" />
      </button>
    </section>
  )
}
