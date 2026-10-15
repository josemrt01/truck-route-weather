import { getRoutesInRankOrder } from '../lib/tripPlanRoutes'
import type { TripPlan } from '../types/tripPlan'
import { RouteCard } from './RouteCard'

type RouteCardsProps = {
  tripPlan: TripPlan
  selectedRouteId: string
  // Called with "A", "B" or "C" when a card is clicked.
  onSelectRoute: (routeId: string) => void
}

// The route options, recommended first, with the plan's warning and notes above them.
export function RouteCards({ tripPlan, selectedRouteId, onSelectRoute }: RouteCardsProps) {
  return (
    <section className="flex flex-col gap-2">
      {/* Every route crosses No Travel: the most important message, so it comes first. */}
      {tripPlan.warning && (
        <p className="rounded-md border border-error p-2 text-error" role="alert">
          {tripPlan.warning}
        </p>
      )}

      {/* e.g. "Only 2 routes found between these places." */}
      {tripPlan.notes.map((note) => (
        <p key={note} className="text-muted">
          {note}
        </p>
      ))}

      {getRoutesInRankOrder(tripPlan.routes).map((route) => (
        <RouteCard
          key={route.id}
          route={route}
          isRecommended={route.id === tripPlan.recommended_route_id}
          reason={tripPlan.reason}
          isSelected={route.id === selectedRouteId}
          onSelect={() => onSelectRoute(route.id)}
        />
      ))}
    </section>
  )
}
