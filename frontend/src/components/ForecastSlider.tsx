import { useEffect, useState } from 'react'
import { formatForecastHourLabel } from '../lib/formatters'
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
}

// Bar at the bottom of the map: play/pause, 0-48 h slider, the time it shows, and the color legend.
export function ForecastSlider({ hour, onHourChange, heatmap, heatmapStatus }: ForecastSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  // Until the heatmap is loaded there is nothing to slide through.
  const isDisabled = heatmap === null
  // The backend sends 49 hours, so the last one is 48.
  const lastHour = heatmap ? heatmap.hours - 1 : 0

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
        <input
          type="range"
          min={0}
          max={lastHour}
          step={1}
          value={hour}
          disabled={isDisabled}
          aria-label="Forecast hour"
          onChange={(event) => onHourChange(Number(event.target.value))}
          className="min-w-0 flex-1 cursor-pointer accent-primary disabled:cursor-default"
        />
        <span className="w-36 shrink-0 text-right whitespace-nowrap">{getStatusLabel(heatmap, heatmapStatus, hour)}</span>
      </div>

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
