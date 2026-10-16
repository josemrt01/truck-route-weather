import { useState, type FormEvent } from 'react'
import { getTripPlan } from '../api/tripPlanApi'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { CHECKPOINT_SPACING_OPTIONS_MI } from '../config/checkpointConfig'
import { FORM_CONTROL_CLASS_NAME, TOGGLE_OPTION_CLASS_NAME } from '../config/formStyles'
import { buildDepartureIso, getFirstDepartureSelection } from '../lib/departureOptions'
import { getRequiredFieldErrors } from '../lib/tripFormValidation'
import { buildTripPlanRequest } from '../lib/tripPlanRequest'
import { DepartureMode, type DepartureChoice } from '../types/departure'
import { TripPlanError, TripPlanField, type FieldErrors, type LonLat, type Place, type TripPlan } from '../types/tripPlan'
import { DepartureInput } from './DepartureInput'
import { FormField } from './FormField'
import { PlaceSearchInput } from './PlaceSearchInput'

// Field names the form has an input for; an error on any other field is shown as a general error.
const FORM_FIELDS: readonly string[] = Object.values(TripPlanField)

type TripFormProps = {
  // Called with the result after a successful plan, plus the weight the heatmap needs; App stores both.
  onTripPlanned: (tripPlan: TripPlan, weightLb: number) => void
}

