import { CloudSunIcon, PauseIcon, PlayIcon, TruckIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getTripHourRange, type TripHourRange } from '../lib/dateTime'
import { formatForecastHourLabel, formatHourOffset } from '../lib/formatters'
import { HeatmapStatus, type Heatmap } from '../types/heatmap'
import { RiskLegend } from './RiskLegend'

// Milliseconds between steps while playing: 250 ms = 4 forecast hours per second.
const PLAY_STEP_MS = 250

// Hours labeled under the slider, from now to the last forecast hour.
const HOUR_MARKS = [0, 12, 24, 36, 48]

type ForecastSliderProps = {
  // Forecast hour the heatmap shows: 0 = now, up to 48.
  hour: number
  onHourChange: (hour: number) => void
  // Called when the user presses play or drags the slider; App then shows the truck on the map.
  onUse: () => void
  // null while loading or after a failure; the slider is disabled then.
  heatmap: Heatmap | null
  heatmapStatus: HeatmapStatus | null
  // The selected route's trip, marked as a band under the slider: its name, departure and arrival (ISO, UTC).
  routeName: string
  departureUtc: string
  arrivalUtc: string
}

// Card at the bottom of the map: title and the time shown, play/pause with the 0-48 h slider, the trip's hours,
// and the color legend.
export function ForecastSlider({
  hour,
  onHourChange,
  onUse,
  heatmap,
  heatmapStatus,
  routeName,
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
    onUse()

    // Play at the end starts over from now.
    if (!isPlaying && hour >= lastHour) {
      onHourChange(0)
    }
    setIsPlaying(!isPlaying)
  }

  return (
    // Centered over the map, clear of the side panel (28rem) and high enough to leave MapLibre's credits visible.
    <div className="pointer-events-none absolute inset-x-3 bottom-10 flex justify-center md:right-6 md:left-[29.5rem]">
      <div className="pointer-events-auto flex w-full max-w-2xl flex-col gap-3 rounded-2xl bg-surface p-4 text-base shadow-floating-panel">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-semibold">
            <CloudSunIcon className="size-5 text-primary" aria-hidden="true" />
            Weather forecast
          </span>
          {/* The time the map shows, e.g. "+6h · Thu 2:00 PM", or why there is nothing to show. */}
          <span className="font-semibold whitespace-nowrap">{getStatusLabel(heatmap, heatmapStatus, hour)}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePlayClick}
            disabled={isDisabled}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-surface disabled:cursor-default disabled:opacity-50"
          >
            {isPlaying ? <PauseIcon className="size-5" /> : <PlayIcon className="ml-0.5 size-5" />}
          </button>

          {/* The slider, the band showing the trip's hours, and the hour marks, all the same width. */}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <input
              type="range"
              min={0}
              max={lastHour}
              step={1}
              value={hour}
              disabled={isDisabled}
              aria-label="Forecast hour"
              onChange={(event) => {
                onUse()
                onHourChange(Number(event.target.value))
              }}
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
            <div className="flex justify-between text-sm text-muted-foreground" aria-hidden="true">
              {HOUR_MARKS.map((hourMark) => (
                <span key={hourMark}>{hourMark === 0 ? 'Now' : `+${hourMark}h`}</span>
              ))}
            </div>
          </div>
        </div>

        {heatmap && (
          <span className="flex items-center gap-2">
            <TruckIcon className="size-5 shrink-0 text-primary" aria-hidden="true" />
            {getTripLabel(routeName, tripHourRange, lastHour)}
          </span>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3">
          <span className="font-semibold">Risk</span>
          <RiskLegend />
        </div>
      </div>
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

// Text under the slider saying when the selected route's truck is on the road, e.g. "Option 1 on the road: +0h → +3.5h".
function getTripLabel(routeName: string, tripHourRange: TripHourRange | null, lastHour: number): string {
  if (tripHourRange === null) {
    return `${routeName} starts after +${lastHour}h`
  }

  return `${routeName} on the road: ${formatHourOffset(tripHourRange.startHour)} → ${formatHourOffset(tripHourRange.endHour)}`
}
