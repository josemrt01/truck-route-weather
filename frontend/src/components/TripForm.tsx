import { useState, type FormEvent } from 'react'
import { getTripPlan } from '../api/tripPlanApi'
import { NETWORK_ERROR_MESSAGE } from '../config/errorMessages'
import { TripPlanError, TripPlanField, type TripPlan } from '../types/tripPlan'
import { PlaceField } from './PlaceField'

type TripFormProps = {
  // Called with the result after a successful plan; App stores it.
  onTripPlanned: (tripPlan: TripPlan) => void
}

export function TripForm({ onTripPlanned }: TripFormProps) {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [isPlanning, setIsPlanning] = useState(false)
  const [error, setError] = useState<TripPlanError | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Stop the browser from reloading the page on submit.
    event.preventDefault()
    setError(null)
    setIsPlanning(true)

    try {
      const tripPlan = await getTripPlan(origin.trim(), destination.trim())
      onTripPlanned(tripPlan)
    } catch (caughtError) {
      setError(caughtError instanceof TripPlanError ? caughtError : new TripPlanError(NETWORK_ERROR_MESSAGE, null))
    } finally {
      setIsPlanning(false)
    }
  }

  function updateOrigin(text: string) {
    setOrigin(text)

    // The user is fixing this field, so its old error no longer applies.
    if (error?.field === TripPlanField.ORIGIN) setError(null)
  }

  function updateDestination(text: string) {
    setDestination(text)

    // The user is fixing this field, so its old error no longer applies.
    if (error?.field === TripPlanField.DESTINATION) setError(null)
  }

  // The error message for one field, or undefined when the error belongs elsewhere.
  function getFieldError(field: TripPlanField): string | undefined {
    return error?.field === field ? error.message : undefined
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Disabling the fieldset disables every input and the button while planning. */}
      <fieldset disabled={isPlanning} className="flex flex-col gap-1.5">
        <PlaceField
          id="origin-input"
          label="Origin"
          value={origin}
          placeholder="Dallas, TX"
          error={getFieldError(TripPlanField.ORIGIN)}
          onChange={updateOrigin}
        />

        <PlaceField
          id="destination-input"
          label="Destination"
          value={destination}
          placeholder="Houston, TX"
          error={getFieldError(TripPlanField.DESTINATION)}
          onChange={updateDestination}
        />

        <button
          type="submit"
          className="mt-2 cursor-pointer rounded-md bg-primary p-2.5 font-semibold text-surface disabled:cursor-wait disabled:opacity-60"
        >
          {isPlanning ? 'Planning…' : 'Plan route'}
        </button>

        {/* Errors not tied to one field: no road, routing service down, network. */}
        {error && error.field === null && (
          <p className="text-error" role="alert">
            {error.message}
          </p>
        )}
      </fieldset>
    </form>
  )
}
