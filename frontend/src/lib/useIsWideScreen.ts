import { useSyncExternalStore } from 'react'
import { NARROW_SCREEN_QUERY } from '../config/layoutConfig'

// True from 1024px wide up (side panel layout), false below it (drawer layout); updates when the window is
// resized or a tablet is rotated.
export function useIsWideScreen(): boolean {
  return useSyncExternalStore(subscribeToScreenWidth, getIsWideScreen)
}

// Tells React when the screen crosses 1024px, so components using the hook render again.
function subscribeToScreenWidth(onChange: () => void): () => void {
  const narrowScreenQuery = window.matchMedia(NARROW_SCREEN_QUERY)
  narrowScreenQuery.addEventListener('change', onChange)

  return () => narrowScreenQuery.removeEventListener('change', onChange)
}

function getIsWideScreen(): boolean {
  return !window.matchMedia(NARROW_SCREEN_QUERY).matches
}
