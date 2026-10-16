import { Drawer } from '@base-ui/react/drawer'
import type { ReactNode } from 'react'
import { DRAWER_FULL_FRACTION, DRAWER_SNAP_POINTS } from '../config/layoutConfig'
import { getNextDrawerStop, getSnapPointForStop, getStopForSnapPoint } from '../lib/drawerStops'
import { DrawerStop } from '../types/drawerStop'

type TripDrawerProps = {
  stop: DrawerStop
  // Called after a drag or a tap on the handle; App stores the new stop.
  onStopChange: (stop: DrawerStop) => void
  // Shown just above the drawer's top edge (the compact forecast card), so it moves with the drawer;
  // hidden at the full stop.
  aboveContent?: ReactNode
  children: ReactNode
}

// The panel on narrow screens: a bottom drawer that is always open and rests at three stops. Non-modal, so the
// map behind it keeps working.
export function TripDrawer({ stop, onStopChange, aboveContent, children }: TripDrawerProps) {
  return (
    <Drawer.Root
      open
      // The drawer never closes: swiping down at the low stop, Escape and outside taps are ignored.
      onOpenChange={() => {}}
      modal={false}
      disablePointerDismissal
      snapPoints={DRAWER_SNAP_POINTS}
      snapPoint={getSnapPointForStop(stop)}
      onSnapPointChange={(snapPoint) => onStopChange(getStopForSnapPoint(snapPoint))}
    >
      {/* Keeps the focused form field above the on-screen keyboard. */}
      <Drawer.VirtualKeyboardProvider>
        <Drawer.Portal>
          {/* The full-screen viewport lets taps through to the map; only the drawer itself takes them. */}
          <Drawer.Viewport className="pointer-events-none fixed inset-0 flex items-end justify-center">
            {/* Base UI sets --drawer-snap-point-offset (how far below its full height the drawer rests) and
                --drawer-swipe-movement-y (the drag so far); the transform moves the drawer by both, and the bottom
                padding keeps the scrolling list's end on screen. */}
            <Drawer.Popup
              className="pointer-events-auto relative flex w-full flex-col rounded-t-3xl bg-panel text-base shadow-floating-panel outline-none touch-none [padding-bottom:max(0px,calc(var(--drawer-snap-point-offset)+var(--drawer-swipe-movement-y)))] [transform:translateY(calc(var(--drawer-snap-point-offset)+var(--drawer-swipe-movement-y)))] transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:select-none"
              // Full height comes from config, so the drawer and its full snap point always match.
              style={{ height: `${DRAWER_FULL_FRACTION * 100}dvh` }}
            >
              {aboveContent && stop !== DrawerStop.FULL && (
                <div className="absolute inset-x-3 bottom-full mb-3">{aboveContent}</div>
              )}

              {/* A div, not a button: Base UI never starts a drag on buttons, and the handle must be draggable.
                  A tap moves to the next stop. */}
              <div
                onClick={() => onStopChange(getNextDrawerStop(stop))}
                className="flex shrink-0 cursor-grab justify-center pt-2 pb-1.5"
                aria-hidden="true"
              >
                <span className="h-1.5 w-10 rounded-full bg-toolbar-edge" />
              </div>

              <Drawer.Title className="sr-only">Trip panel</Drawer.Title>

              {children}

              {/* Keeps the end of the list clear of the phone's home-indicator area (0 on screens without one). */}
              <div className="h-[env(safe-area-inset-bottom)] shrink-0" aria-hidden="true" />
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.VirtualKeyboardProvider>
    </Drawer.Root>
  )
}
