import { ArrowUpDownIcon, MapPinIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { FieldError, FieldLabel } from './FormField'

// Tailwind classes for a piece of the dotted line joining the start circle and the end pin.
const DOTTED_LINE_CLASS_NAME = 'border-l-2 border-dotted border-muted-foreground'

type TripEndpointFieldsProps = {
  originId: string
  originInput: ReactNode
  originError?: string
  destinationId: string
  destinationInput: ReactNode
  destinationError?: string
  onSwap: () => void
}

// Origin and destination stacked like Google Maps: a circle and a pin joined by a dotted line on the left,
// a swap button on the right.
//
// A grid with one row per piece (label, input, error) keeps each icon in the same row as its input,
// so error messages can't push the icons out of line. Rows without content (no error) take no space.
export function TripEndpointFields({
  originId,
  originInput,
  originError,
  destinationId,
  destinationInput,
  destinationError,
  onSwap,
}: TripEndpointFieldsProps) {
  return (
    <div className="grid grid-cols-[1rem_minmax(0,1fr)_auto] gap-x-3">
      {/* Row 1: origin label. */}
      <FieldLabel id={originId} label="Origin" isRequired className="col-start-2 row-start-1 mb-1.5" />

      {/* Row 2: start circle, with the dotted line starting below it; origin input. */}
      <span className="col-start-1 row-start-2 flex flex-col items-center" aria-hidden="true">
        <span className="flex-1" />
        <span className="size-2.5 shrink-0 rounded-full border-2 border-muted-foreground" />
        <span className={`flex-1 ${DOTTED_LINE_CLASS_NAME}`} />
      </span>
      <div className="col-start-2 row-start-2">{originInput}</div>

      {/* Rows 3 and 4: the dotted line runs past the origin error and the destination label. */}
      <span className={`col-start-1 row-span-2 row-start-3 justify-self-center ${DOTTED_LINE_CLASS_NAME}`} />
      {originError && <FieldError message={originError} className="col-start-2 row-start-3 mt-1.5" />}
      <FieldLabel id={destinationId} label="Destination" isRequired className="col-start-2 row-start-4 mt-4 mb-1.5" />

      {/* Row 5: the dotted line ends at the pin; destination input. */}
      <span className="col-start-1 row-start-5 flex flex-col items-center" aria-hidden="true">
        <span className={`flex-1 ${DOTTED_LINE_CLASS_NAME}`} />
        <MapPinIcon className="size-4 shrink-0 text-error" />
        <span className="flex-1" />
      </span>
      <div className="col-start-2 row-start-5">{destinationInput}</div>

      {/* Row 6: destination error. */}
      {destinationError && <FieldError message={destinationError} className="col-start-2 row-start-6 mt-1.5" />}

      {/* Centered on the rows from the origin input to the destination input. */}
      <button
        type="button"
        onClick={onSwap}
        aria-label="Swap origin and destination"
        className="col-start-3 row-span-4 row-start-2 cursor-pointer self-center rounded-full p-2.5 text-muted-foreground hover:bg-muted"
      >
        <ArrowUpDownIcon className="size-5" />
      </button>
    </div>
  )
}
