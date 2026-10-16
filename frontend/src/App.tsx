import { useEffect, useState } from 'react'
import { getBackendStatus } from './api/healthApi'
import { getHeatmap } from './api/heatmapApi'
import { ForecastSlider } from './components/ForecastSlider'
import { MapView } from './components/MapView'
import { PanelContent } from './components/PanelContent'
import { getRouteById, getRouteOptionName } from './lib/tripPlanRoutes'
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
  // The truck shows only after the user plays or drags the forecast slider; each new plan hides it again.
  const [isTruckVisible, setIsTruckVisible] = useState(false)

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
    // Each new plan starts at "now", without the truck.
    setForecastHour(0)
    setIsTruckVisible(false)

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
    setIsTruckVisible(false)
    setPanelView(PanelView.FORM)
    setFormResetCount((previousCount) => previousCount + 1)
  }

  return (
    // Below lg (1024px): map on top, panel below (at most half the screen, scrolling); Task 3 replaces this with
    // the drawer. From lg up: map fills the screen, panel is a full-height sidebar on the left edge.
    <main className="flex h-dvh flex-col lg:relative lg:block">
      <div className="relative min-h-0 flex-1 lg:absolute lg:inset-0">
        <MapView
          tripPlan={tripPlan}
          selectedRouteId={selectedRouteId}
          heatmap={currentHeatmap?.heatmap ?? null}
          forecastHour={forecastHour}
          isTruckVisible={isTruckVisible}
        />
        {tripPlan && selectedRoute && (
          <ForecastSlider
            hour={forecastHour}
            onHourChange={setForecastHour}
            onUse={() => setIsTruckVisible(true)}
            heatmap={currentHeatmap?.heatmap ?? null}
            heatmapStatus={currentHeatmap?.status ?? null}
            routeName={getRouteOptionName(selectedRoute)}
            departureUtc={tripPlan.departure_utc}
            arrivalUtc={selectedRoute.arrival_utc}
          />
        )}
      </div>

      {/* lg:w-[28rem] (448px) must match the left value of ROUTE_FIT_PADDING in mapConfig.ts. */}
      <aside className="flex max-h-[50vh] flex-col bg-panel text-base lg:absolute lg:top-0 lg:left-0 lg:h-dvh lg:max-h-none lg:w-[28rem] lg:shadow-floating-panel">
        {/* No visible app title; screen readers still get the page's name. */}
        <h1 className="sr-only">Truck Route Weather</h1>

        <PanelContent
          panelView={panelView}
          backendStatus={backendStatus}
          tripPlan={tripPlan}
          tripSettings={tripSettings}
          selectedRouteId={selectedRouteId}
          formResetCount={formResetCount}
          onTripPlanned={handleTripPlanned}
          onClearTrip={handleClearTrip}
          onShowForm={() => setPanelView(PanelView.FORM)}
          onShowResults={() => setPanelView(PanelView.RESULTS)}
          onSelectRoute={setSelectedRouteId}
        />
      </aside>
    </main>
  )
}

export default App
