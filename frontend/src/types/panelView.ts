// What the side panel shows; used by App.
export const PanelView = {
  // The trip form: before the first plan, and after "Edit".
  FORM: 'form',
  // The trip summary and the route cards, after a plan.
  RESULTS: 'results',
} as const

export type PanelView = (typeof PanelView)[keyof typeof PanelView]
