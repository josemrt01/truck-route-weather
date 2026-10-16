// Tailwind classes for the main action of a view (Plan route, play): a blue gradient lit from the top,
// a darker edge, a small shadow and embossed text; it sinks 1px when pressed.
export const PRIMARY_BUTTON_CLASS_NAME =
  'cursor-pointer rounded-lg border border-button-blue-edge bg-linear-to-b from-button-blue-top to-button-blue-bottom font-semibold text-primary-foreground shadow-raised inset-shadow-highlight text-shadow-embossed hover:brightness-105 active:translate-y-px active:shadow-none active:inset-shadow-pressed disabled:cursor-wait disabled:opacity-60'

// Tailwind classes for secondary actions (Clear, Edit, the date and time pickers): a white-to-gray gradient
// with a border and a small shadow, like a physical key; it sinks 1px when pressed.
export const SECONDARY_BUTTON_CLASS_NAME =
  'cursor-pointer rounded-lg border border-border bg-linear-to-b from-surface to-surface-sunken font-semibold text-foreground shadow-raised hover:brightness-[1.02] active:translate-y-px active:shadow-none active:inset-shadow-pressed disabled:cursor-wait disabled:opacity-60'

// Tailwind classes for a group of joined buttons where one is picked (a segmented control); used with
// spacing={0} on ToggleGroup, which joins the buttons and draws the dividers.
export const SEGMENTED_GROUP_CLASS_NAME = 'w-full rounded-lg shadow-raised'

// Tailwind classes for one option of a segmented control: raised gray when off, sunken blue when picked;
// uses the panel's 16 px text (shadcn's default is 14 px). transition-none removes shadcn's 150 ms fade, so a press
// shows at once; the hover rule keeps white text on the picked option. Used by the departure and checkpoint groups.
export const SEGMENTED_OPTION_CLASS_NAME =
  'h-10 flex-1 bg-linear-to-b from-surface to-surface-sunken text-base transition-none aria-pressed:border-button-blue-edge aria-pressed:from-button-blue-edge aria-pressed:to-button-blue-bottom aria-pressed:text-primary-foreground aria-pressed:inset-shadow-pressed aria-pressed:text-shadow-embossed aria-pressed:hover:text-primary-foreground'
