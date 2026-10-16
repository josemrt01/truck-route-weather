import { CloudSunIcon, PauseIcon, PlayIcon, TruckIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PRIMARY_BUTTON_CLASS_NAME, SECONDARY_BUTTON_CLASS_NAME } from '../config/buttonStyles'
import { getTripHourRange, type TripHourRange } from '../lib/dateTime'
import { formatEta, formatForecastTime, formatHourMark, formatHoursFromNow } from '../lib/formatters'
import { HeatmapStatus, type Heatmap } from '../types/heatmap'
import { RiskLegend } from './RiskLegend'

// Milliseconds between steps while playing: 250 ms = 4 forecast hours per second.
const PLAY_STEP_MS = 250

// Hours labeled under the slider, from now to the last forecast hour.
const HOUR_MARKS = [0, 12, 24, 36, 48]

type ForecastSliderProps = {
  // Narrow screens: no title or trip line, and the legend behind a "Risk" button.
  isCompact: boolean
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

// Forecast card: the time shown, play/pause with the 0-48 h slider, the trip's hours and the color legend. App places it: over the map on wide screens, on top of the drawer (compact) on narrow ones.
export function ForecastSlider({
  isCompact,
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
  // Compact card only: whether the color legend is open.
  const [isLegendOpen, setIsLegendOpen] = useState(false)

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

  // The time the map shows, e.g. "Fri 2:00 AM · in 6 hours", or why there is nothing to show yet.
  const forecastTimeLabel = heatmap ? (
    <span className="whitespace-nowrap">
      <span className="font-semibold">{formatForecastTime(heatmap.start_hour_utc, hour)}</span>
      <span className="text-muted-foreground"> · {formatHoursFromNow(hour)}</span>
    </span>
  ) : (
    <span className="font-semibold whitespace-nowrap">
      {heatmapStatus === HeatmapStatus.FAILED ? 'Weather map unavailable' : 'Loading weather…'}
    </span>
  )

  return (
    <div
      className={`flex w-full flex-col rounded-2xl bg-surface text-base shadow-floating-panel ${isCompact ? 'gap-2 p-3' : 'gap-3 p-4'}`}
    >
      {isCompact ? (
        <div className="flex items-center justify-between gap-3">
          {forecastTimeLabel}
          <button
            type="button"
            onClick={() => setIsLegendOpen(!isLegendOpen)}
            aria-expanded={isLegendOpen}
            className={`px-2.5 py-1 text-sm ${SECONDARY_BUTTON_CLASS_NAME}`}
          >
            Risk
          </button>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <span className="flex flex-col">
            <span className="flex items-center gap-2 font-semibold">
              <CloudSunIcon className="size-5 text-primary" aria-hidden="true" />
              Weather forecast
            </span>
            <span className="text-sm text-muted-foreground">Drag or press play to see the weather hour by hour.</span>
          </span>
          <span className="text-right">{forecastTimeLabel}</span>
        </div>
      )}

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

  {!isCompact && heatmap && (
        <span className="flex items-center gap-2">
          <TruckIcon className="size-5 shrink-0 text-primary" aria-hidden="true" />
          {/* A sample of the blue bar under the slider, so it's clear the bar is the trip. */}
          {tripHourRange && <span className="h-1.5 w-5 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
          {getTripLabel(routeName, tripHourRange, departureUtc, arrivalUtc, lastHour)}
        </span>
      )}

      {/* Always on the full card; on the compact card only after "Risk" is pressed. */}
      {(!isCompact || isLegendOpen) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3">
          <span className="font-semibold">Risk</span>
          <RiskLegend />
        </div>
      )}
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
