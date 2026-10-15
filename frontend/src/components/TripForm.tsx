import { useState, type FormEvent } from 'react'
import { getTripPlan } from '../api/tripPlanApi'
import { CHECKPOINT_SPACING_OPTIONS_MI, DEFAULT_CHECKPOINT_SPACING_MI } from '../config/checkpointConfig'
import { FORM_CONTROL_CLASS_NAME } from '../config/formStyles'
import { DEFAULT_TRUCK_WEIGHT_LB } from '../config/truckConfig'
import { convertDateTimeLocalToIso, getDateTimeLocalValue } from '../lib/dateTime'
import { TripPlanError, TripPlanField, type TripPlan } from '../types/tripPlan'
import { FormField } from './FormField'

// Field names the form has an input for; an error on any other field is shown as a general error.
const FORM_FIELDS: readonly string[] = Object.values(TripPlanField)

type TripFormProps = {
  // Called with the result after a successful plan, plus the weight the heatmap needs; App stores both.
  onTripPlanned: (tripPlan: TripPlan, weightLb: number) => void
}

export function TripForm({ onTripPlanned }: TripFormProps) {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  // Starts at the current local time; useState runs this function only on the first render.
  const [departureLocal, setDepartureLocal] = useState(() => getDateTimeLocalValue(new Date()))
  const [spacingMi, setSpacingMi] = useState<number>(DEFAULT_CHECKPOINT_SPACING_MI)
  // Kept as the typed text, so clearing the box while editing doesn't turn into NaN.
  const [weightText, setWeightText] = useState(String(DEFAULT_TRUCK_WEIGHT_LB))
  const [isPlanning, setIsPlanning] = useState(false)
  const [error, setError] = useState<TripPlanError | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Stop the browser from reloading the page on submit.
    event.preventDefault()
    setError(null)
    setIsPlanning(true)

    // An empty box becomes 0, which the backend rejects with a message under the field.
    const weightLb = Number(weightText)

    try {
      const tripPlan = await getTripPlan({
        origin: origin.trim(),
        destination: destination.trim(),
        departure: convertDateTimeLocalToIso(departureLocal),
        spacing_mi: spacingMi,
        weight_lb: weightLb,
      })
      onTripPlanned(tripPlan, weightLb)
    } catch (caughtError) {
      // getTripPlan only throws TripPlanError; anything else is an unexpected bug in our own code.
      const unexpectedError = new TripPlanError('Something went wrong. Please try again.', null)
      setError(caughtError instanceof TripPlanError ? caughtError : unexpectedError)
    } finally {
      setIsPlanning(false)
    }
  }

  // The user is changing this field, so its old error no longer applies.
  function clearErrorFor(field: TripPlanField) {
    if (error?.field === field) setError(null)
  }

  // The error message for one field, or undefined when the error belongs elsewhere.
  function getFieldError(field: TripPlanField): string | undefined {
    return error?.field === field ? error.message : undefined
  }

  // Errors with no field, or on a field this form has no input for, show under the button.
  const generalError = error && (error.field === null || !FORM_FIELDS.includes(error.field)) ? error.message : null

  return (
    <form onSubmit={handleSubmit}>
      {/* Disabling the fieldset disables every input and the button while planning. */}
      <fieldset disabled={isPlanning} className="flex flex-col gap-1.5">
        <FormField id="origin-input" label="Origin" error={getFieldError(TripPlanField.ORIGIN)}>
          <input
            id="origin-input"
            value={origin}
            placeholder="Dallas, TX"
            aria-invalid={Boolean(getFieldError(TripPlanField.ORIGIN))}
            onChange={(event) => {
              setOrigin(event.target.value)
              clearErrorFor(TripPlanField.ORIGIN)
            }}
            className={FORM_CONTROL_CLASS_NAME}
          />
        </FormField>

        <FormField id="destination-input" label="Destination" error={getFieldError(TripPlanField.DESTINATION)}>
          <input
            id="destination-input"
            value={destination}
            placeholder="Houston, TX"
            aria-invalid={Boolean(getFieldError(TripPlanField.DESTINATION))}
            onChange={(event) => {
              setDestination(event.target.value)
              clearErrorFor(TripPlanField.DESTINATION)
            }}
            className={FORM_CONTROL_CLASS_NAME}
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
