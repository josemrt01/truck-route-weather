// Backend endpoint URLs; used by the functions in src/api/.
export const API_ROUTES = {
  // Backend liveness check; used by getBackendStatus.
  HEALTH: '/api/health',
  // Routes and checkpoints between two places, without weather; used by getTripPlan.
  TRIP_PLANS: '/api/trip-plans',
  // Risk along each route from the forecasts the browser sends, and the recommendation; used by getTripPlan.
  TRIP_RISKS: '/api/trip-risks',
  // Risk level for every corridor point and forecast hour, from the forecasts the browser sends; used by getHeatmap.
  HEATMAP: '/api/heatmap',
  // Places matching typed text, for the origin and destination suggestions; used by searchPlaces.
  PLACES: '/api/places',
} as const
