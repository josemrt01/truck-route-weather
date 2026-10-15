import { useEffect, useState } from 'react'
import { getBackendStatus } from './api/healthApi'
import { MapView } from './components/MapView'
import { RouteCards } from './components/RouteCards'
import { TripForm } from './components/TripForm'
import { BackendStatus } from './types/backendStatus'
import type { TripPlan } from './types/tripPlan'

function App() {
  const [status, setStatus] = useState<BackendStatus>(BackendStatus.CHECKING)
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null)
  // The route drawn with risk colors; starts as the recommended one, the route cards change it.
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)

  // Check the backend once, when the page first loads.
  useEffect(() => {
    getBackendStatus().then(setStatus)
  }, [])

  function handleTripPlanned(newTripPlan: TripPlan) {
    setTripPlan(newTripPlan)
    setSelectedRouteId(newTripPlan.recommended_route_id)
  }

  return (
    // Phones: panel on top (at most half the screen, scrolling), map below.
    // From md (768px) up: map fills the screen, panel floats over it.
    <main className="flex h-screen flex-col md:relative md:block">
      <div className="relative min-h-0 flex-1 md:absolute md:inset-0">
        <MapView tripPlan={tripPlan} selectedRouteId={selectedRouteId} />
      </div>

      <aside className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto bg-surface p-4 text-sm md:absolute md:top-3 md:left-3 md:max-h-[calc(100vh-24px)] md:w-80 md:overflow-y-auto md:rounded-lg md:shadow-floating-panel">
        <h1 className="text-lg font-bold">Truck Route Weather</h1>
        <span className="text-muted">Backend: {status}</span>

        <TripForm onTripPlanned={handleTripPlanned} />

        {tripPlan && selectedRouteId && (
          <RouteCards tripPlan={tripPlan} selectedRouteId={selectedRouteId} onSelectRoute={setSelectedRouteId} />
        )}
      </aside>
    </main>
  )
}

export default App
