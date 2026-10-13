import { useState, type FormEvent } from 'react'
import { getTripPlan } from '../api/tripPlanApi'
import { NETWORK_ERROR_MESSAGE } from '../config/errorMessages'
import { TripPlanError, TripPlanField, type TripPlan } from '../types/tripPlan'

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

  return (
    <form className="trip-form" onSubmit={handleSubmit}>
      {/* Disabling the fieldset disables every input and the button while planning. */}
      <fieldset disabled={isPlanning}>
        <label htmlFor="origin-input">Origin</label>
        <input
          id="origin-input"
          value={origin}
          placeholder="Dallas, TX"
          aria-invalid={error?.field === TripPlanField.ORIGIN}
          onChange={(event) => updateOrigin(event.target.value)}
        />
        {error?.field === TripPlanField.ORIGIN && <p className="field-error">{error.message}</p>}

        <label htmlFor="destination-input">Destination</label>
        <input
          id="destination-input"
          value={destination}
          placeholder="Houston, TX"
          aria-invalid={error?.field === TripPlanField.DESTINATION}
          onChange={(event) => updateDestination(event.target.value)}
        />
        {error?.field === TripPlanField.DESTINATION && <p className="field-error">{error.message}</p>}

        <button type="submit">{isPlanning ? 'Planning…' : 'Plan route'}</button>

        {/* Errors not tied to one field: no road, routing service down, network. */}
        {error && error.field === null && (
          <p className="form-error" role="alert">
            {error.message}
          </p>
        )}
      </fieldset>
    </form>
  )
}
