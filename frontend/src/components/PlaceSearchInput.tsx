import { Autocomplete } from '@base-ui/react/autocomplete'
import { XIcon } from 'lucide-react'
import { useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { FORM_CONTROL_CLASS_NAME } from '../config/formStyles'
import { findPlaceByLabel } from '../lib/placeSuggestions'
import { usePlaceSuggestions } from '../lib/usePlaceSuggestions'
import { PlaceSearchStatus } from '../types/placeSearch'
import type { Place } from '../types/tripPlan'

// Tailwind classes for the text under the suggestions ("No matches", "Suggestions unavailable").
const LIST_MESSAGE_CLASS_NAME = 'px-2.5 py-2 text-muted-foreground'

type PlaceSearchInputProps = {
  // id of the input, so the FormField label focuses it.
  id: string
  text: string
  placeholder: string
  // True while the text is a picked suggestion; no search runs for it.
  isPlaceSelected: boolean
  isInvalid: boolean
  // Screen-reader name of the clear button, e.g. "Clear origin".
  clearLabel: string
  // The user typed or cleared the text.
  onTextChange: (text: string) => void
  // The user picked a suggestion.
  onPlaceSelect: (place: Place) => void
}

export function PlaceSearchInput({
  id,
  text,
  placeholder,
  isPlaceSelected,
  isInvalid,
  clearLabel,
  onTextChange,
  onPlaceSelect,
}: PlaceSearchInputProps) {
  const { places, status } = usePlaceSuggestions(text, !isPlaceSelected)
  const [isOpen, setIsOpen] = useState(false)

  // The list opens only when it has places or a message to show; while loading, the spinner is enough.
  const hasListContent = places.length > 0 || status === PlaceSearchStatus.READY || status === PlaceSearchStatus.FAILED

  function handleValueChange(newText: string) {
    // Picking a suggestion (click or Enter) puts its label in the input.
    const pickedPlace = findPlaceByLabel(places, newText)
    if (pickedPlace) {
      onPlaceSelect(pickedPlace)
      return
    }

    onTextChange(newText)
  }

  return (
    <Autocomplete.Root
      items={places}
      value={text}
      onValueChange={handleValueChange}
      itemToStringValue={(place: Place) => place.label}
      // The backend already matched the places to the text, so the list shows them as they are.
      mode="none"
      open={isOpen && hasListContent}
      onOpenChange={setIsOpen}
    >
      <div className="relative">
        {/* Right padding keeps typed text from running under the spinner and the clear button. */}
        <Autocomplete.Input
          id={id}
          placeholder={placeholder}
          aria-invalid={isInvalid}
          className={`${FORM_CONTROL_CLASS_NAME} w-full pr-14`}
        />

        <div className="absolute inset-y-0 right-2 flex items-center gap-1">
          {status === PlaceSearchStatus.LOADING && (
            <Spinner aria-label="Loading suggestions" className="text-muted-foreground" />
          )}
          {text && (
            <Autocomplete.Clear
              aria-label={clearLabel}
              className="cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-muted"
            >
              <XIcon className="size-4" />
            </Autocomplete.Clear>
          )}
        </div>
      </div>

      {/* The portal draws the list at the end of the page, so the panel's scroll area can't cut it off. */}
      <Autocomplete.Portal>
        <Autocomplete.Positioner sideOffset={4} className="z-50 w-(--anchor-width)">
          <Autocomplete.Popup className="rounded-md border border-border bg-popover py-1 text-sm text-popover-foreground shadow-floating-panel">
            {status === PlaceSearchStatus.FAILED && <p className={LIST_MESSAGE_CLASS_NAME}>Suggestions unavailable</p>}
            {status === PlaceSearchStatus.READY && places.length === 0 && (
              <p className={LIST_MESSAGE_CLASS_NAME}>No matches</p>
            )}

            <Autocomplete.List>
              {(place: Place) => (
                <Autocomplete.Item
                  key={place.label}
                  value={place}
                  className="cursor-pointer px-2.5 py-2 data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  {place.label}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  )
}
