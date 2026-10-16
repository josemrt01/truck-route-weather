// Where the bottom drawer rests on narrow screens; used by App, TripDrawer and drawerStops.
export const DrawerStop = {
  // Handle and one-line summary only.
  LOW: 'low',
  // Half the screen: route cards or segment details, map visible above.
  MIDDLE: 'middle',
  // Almost the whole screen: the form or long lists.
  FULL: 'full',
} as const

export type DrawerStop = (typeof DrawerStop)[keyof typeof DrawerStop]
