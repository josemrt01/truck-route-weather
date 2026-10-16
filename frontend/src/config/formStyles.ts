// Tailwind classes shared by every text input in forms: filled gray like Apple and Google Maps, white with a
// blue border while typing, and a red border while the field has an error.
export const FORM_CONTROL_CLASS_NAME =
  'rounded-lg border border-transparent bg-muted px-2.5 py-2 outline-none focus:border-primary focus:bg-surface aria-[invalid=true]:border-error'

// Tailwind classes for a toggle button that fills its row, uses the panel's 16 px text (shadcn's default is 14 px)
// and turns blue while pressed; used by the departure and checkpoint button groups.
export const TOGGLE_OPTION_CLASS_NAME =
  'h-10 flex-1 text-base aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary aria-pressed:hover:text-primary-foreground'
