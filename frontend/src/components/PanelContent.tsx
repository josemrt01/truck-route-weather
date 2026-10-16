import { ChevronLeftIcon, PencilIcon, XIcon } from 'lucide-react'
import type { ElementType } from 'react'
import { SECONDARY_BUTTON_CLASS_NAME } from '../config/buttonStyles'
import { BackendStatus } from '../types/backendStatus'
import { PanelView } from '../types/panelView'
import type { TripPlan, TripSettings } from '../types/tripPlan'
import { PanelToolbar } from './PanelToolbar'
import { RouteCards } from './RouteCards'
import { TripForm } from './TripForm'
import { TripSummary } from './TripSummary'

type PanelContentProps = {
  panelView: PanelView
  backendStatus: BackendStatus
  tripPlan: TripPlan | null
  tripSettings: TripSettings | null
  selectedRouteId: string | null
  // Changing it makes React build a new, empty form; Clear adds 1 to it.
  formResetCount: number
  onTripPlanned: (tripPlan: TripPlan, tripSettings: TripSettings) => void
  // Clear (form) and X (Routes toolbar).
  onClearTrip: () => void
  // "Edit" in the Routes toolbar.
  onShowForm: () => void
  // "‹ Routes" in the form toolbar.
  onShowResults: () => void
  onSelectRoute: (routeId: string) => void
  // Element that scrolls the form and cards: a plain div in the side panel, Drawer.Content in the drawer,
  // so the drawer can tell scrolling from dragging.
  ScrollArea?: ElementType
}

// What the panel shows, in both layouts: the toolbar of the current view, the trip summary, then the form or the
// route cards in a scrolling area.
export function PanelContent({
  panelView,
  backendStatus,
  tripPlan,
  tripSettings,
  selectedRouteId,
  formResetCount,
  onTripPlanned,
  onClearTrip,
  onShowForm,
  onShowResults,
  onSelectRoute,
  ScrollArea = 'div',
}: PanelContentProps) {
  return (
    <>
      {/* The toolbar stays put while the content under it scrolls. */}
      {panelView === PanelView.FORM ? (
        <PanelToolbar
          title="Plan a trip"
          leftActions={
            tripPlan && (
              <button
                type="button"
                onClick={onShowResults}
                className={`flex items-center gap-0.5 py-1.5 pr-3 pl-2 ${SECONDARY_BUTTON_CLASS_NAME}`}
              >
                <ChevronLeftIcon className="size-4" />
                Routes
              </button>
            )
          }
        />
      ) : (
        <PanelToolbar
          title="Routes"
          rightActions={
            <>
              <button
                type="button"
                onClick={onShowForm}
                className={`flex items-center gap-1.5 px-3 py-1.5 ${SECONDARY_BUTTON_CLASS_NAME}`}
              >
                <PencilIcon className="size-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={onClearTrip}
                aria-label="Clear trip"
                className={`px-3 py-1.5 ${SECONDARY_BUTTON_CLASS_NAME}`}
              >
                <XIcon className="size-4" />
              </button>
            </>
          }
        />
      )}

      {/* The trip the user entered sits outside the scrolling area, edge to edge under the toolbar. */}
      {panelView === PanelView.RESULTS && tripPlan && tripSettings && (
        <TripSummary tripPlan={tripPlan} tripSettings={tripSettings} />
      )}

      {/* overscroll-contain and touch-auto let the list scroll by touch inside the drawer; no effect on desktop. */}
      <ScrollArea className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain touch-auto p-4 lg:p-6">
        {/* Silent while the backend is fine; only a problem is worth the user's attention. */}
        {backendStatus === BackendStatus.UNREACHABLE && (
          <p className="text-error" role="alert">
            Can't reach the server. Try again in a minute.
          </p>
        )}

        {/* The form stays in the page while hidden, so "Edit" brings it back with every value still filled in. */}
        <div className={panelView === PanelView.FORM ? 'flex flex-col gap-3' : 'hidden'}>
          <TripForm key={formResetCount} onTripPlanned={onTripPlanned} onClear={onClearTrip} />
        </div>

        {panelView === PanelView.RESULTS && tripPlan && selectedRouteId && (
          <RouteCards tripPlan={tripPlan} selectedRouteId={selectedRouteId} onSelectRoute={onSelectRoute} />
        )}
      </ScrollArea>
    </>
  )
}
