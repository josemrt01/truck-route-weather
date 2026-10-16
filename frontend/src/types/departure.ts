// How the user sets the departure; used by DepartureInput and TripForm.
export const DepartureMode = {
  // Depart when Plan route is pressed.
  NOW: 'now',
  // Depart at the picked day and time.
  AT: 'at',
} as const

export type DepartureMode = (typeof DepartureMode)[keyof typeof DepartureMode]

// One day button or time option: value is what the form keeps, label is what the user sees.
// Days: value "2026-10-17", label "Sat 17". Times: value "08:15" (24-hour), label "8:15 AM".
export type DepartureOption = {
  value: string
  label: string
}

// The picked day and time, both in the browser's local time.
export type DepartureSelection = {
  dayValue: string
  timeValue: string
}
