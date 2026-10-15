import { useEffect, useState } from 'react'
import { getTripHourRange, type TripHourRange } from '../lib/dateTime'
import { formatForecastHourLabel, formatHourOffset } from '../lib/formatters'
import { HeatmapStatus, type Heatmap } from '../types/heatmap'
import { RiskLegend } from './RiskLegend'

// Milliseconds between steps while playing: 250 ms = 4 forecast hours per second.
const PLAY_STEP_MS = 250

type ForecastSliderProps = {
  // Forecast hour the heatmap shows: 0 = now, up to 48.
  hour: number
  onHourChange: (hour: number) => void
  // null while loading or after a failure; the slider is disabled then.
  heatmap: Heatmap | null
  heatmapStatus: HeatmapStatus | null
  // The selected route's trip, marked as a band under the slider: its id, departure and arrival (ISO, UTC).
  routeId: string
  departureUtc: string
  arrivalUtc: string
}

// Bar at the bottom of the map: play/pause, 0-48 h slider, the time it shows, and the color legend.
export function ForecastSlider({
  hour,
  onHourChange,
  heatmap,
  heatmapStatus,
  routeId,
  departureUtc,
  arrivalUtc,
}: ForecastSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  // Until the heatmap is loaded there is nothing to slide through.
  const isDisabled = heatmap === null
  // The backend sends 49 hours, so the last one is 48.
  const lastHour = heatmap ? heatmap.hours - 1 : 0
  // Which hours of the slider the truck is on the road; null before the heatmap or when the trip starts later.
  const tripHourRange = heatmap ? getTripHourRange(heatmap.start_hour_utc, departureUtc, arrivalUtc, lastHour) : null

  // While playing: wait one step, then move one hour forward; stop at the last hour.
  // Every new hour runs this again, like scheduling the next tick in Java.
  useEffect(() => {
    if (!isPlaying || isDisabled) return

    const timeoutId = window.setTimeout(() => {
      if (hour >= lastHour) {
        setIsPlaying(false)
      } else {
        onHourChange(hour + 1)
      }
    }, PLAY_STEP_MS)

    // Cancel the pending step if the user pauses or drags the slider first.
    return () => window.clearTimeout(timeoutId)
  }, [isPlaying, isDisabled, hour, lastHour, onHourChange])

  function handlePlayClick() {
    // Play at the end starts over from now.
    if (!isPlaying && hour >= lastHour) {
      onHourChange(0)
    }
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="absolute right-3 bottom-8 left-3 flex flex-col gap-1.5 rounded-md bg-surface p-2 text-sm shadow-floating-panel md:left-auto md:w-[26rem]">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePlayClick}
          disabled={isDisabled}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="w-8 shrink-0 cursor-pointer rounded-md bg-primary py-1 text-surface disabled:cursor-default disabled:opacity-50"
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
        {/* The slider and, right under it with the same width, the band showing the trip's hours. */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <input
            type="range"
            min={0}
            max={lastHour}
            step={1}
            value={hour}
            disabled={isDisabled}
            aria-label="Forecast hour"
            onChange={(event) => onHourChange(Number(event.target.value))}
            className="w-full cursor-pointer accent-primary disabled:cursor-default"
          />
          {tripHourRange && (
            <div className="relative h-1.5 rounded-full bg-border" aria-hidden="true">
              {/* Placed in percent of the 0-48 h track; positions come from data, so inline style. */}
              <div
                className="absolute top-0 h-full min-w-1 rounded-full bg-primary"
                style={{
                  left: `${(tripHourRange.startHour / lastHour) * 100}%`,
                  width: `${((tripHourRange.endHour - tripHourRange.startHour) / lastHour) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
        <span className="w-36 shrink-0 text-right whitespace-nowrap">{getStatusLabel(heatmap, heatmapStatus, hour)}</span>
      </div>

      {heatmap && (
        <span className="text-xs text-muted">
          {getTripLabel(routeId, tripHourRange, lastHour)}
        </span>
      )}

      <RiskLegend />
    </div>
  )
}

// What the label next to the slider says: the time shown, or why there is nothing to show.
function getStatusLabel(heatmap: Heatmap | null, heatmapStatus: HeatmapStatus | null, hour: number): string {
  if (heatmapStatus === HeatmapStatus.FAILED) {
    return 'Weather map unavailable'
  }
  if (heatmap === null) {
    return 'Loading weather…'
  }

  return formatForecastHourLabel(heatmap.start_hour_utc, hour)
}

// Text under the slider saying when the selected route's truck is on the road, e.g. "Route A on the road: +0h → +3.5h".
function getTripLabel(routeId: string, tripHourRange: TripHourRange | null, lastHour: number): string {
  if (tripHourRange === null) {
    return `Route ${routeId} starts after +${lastHour}h`
  }

  return `Route ${routeId} on the road: ${formatHourOffset(tripHourRange.startHour)} → ${formatHourOffset(tripHourRange.endHour)}`
}
