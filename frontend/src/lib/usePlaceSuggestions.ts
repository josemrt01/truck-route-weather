import axios from 'axios'
import { useEffect, useState } from 'react'
import { searchPlaces } from '../api/placeSearchApi'
import { PLACE_SEARCH_DEBOUNCE_MS, PLACE_SEARCH_MIN_CHARACTERS } from '../config/placeSearchConfig'
import { PlaceSearchStatus, type PlaceSuggestions } from '../types/placeSearch'

// What an input shows when there is nothing to search.
const IDLE_SUGGESTIONS: PlaceSuggestions = { places: [], status: PlaceSearchStatus.IDLE }

// Places matching the typed text, searched after a pause in typing; isSearchEnabled is false while the text
// is a picked suggestion, so picking doesn't search for the label again.
export function usePlaceSuggestions(text: string, isSearchEnabled: boolean): PlaceSuggestions {
  const [suggestions, setSuggestions] = useState<PlaceSuggestions>(IDLE_SUGGESTIONS)

  const query = text.trim()
  const shouldSearch = isSearchEnabled && query.length >= PLACE_SEARCH_MIN_CHARACTERS

  useEffect(() => {
    if (!shouldSearch) return

    const abortController = new AbortController()

    // Wait for a pause in typing; a new keystroke runs the cleanup below and starts the wait again.
    const timeoutId = setTimeout(() => {
      // Keep the previous places on screen while the new ones load, so the list doesn't flicker.
      setSuggestions((previous) => ({ places: previous.places, status: PlaceSearchStatus.LOADING }))

      searchPlaces(query, abortController.signal)
        .then((places) => setSuggestions({ places, status: PlaceSearchStatus.READY }))
        .catch((error) => {
          // A newer search replaced this one; its result no longer matters.
          if (axios.isCancel(error)) return

          setSuggestions({ places: [], status: PlaceSearchStatus.FAILED })
        })
    }, PLACE_SEARCH_DEBOUNCE_MS)

    // Runs when the text changes again or the input goes away: stop the wait and the request.
    return () => {
      clearTimeout(timeoutId)
      abortController.abort()
    }
  }, [query, shouldSearch])

  if (!shouldSearch) return IDLE_SUGGESTIONS

  return suggestions
}
