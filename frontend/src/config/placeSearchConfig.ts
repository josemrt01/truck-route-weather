// Milliseconds to wait after the last keystroke before searching, so each key doesn't cost a GraphHopper credit;
// used by usePlaceSuggestions.
export const PLACE_SEARCH_DEBOUNCE_MS = 300

// Fewest characters worth searching; must match PLACE_SEARCH_MIN_CHARACTERS in the backend; used by usePlaceSuggestions.
export const PLACE_SEARCH_MIN_CHARACTERS = 3
