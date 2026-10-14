import { useEffect, useState } from 'react'
import { getBackendStatus } from './api/healthApi'
import { MapView } from './components/MapView'
import { TripForm } from './components/TripForm'
import { formatDistance, formatDuration, formatEta } from './lib/formatters'
import { BackendStatus } from './types/backendStatus'
import type { TripPlan } from './types/tripPlan'

function App() {
  const [status, setStatus] = useState<BackendStatus>(BackendStatus.CHECKING)
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null)

  // Check the backend once, when the page first loads.
  useEffect(() => {
    getBackendStatus().then(setStatus)
  }, [])

  return (
    // Phones: panel on top, map below. From md (768px) up: map fills the screen, panel floats over it.
    <main className="flex h-screen flex-col md:relative md:block">
      <div className="relative min-h-0 flex-1 md:absolute md:inset-0">
        <MapView tripPlan={tripPlan} />
      </div>

      <aside className="flex flex-col gap-3 bg-surface p-4 text-sm md:absolute md:top-3 md:left-3 md:max-h-[calc(100vh-24px)] md:w-80 md:overflow-y-auto md:rounded-lg md:shadow-floating-panel">
        <h1 className="text-lg font-bold">Truck Route Weather</h1>
        <span className="text-muted">Backend: {status}</span>

        <TripForm onTripPlanned={setTripPlan} />

        {/* Temporary summary until the map draws the route and the route cards exist. */}
        {tripPlan && (
          <p className="text-muted">
            {tripPlan.origin.label} → {tripPlan.destination.label} · {formatDistance(tripPlan.route.distance_mi)} ·{' '}
            {formatDuration(tripPlan.route.duration_s)} · Arrives {formatEta(tripPlan.route.arrival_utc)}
          </p>
        )}
      </aside>
    </main>
  )
}

export default App
