// Tailwind classes shared by every text input and select in forms; the border turns red while the field has an error.
export const FORM_CONTROL_CLASS_NAME =
  'rounded-md border border-border bg-surface px-2.5 py-2 aria-[invalid=true]:border-error'

// Tailwind classes for a toggle button that fills its row and turns blue while pressed;
// used by the departure and checkpoint button groups.
export const TOGGLE_OPTION_CLASS_NAME =
  'flex-1 aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary aria-pressed:hover:text-primary-foreground'
