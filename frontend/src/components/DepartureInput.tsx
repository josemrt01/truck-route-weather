import { CalendarIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TOGGLE_OPTION_CLASS_NAME } from '../config/formStyles'
import {
  areInSameMonth,
  getAvailableTime,
  getDateFromDayValue,
  getDayValue,
  getDepartureDays,
  getDepartureTimes,
  getFirstDepartureSelection,
} from '../lib/departureOptions'
import { DepartureMode, type DepartureChoice } from '../types/departure'

type DepartureInputProps = {
  // id for the FormField label.
  id: string
  choice: DepartureChoice
  isInvalid: boolean
  onChoiceChange: (choice: DepartureChoice) => void
}

export function DepartureInput({ id, choice, isInvalid, onChoiceChange }: DepartureInputProps) {
  // The moment the day and time lists are built from; refreshed each time "Depart at" is pressed,
  // so a page left open for hours doesn't offer times that are already past.
  const [optionsNow, setOptionsNow] = useState(() => new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const days = getDepartureDays(optionsNow)
  const times = getDepartureTimes(choice.dayValue, optionsNow)

  // Days the calendar lets the user pick; every other day is greyed out.
  const allowedDayValues: string[] = []
  for (const day of days) {
    allowedDayValues.push(day.value)
  }

  const firstAllowedDayValue = allowedDayValues[0]
  const lastAllowedDayValue = allowedDayValues[allowedDayValues.length - 1]

  // Text on the date button: "Today", "Tomorrow" or "Sat, Oct 17".
  let selectedDayLabel = choice.dayValue
  for (const day of days) {
    if (day.value === choice.dayValue) {
      selectedDayLabel = day.label
    }
  }

  function handleModeChange(pressedValues: string[]) {
    // Pressing the button that is already on would leave none pressed; keep the current mode then.
    if (pressedValues.length === 0) return

    if (pressedValues[0] === DepartureMode.NOW) {
      onChoiceChange({ ...choice, mode: DepartureMode.NOW })
      return
    }

    // Start "Depart at" from the next free slot, using the time right now.
    const now = new Date()
    setOptionsNow(now)
    onChoiceChange({ mode: DepartureMode.AT, ...getFirstDepartureSelection(now) })
  }

  function handleDateSelect(date: Date) {
    const dayValue = getDayValue(date)
    onChoiceChange({ ...choice, dayValue, timeValue: getAvailableTime(dayValue, choice.timeValue, optionsNow) })
    setIsCalendarOpen(false)
  }

  function handleTimeChange(timeValue: string | null) {
    if (timeValue === null) return

    onChoiceChange({ ...choice, timeValue })
  }

  return (
    <div className="flex flex-col gap-2">
      <ToggleGroup
        id={id}
        aria-label="Departure"
        variant="outline"
        value={[choice.mode]}
        onValueChange={handleModeChange}
        className="w-full"
      >
        <ToggleGroupItem value={DepartureMode.NOW} className={TOGGLE_OPTION_CLASS_NAME}>
          Leave now
        </ToggleGroupItem>
        <ToggleGroupItem value={DepartureMode.AT} className={TOGGLE_OPTION_CLASS_NAME}>
          Depart at
        </ToggleGroupItem>
      </ToggleGroup>

      {choice.mode === DepartureMode.AT && (
        <div className="flex gap-2">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger
              render={<Button variant="outline" aria-label="Departure day" className="h-10 flex-1 justify-between text-base" />}
            >
              {selectedDayLabel}
              <CalendarIcon className="text-muted-foreground" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                // Bigger day cells and text than shadcn's default, to match the panel's 16 px text.
                className="text-base [--cell-size:--spacing(9)]"
                mode="single"
                // The day can be changed but never cleared.
                required
                selected={getDateFromDayValue(choice.dayValue)}
                onSelect={handleDateSelect}
                defaultMonth={getDateFromDayValue(choice.dayValue)}
                // The arrows only move between the months the allowed days fall in,
                // and are hidden when those days are all in one month.
                startMonth={getDateFromDayValue(firstAllowedDayValue)}
                endMonth={getDateFromDayValue(lastAllowedDayValue)}
                hideNavigation={areInSameMonth(firstAllowedDayValue, lastAllowedDayValue)}
                disabled={(date) => !allowedDayValues.includes(getDayValue(date))}
              />
            </PopoverContent>
          </Popover>

          <Select items={times} value={choice.timeValue} onValueChange={handleTimeChange}>
            <SelectTrigger aria-label="Departure time" aria-invalid={isInvalid} className="flex-1 text-base data-[size=default]:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {times.map((time) => (
                <SelectItem key={time.value} value={time.value} className="text-base">
                  {time.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
