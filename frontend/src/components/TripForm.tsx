import { useState, type FormEvent } from 'react'
import { getTripPlan } from '../api/tripPlanApi'
import { CHECKPOINT_SPACING_OPTIONS_MI, DEFAULT_CHECKPOINT_SPACING_MI } from '../config/checkpointConfig'
import { FORM_CONTROL_CLASS_NAME } from '../config/formStyles'
import { DEFAULT_TRUCK_WEIGHT_LB } from '../config/truckConfig'
import { getDateTimeLocalValue } from '../lib/dateTime'
import { getMissingPlaceErrors } from '../lib/tripFormValidation'
import { buildTripPlanRequest } from '../lib/tripPlanRequest'
import { TripPlanError, TripPlanField, type FieldErrors, type LonLat, type Place, type TripPlan } from '../types/tripPlan'
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
  // Starts at the current local time; useState runs this function only on the first render.
  const [departureLocal, setDepartureLocal] = useState(() => getDateTimeLocalValue(new Date()))
  const [spacingMi, setSpacingMi] = useState<number>(DEFAULT_CHECKPOINT_SPACING_MI)
  // Kept as the typed text, so clearing the box while editing doesn't turn into NaN.
  const [weightText, setWeightText] = useState(String(DEFAULT_TRUCK_WEIGHT_LB))
  const [isPlanning, setIsPlanning] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  // Error not tied to one input (no road, service down, network); shown under the button.
  const [generalError, setGeneralError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Stop the browser from reloading the page on submit.
    event.preventDefault()
    setFieldErrors({})
    setGeneralError(null)

    // Blank places are caught here, so both messages show at once and no request is sent.
    const missingPlaceErrors = getMissingPlaceErrors(origin, destination)
    if (Object.keys(missingPlaceErrors).length > 0) {
      setFieldErrors(missingPlaceErrors)
      return
    }

    setIsPlanning(true)

    // An empty box becomes 0, which the backend rejects with a message under the field.
    const weightLb = Number(weightText)

    try {
      const tripPlan = await getTripPlan(
        buildTripPlanRequest({
          origin,
          originPoint,
          destination,
          destinationPoint,
          departureLocal,
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
      <fieldset disabled={isPlanning} className="flex flex-col gap-1.5">
        <FormField
          id="origin-input"
          label="Origin"
          error={getPlaceError(TripPlanField.ORIGIN, TripPlanField.ORIGIN_POINT)}
        >
          <PlaceSearchInput
            id="origin-input"
            text={origin}
            placeholder="Dallas, TX"
            isPlaceSelected={originPoint !== null}
            isInvalid={Boolean(getPlaceError(TripPlanField.ORIGIN, TripPlanField.ORIGIN_POINT))}
            clearLabel="Clear origin"
            onTextChange={handleOriginTextChange}
            onPlaceSelect={handleOriginSelect}
          />
        </FormField>

        <FormField
          id="destination-input"
          label="Destination"
          error={getPlaceError(TripPlanField.DESTINATION, TripPlanField.DESTINATION_POINT)}
        >
          <PlaceSearchInput
            id="destination-input"
            text={destination}
            placeholder="Houston, TX"
            isPlaceSelected={destinationPoint !== null}
            isInvalid={Boolean(getPlaceError(TripPlanField.DESTINATION, TripPlanField.DESTINATION_POINT))}
            clearLabel="Clear destination"
            onTextChange={handleDestinationTextChange}
            onPlaceSelect={handleDestinationSelect}
          />
        </FormField>

        <FormField id="departure-input" label="Departure" error={getFieldError(TripPlanField.DEPARTURE)}>
          {/* The browser shows a date and time picker in the user's local time. */}
          <input
            id="departure-input"
            type="datetime-local"
            value={departureLocal}
            aria-invalid={Boolean(getFieldError(TripPlanField.DEPARTURE))}
            onChange={(event) => {
              setDepartureLocal(event.target.value)
              clearErrorFor(TripPlanField.DEPARTURE)
            }}
            className={FORM_CONTROL_CLASS_NAME}
          />
        </FormField>

        <FormField id="spacing-input" label="Checkpoint every" error={getFieldError(TripPlanField.SPACING_MI)}>
          <select
            id="spacing-input"
            value={spacingMi}
            aria-invalid={Boolean(getFieldError(TripPlanField.SPACING_MI))}
            onChange={(event) => {
              // Select values are always text, so turn it back into a number.
              setSpacingMi(Number(event.target.value))
              clearErrorFor(TripPlanField.SPACING_MI)
            }}
            className={FORM_CONTROL_CLASS_NAME}
          >
            {CHECKPOINT_SPACING_OPTIONS_MI.map((spacingOption) => (
              <option key={spacingOption} value={spacingOption}>
                {spacingOption} mi
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="weight-input" label="Truck weight (lb)" error={getFieldError(TripPlanField.WEIGHT_LB)}>
          <input
            id="weight-input"
            type="number"
            inputMode="numeric"
            value={weightText}
            aria-invalid={Boolean(getFieldError(TripPlanField.WEIGHT_LB))}
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
