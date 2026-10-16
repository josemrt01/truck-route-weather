import { CloudSunIcon, PauseIcon, PlayIcon, TruckIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PRIMARY_BUTTON_CLASS_NAME } from '../config/buttonStyles'
import { getTripHourRange, type TripHourRange } from '../lib/dateTime'
import { formatEta, formatForecastTime, formatHourMark, formatHoursFromNow } from '../lib/formatters'
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
        <div className="flex items-start justify-between gap-3">
          <span className="flex flex-col">
            <span className="flex items-center gap-2 font-semibold">
              <CloudSunIcon className="size-5 text-primary" aria-hidden="true" />
              Weather forecast
            </span>
            <span className="text-sm text-muted-foreground">Drag or press play to see the weather hour by hour.</span>
          </span>
          {/* The time the map shows, e.g. "Fri 2:00 AM · in 6 hours", or why there is nothing to show yet. */}
          {heatmap ? (
            <span className="text-right whitespace-nowrap">
              <span className="font-semibold">{formatForecastTime(heatmap.start_hour_utc, hour)}</span>
              <span className="text-muted-foreground"> · {formatHoursFromNow(hour)}</span>
            </span>
          ) : (
            <span className="font-semibold whitespace-nowrap">
              {heatmapStatus === HeatmapStatus.FAILED ? 'Weather map unavailable' : 'Loading weather…'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePlayClick}
            disabled={isDisabled}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            // "rounded-full!" wins over the shared style's rounded-lg, so this button stays a circle.
            className={`flex size-10 shrink-0 items-center justify-center rounded-full! ${PRIMARY_BUTTON_CLASS_NAME}`}
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
                {/* The slider's thumb center stops half a thumb (~8px) short of each end, so the band uses the same
                    inset area; otherwise the thumb runs ahead of the band. */}
                <div className="absolute inset-x-2 inset-y-0">
                  {/* Placed in percent of the 0-48 h track; positions come from data, so inline style. */}
                  <div
                    className="absolute top-0 h-full min-w-1 rounded-full bg-primary"
                    style={{
                      left: `${(tripHourRange.startHour / lastHour) * 100}%`,
                      width: `${((tripHourRange.endHour - tripHourRange.startHour) / lastHour) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {heatmap && (
              <div className="flex justify-between text-sm text-muted-foreground" aria-hidden="true">
                {HOUR_MARKS.map((hourMark) => (
                  <span key={hourMark}>{formatHourMark(heatmap.start_hour_utc, hourMark)}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {heatmap && (
          <span className="flex items-center gap-2">
            <TruckIcon className="size-5 shrink-0 text-primary" aria-hidden="true" />
            {/* A sample of the blue bar under the slider, so it's clear the bar is the trip. */}
            {tripHourRange && <span className="h-1.5 w-5 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
            {getTripLabel(routeName, tripHourRange, departureUtc, arrivalUtc, lastHour)}
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

// Text next to the truck: when the selected route's trip runs, in local days and times,
// e.g. "Your trip on Option 1: Thu 8:54 PM → Fri 12:30 PM".
function getTripLabel(
  routeName: string,
  tripHourRange: TripHourRange | null,
  departureUtc: string,
  arrivalUtc: string,
  lastHour: number,
): string {
  if (tripHourRange === null) {
    return `Your trip on ${routeName} starts after this ${lastHour}-hour forecast`
  }

  return `Your trip on ${routeName}: ${formatEta(departureUtc)} → ${formatEta(arrivalUtc)}`
}