export function TripForm({ onTripPlanned }: TripFormProps) {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  // Coordinates of the picked suggestion; null while the text is typed by hand.
  const [originPoint, setOriginPoint] = useState<LonLat | null>(null)
  const [destinationPoint, setDestinationPoint] = useState<LonLat | null>(null)
  // Starts at "Leave now"; the day and time are ready for when the user presses "Depart at".
  // useState runs this function only on the first render.
  const [departureChoice, setDepartureChoice] = useState<DepartureChoice>(() => ({
    mode: DepartureMode.NOW,
    ...getFirstDepartureSelection(new Date()),
  }))
  // null until the user picks one of the spacing buttons.
  const [spacingMi, setSpacingMi] = useState<number | null>(null)
  // Kept as the typed text, so clearing the box while editing doesn't turn into NaN; starts empty.
  const [weightText, setWeightText] = useState('')
  const [isPlanning, setIsPlanning] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  // Error not tied to one input (no road, service down, network); shown under the button.
  const [generalError, setGeneralError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Stop the browser from reloading the page on submit.
    event.preventDefault()
    setFieldErrors({})
    setGeneralError(null)

    // Blank required fields are caught here, so every message shows at once and no request is sent.
    // The departure always has a value, so it isn't checked; an unpicked spacing counts as blank.
    const requiredFieldErrors = getRequiredFieldErrors([
      { field: TripPlanField.ORIGIN, text: origin },
      { field: TripPlanField.DESTINATION, text: destination },
      { field: TripPlanField.SPACING_MI, text: spacingMi === null ? '' : String(spacingMi) },
      { field: TripPlanField.WEIGHT_LB, text: weightText },
    ])
    if (Object.keys(requiredFieldErrors).length > 0) {
      setFieldErrors(requiredFieldErrors)
      return
    }

    // Already reported above; this line tells TypeScript the spacing is picked from here on.
    if (spacingMi === null) return

    setIsPlanning(true)

    // The box isn't blank here; out-of-range weights get their message from the backend.
    const weightLb = Number(weightText)

    try {
      const tripPlan = await getTripPlan(
        buildTripPlanRequest({
          origin,
          originPoint,
          destination,
          destinationPoint,
          // "Leave now" means the moment Plan route is pressed.
          departureIso: buildDepartureIso(
            departureChoice.mode,
            departureChoice.dayValue,
            departureChoice.timeValue,
            new Date(),
          ),
          spacingMi,
          weightLb,
        }),
      )
      onTripPlanned(tripPlan, weightLb)
    } catch (caughtError) {
      // getTripPlan only throws TripPlanError; anything else is an unexpected bug in our own code.
      if (!(caughtError instanceof TripPlanError)) {
        setGeneralError('Something went wrong. Please try again.')
      } else if (caughtError.field !== null && FORM_FIELDS.includes(caughtError.field)) {
        setFieldErrors({ [caughtError.field]: caughtError.message })
      } else {
        // No field, or a field this form has no input for.
        setGeneralError(caughtError.message)
      }
    } finally {
      setIsPlanning(false)
    }
  }

  // The user is changing this field, so its old error no longer applies; other fields keep theirs.
  function clearErrorFor(field: TripPlanField) {
    setFieldErrors((previousErrors) => {
      if (!(field in previousErrors)) return previousErrors

      const remainingErrors = { ...previousErrors }
      delete remainingErrors[field]
      return remainingErrors
    })
  }

  // The error message for one field, or undefined when it has none.
  function getFieldError(field: TripPlanField): string | undefined {
    return fieldErrors[field]
  }

  // A place error can be on its text or on its picked point; both show under the same input.
  function getPlaceError(textField: TripPlanField, pointField: TripPlanField): string | undefined {
    return getFieldError(textField) ?? getFieldError(pointField)
  }

  function handleSpacingChange(pressedValues: string[]) {
    // Pressing the button that is already on would leave none pressed; keep the current spacing then.
    if (pressedValues.length === 0) return

    setSpacingMi(Number(pressedValues[0]))
    clearErrorFor(TripPlanField.SPACING_MI)
  }

  // Typing or clearing drops the picked point, so the text and the point never disagree.
  function handleOriginTextChange(text: string) {
    setOrigin(text)
    setOriginPoint(null)
    clearErrorFor(TripPlanField.ORIGIN)
    clearErrorFor(TripPlanField.ORIGIN_POINT)
  }

  function handleOriginSelect(place: Place) {
    setOrigin(place.label)
    setOriginPoint([place.lon, place.lat])
    clearErrorFor(TripPlanField.ORIGIN)
    clearErrorFor(TripPlanField.ORIGIN_POINT)
  }

  function handleDestinationTextChange(text: string) {
    setDestination(text)
    setDestinationPoint(null)
    clearErrorFor(TripPlanField.DESTINATION)
    clearErrorFor(TripPlanField.DESTINATION_POINT)
  }

  function handleDestinationSelect(place: Place) {
    setDestination(place.label)
    setDestinationPoint([place.lon, place.lat])
    clearErrorFor(TripPlanField.DESTINATION)
    clearErrorFor(TripPlanField.DESTINATION_POINT)
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Disabling the fieldset disables every input and the button while planning. */}
      <fieldset disabled={isPlanning} className="flex flex-col gap-4">
        <FormField
          id="origin-input"
          label="Origin"
          isRequired
          error={getPlaceError(TripPlanField.ORIGIN, TripPlanField.ORIGIN_POINT)}
        >
          <PlaceSearchInput
            id="origin-input"
            text={origin}
            placeholder="Dallas, TX"
            isPlaceSelected={originPoint !== null}
            isInvalid={Boolean(getPlaceError(TripPlanField.ORIGIN, TripPlanField.ORIGIN_POINT))}
            isRequired
            clearLabel="Clear origin"
            onTextChange={handleOriginTextChange}
            onPlaceSelect={handleOriginSelect}
          />
        </FormField>

        <FormField
          id="destination-input"
          label="Destination"
          isRequired
          error={getPlaceError(TripPlanField.DESTINATION, TripPlanField.DESTINATION_POINT)}
        >
          <PlaceSearchInput
            id="destination-input"
            text={destination}
            placeholder="Houston, TX"
            isPlaceSelected={destinationPoint !== null}
            isInvalid={Boolean(getPlaceError(TripPlanField.DESTINATION, TripPlanField.DESTINATION_POINT))}
            isRequired
            clearLabel="Clear destination"
            onTextChange={handleDestinationTextChange}
            onPlaceSelect={handleDestinationSelect}
          />
        </FormField>

        <FormField id="departure-input" label="Departure" isRequired error={getFieldError(TripPlanField.DEPARTURE)}>
          <DepartureInput
            id="departure-input"
            choice={departureChoice}
            isInvalid={Boolean(getFieldError(TripPlanField.DEPARTURE))}
            onChoiceChange={(choice) => {
              setDepartureChoice(choice)
              clearErrorFor(TripPlanField.DEPARTURE)
            }}
          />
        </FormField>

        <FormField id="spacing-input" label="Checkpoint every" isRequired error={getFieldError(TripPlanField.SPACING_MI)}>
          {/* Nothing is pressed until the user picks; button values are text, so the number is turned into text. */}
          <ToggleGroup
            id="spacing-input"
            aria-label="Checkpoint every"
            aria-required
            variant="outline"
            value={spacingMi === null ? [] : [String(spacingMi)]}
            onValueChange={handleSpacingChange}
            className="w-full"
          >
            {CHECKPOINT_SPACING_OPTIONS_MI.map((spacingOption) => (
              <ToggleGroupItem
                key={spacingOption}
                value={String(spacingOption)}
                aria-invalid={Boolean(getFieldError(TripPlanField.SPACING_MI))}
                className={TOGGLE_OPTION_CLASS_NAME}
              >
                {spacingOption} mi
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FormField>

        <FormField id="weight-input" label="Truck weight (lb)" isRequired error={getFieldError(TripPlanField.WEIGHT_LB)}>
          <input
            id="weight-input"
            type="number"
            inputMode="numeric"
            value={weightText}
            placeholder="e.g. 45000"
            aria-invalid={Boolean(getFieldError(TripPlanField.WEIGHT_LB))}
            aria-required
            onChange={(event) => {
              setWeightText(event.target.value)
              clearErrorFor(TripPlanField.WEIGHT_LB)
            }}
            className={FORM_CONTROL_CLASS_NAME}
          />
        </FormField>

        <button
          type="submit"
          className="mt-2 cursor-pointer rounded-md bg-primary p-2.5 font-semibold text-surface disabled:cursor-wait disabled:opacity-60"
        >
          {isPlanning ? 'Planning…' : 'Plan route'}
        </button>

        {/* Errors not tied to one input: no road, routing service down, network. */}
        {generalError && (
          <p className="text-error" role="alert">
            {generalError}
          </p>
        )}
      </fieldset>
    </form>
  )
}
