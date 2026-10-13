import { useEffect, useState } from 'react'
import { getBackendStatus } from './api/healthApi'
import { MapView } from './components/MapView'
import { TripForm } from './components/TripForm'
import { formatDistance, formatDuration } from './lib/formatters'
import { BackendStatus } from './types/backendStatus'
import type { TripPlan } from './types/tripPlan'
import './App.css'

function App() {
  const [status, setStatus] = useState<BackendStatus>(BackendStatus.CHECKING)
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null)

  // Check the backend once, when the page first loads.
  useEffect(() => {
    getBackendStatus().then(setStatus)
  }, [])

  return (
    <main className="app">
      <div className="map-container">
        <MapView />
      </div>

      {/* Left panel over the map; stacks above the map on narrow screens (see App.css). */}
      <aside className="side-panel">
        <h1>Truck Route Weather</h1>
        <span className="backend-status">Backend: {status}</span>

        <TripForm onTripPlanned={setTripPlan} />

        {/* Temporary summary until the map draws the route and the route cards exist. */}
        {tripPlan && (
          <p className="trip-summary">
            {tripPlan.origin.label} → {tripPlan.destination.label} · {formatDistance(tripPlan.route.distance_mi)} ·{' '}
            {formatDuration(tripPlan.route.duration_s)}
          </p>
        )}
      </aside>
    </main>
  )
}

export default App
