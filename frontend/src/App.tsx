import { Drawer } from '@base-ui/react/drawer'
import { useEffect, useState, type ElementType } from 'react'
import { getBackendStatus } from './api/healthApi'
import { getHeatmap } from './api/heatmapApi'
import { DrawerSegmentDetails } from './components/DrawerSegmentDetails'
import { ForecastSlider } from './components/ForecastSlider'
import { MapView } from './components/MapView'
import { PanelContent } from './components/PanelContent'
import { TripDrawer } from './components/TripDrawer'
import { getDrawerSummaryText } from './lib/drawerSummary'
import { getRouteById, getRouteOptionName } from './lib/tripPlanRoutes'
import { useIsWideScreen } from './lib/useIsWideScreen'
import { BackendStatus } from './types/backendStatus'
import { DrawerStop } from './types/drawerStop'
import { HeatmapStatus, type Heatmap } from './types/heatmap'
import { PanelView } from './types/panelView'
import type { SegmentClick, SelectedSegment } from './types/selectedSegment'
import type { RoutePlan, TripPlan, TripSettings } from './types/tripPlan'

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
  // Where the drawer rests on narrow screens; starts full, with the form.
  const [drawerStop, setDrawerStop] = useState<DrawerStop>(DrawerStop.FULL)
  // The clicked route segment; MapView highlights it, and its details show in the popup or the drawer.
  const [selectedSegment, setSelectedSegment] = useState<SelectedSegment | null>(null)
  // Side panel from 1024px up, drawer below.
  const isWideScreen = useIsWideScreen()

  const selectedRoute = tripPlan && selectedRouteId ? getRouteById(tripPlan, selectedRouteId) : null

  // Only the heatmap of the current plan counts (same "hide instead of reset" idea as the map popup).
  const currentHeatmap = heatmapResult?.tripPlan === tripPlan ? heatmapResult : null

  // A segment from an older plan or another route is hidden instead of reset (same idea as the heatmap).
  const visibleSegment =
    selectedSegment?.tripPlan === tripPlan && selectedSegment.routeId === selectedRouteId ? selectedSegment : null
  // The checkpoints at both ends of the visible segment.
  const segmentStart = visibleSegment && selectedRoute ? selectedRoute.checkpoints[visibleSegment.index] : null
  const segmentEnd = visibleSegment && selectedRoute ? selectedRoute.checkpoints[visibleSegment.index + 1] : null

  // Check the backend once, when the page first loads.
  useEffect(() => {
    getBackendStatus().then(setBackendStatus)
  }, [])

  function handleTripPlanned(newTripPlan: TripPlan, newTripSettings: TripSettings) {
    setTripPlan(newTripPlan)
    setTripSettings(newTripSettings)
    setPanelView(PanelView.RESULTS)
    // Narrow screens: half the screen, so the cards and the routes are both visible.
    setDrawerStop(DrawerStop.MIDDLE)
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
    setDrawerStop(DrawerStop.FULL)
    setFormResetCount((previousCount) => previousCount + 1)
  }

  // "Edit": back to the form, with the drawer full on narrow screens.
  function handleShowForm() {
    setPanelView(PanelView.FORM)
    setDrawerStop(DrawerStop.FULL)
  }

  function handleSelectSegment(segmentClick: SegmentClick | null) {
    if (segmentClick === null || tripPlan === null || selectedRouteId === null) {
      setSelectedSegment(null)
      return
    }

    setSelectedSegment({
      tripPlan,
      routeId: selectedRouteId,
      index: segmentClick.index,
      lon: segmentClick.lon,
      lat: segmentClick.lat,
    })

    // Narrow screens: the details open in the drawer at half height.
    if (!isWideScreen) {
      setDrawerStop(DrawerStop.MIDDLE)
    }
  }

  // The same panel content in both layouts; only its container changes.
  function renderPanelContent(scrollArea: ElementType) {
    return (
      <PanelContent
        panelView={panelView}
        backendStatus={backendStatus}
        tripPlan={tripPlan}
        tripSettings={tripSettings}
        selectedRouteId={selectedRouteId}
        formResetCount={formResetCount}
        onTripPlanned={handleTripPlanned}
        onClearTrip={handleClearTrip}
        onShowForm={handleShowForm}
        onShowResults={() => setPanelView(PanelView.RESULTS)}
        onSelectRoute={setSelectedRouteId}
        ScrollArea={scrollArea}
      />
    )
  }

  // The forecast card for the selected route; compact on the drawer, full over the map.
  function renderForecastSlider(isCompact: boolean, plan: TripPlan, route: RoutePlan) {
    return (
      <ForecastSlider
        isCompact={isCompact}
        hour={forecastHour}
        onHourChange={setForecastHour}
        onUse={() => setIsTruckVisible(true)}
        heatmap={currentHeatmap?.heatmap ?? null}
        heatmapStatus={currentHeatmap?.status ?? null}
        routeName={getRouteOptionName(route)}
        departureUtc={plan.departure_utc}
        arrivalUtc={route.arrival_utc}
      />
    )
  }

  return (
    // The map fills the screen in both layouts; the panel is a left sidebar from 1024px up, a bottom drawer below.
    <main className="relative h-dvh overflow-hidden">
      {/* No visible app title; screen readers still get the page's name. */}
      <h1 className="sr-only">Truck Route Weather</h1>

      <div className="absolute inset-0">
        <MapView
          tripPlan={tripPlan}
          selectedRouteId={selectedRouteId}
          heatmap={currentHeatmap?.heatmap ?? null}
          forecastHour={forecastHour}
          isTruckVisible={isTruckVisible}
          selectedSegment={visibleSegment}
          onSelectSegment={handleSelectSegment}
          isPopupEnabled={isWideScreen}
        />
        {isWideScreen && tripPlan && selectedRoute && (
          // Centered over the map, clear of the side panel (28rem) and high enough to leave MapLibre's credits visible.
          <div className="pointer-events-none absolute right-6 bottom-10 left-[29.5rem] flex justify-center">
            <div className="pointer-events-auto w-full max-w-2xl">
              {renderForecastSlider(false, tripPlan, selectedRoute)}
            </div>
          </div>
        )}
      </div>

      {isWideScreen ? (
        // w-[28rem] (448px) must match the left value of ROUTE_FIT_PADDING in mapConfig.ts.
        <aside className="absolute top-0 left-0 flex h-dvh w-[28rem] flex-col bg-panel text-base shadow-floating-panel">
          {renderPanelContent('div')}
        </aside>
      ) : (
        <TripDrawer
          stop={drawerStop}
          onStopChange={setDrawerStop}
          summaryText={getDrawerSummaryText(selectedRoute)}
          aboveContent={tripPlan && selectedRoute ? renderForecastSlider(true, tripPlan, selectedRoute) : null}
        >
          {visibleSegment && segmentStart && segmentEnd && (
            <DrawerSegmentDetails start={segmentStart} end={segmentEnd} onBack={() => setSelectedSegment(null)} />
          )}
          {/* Hidden, not removed, while a segment shows, so the form keeps its values for "Edit". */}
          <div className={visibleSegment ? 'hidden' : 'flex min-h-0 flex-1 flex-col'}>
            {renderPanelContent(Drawer.Content)}
          </div>
        </TripDrawer>
      )}
    </main>
  )
}

export default App
