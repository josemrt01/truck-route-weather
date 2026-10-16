import { ArrowLeftIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getBackendStatus } from './api/healthApi'
import { getHeatmap } from './api/heatmapApi'
import { ForecastSlider } from './components/ForecastSlider'
import { MapView } from './components/MapView'
import { RouteCards } from './components/RouteCards'
import { TripForm } from './components/TripForm'
import { TripSummary } from './components/TripSummary'
import { getRouteById } from './lib/tripPlanRoutes'
import { BackendStatus } from './types/backendStatus'
import { HeatmapStatus, type Heatmap } from './types/heatmap'
import { PanelView } from './types/panelView'
import type { TripPlan, TripSettings } from './types/tripPlan'

// The heatmap and the plan it belongs to; a heatmap for an older plan that answers late is ignored.
type HeatmapResult = {
  tripPlan: TripPlan
  status: HeatmapStatus
  heatmap: Heatmap | null
}

function App() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>(BackendStatus.CHECKING)
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null)
  // Truck settings the current plan was made with; set together with tripPlan.
  const [tripSettings, setTripSettings] = useState<TripSettings | null>(null)
  // The form until a plan arrives, then the results; "Edit" and "Back to routes" switch between them.
  const [panelView, setPanelView] = useState<PanelView>(PanelView.FORM)
  // Changing the form's key makes React build a new, empty form; Clear adds 1 to it.
  const [formResetCount, setFormResetCount] = useState(0)
  // The route drawn with risk colors; starts as the recommended one, the route cards change it.
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [heatmapResult, setHeatmapResult] = useState<HeatmapResult | null>(null)
  // Forecast hour the heatmap shows: 0 = now, up to 48; the forecast slider changes it.
  const [forecastHour, setForecastHour] = useState(0)

  const selectedRoute = tripPlan && selectedRouteId ? getRouteById(tripPlan, selectedRouteId) : null

  // Only the heatmap of the current plan counts (same "hide instead of reset" idea as the map popup).
  const currentHeatmap = heatmapResult?.tripPlan === tripPlan ? heatmapResult : null

  // Check the backend once, when the page first loads.
  useEffect(() => {
    getBackendStatus().then(setBackendStatus)
  }, [])

  function handleTripPlanned(newTripPlan: TripPlan, newTripSettings: TripSettings) {
    setTripPlan(newTripPlan)
    setTripSettings(newTripSettings)
    setPanelView(PanelView.RESULTS)
    setSelectedRouteId(newTripPlan.recommended_route_id)
    setHeatmapResult({ tripPlan: newTripPlan, status: HeatmapStatus.LOADING, heatmap: null })
    // Each new plan starts at "now".
    setForecastHour(0)

    // The routes are already on screen; the heatmap arrives after, so routes never wait for it.
    getHeatmap({ points: newTripPlan.corridor_points, weight_lb: newTripSettings.weightLb })
      .then((heatmap) => setHeatmapResult({ tripPlan: newTripPlan, status: HeatmapStatus.READY, heatmap }))
      .catch(() => setHeatmapResult({ tripPlan: newTripPlan, status: HeatmapStatus.FAILED, heatmap: null }))
  }

  // Clear (form) and X (summary): back to an empty form and an empty map.
  function handleClearTrip() {
    setTripPlan(null)
    setTripSettings(null)
    setSelectedRouteId(null)
    setHeatmapResult(null)
    setForecastHour(0)
    setPanelView(PanelView.FORM)
    setFormResetCount((previousCount) => previousCount + 1)
  }

  return (
    // Phones: panel on top (at most half the screen, scrolling), map below.
    // From md (768px) up: map fills the screen, panel floats over it.
    <main className="flex h-screen flex-col md:relative md:block">
      <div className="relative min-h-0 flex-1 md:absolute md:inset-0">
        <MapView
          tripPlan={tripPlan}
          selectedRouteId={selectedRouteId}
          heatmap={currentHeatmap?.heatmap ?? null}
          forecastHour={forecastHour}
        />
        {tripPlan && selectedRoute && (
          <ForecastSlider
            hour={forecastHour}
            onHourChange={setForecastHour}
            heatmap={currentHeatmap?.heatmap ?? null}
            heatmapStatus={currentHeatmap?.status ?? null}
            routeName={selectedRoute.name}
            departureUtc={tripPlan.departure_utc}
            arrivalUtc={selectedRoute.arrival_utc}
          />
        )}
      </div>

      <aside className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto bg-surface p-4 text-sm md:absolute md:top-3 md:left-3 md:max-h-[calc(100vh-24px)] md:w-80 md:overflow-y-auto md:rounded-lg md:shadow-floating-panel">
        <h1 className="text-lg font-bold">Truck Route Weather</h1>
        {/* Silent while the backend is fine; only a problem is worth the user's attention. */}
        {backendStatus === BackendStatus.UNREACHABLE && (
          <p className="text-error" role="alert">
            Can't reach the server. Try again in a minute.
          </p>
        )}

        {/* The form stays in the page while hidden, so "Edit" brings it back with every value still filled in. */}
        <div className={panelView === PanelView.FORM ? 'flex flex-col gap-3' : 'hidden'}>
          {tripPlan && (
            <button
              type="button"
              onClick={() => setPanelView(PanelView.RESULTS)}
              className="flex cursor-pointer items-center gap-1 self-start rounded-md px-1 py-0.5 font-semibold text-primary hover:bg-muted"
            >
              <ArrowLeftIcon className="size-4" />
              Back to routes
            </button>
          )}
          <TripForm key={formResetCount} onTripPlanned={handleTripPlanned} onClear={handleClearTrip} />
        </div>

        {panelView === PanelView.RESULTS && tripPlan && tripSettings && selectedRouteId && (
          <>
            <TripSummary
              tripPlan={tripPlan}
              tripSettings={tripSettings}
              onEdit={() => setPanelView(PanelView.FORM)}
              onClear={handleClearTrip}
            />
            <RouteCards tripPlan={tripPlan} selectedRouteId={selectedRouteId} onSelectRoute={setSelectedRouteId} />
          </>
        )}
      </aside>
    </main>
  )
}

export default App
