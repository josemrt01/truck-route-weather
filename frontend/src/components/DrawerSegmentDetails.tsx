import { Drawer } from '@base-ui/react/drawer'
import { ChevronLeftIcon } from 'lucide-react'
import { SECONDARY_BUTTON_CLASS_NAME } from '../config/buttonStyles'
import type { Checkpoint } from '../types/tripPlan'
import { PanelToolbar } from './PanelToolbar'
import { SegmentDetails } from './SegmentDetails'

type DrawerSegmentDetailsProps = {
  // The checkpoints at both ends of the tapped segment.
  start: Checkpoint
  end: Checkpoint
  // "‹ Routes": App clears the segment and the route cards show again.
  onBack: () => void
}

// The tapped segment's details inside the drawer (narrow screens), in a white card under the panel's toolbar.
export function DrawerSegmentDetails({ start, end, onBack }: DrawerSegmentDetailsProps) {
  return (
    <>
      <PanelToolbar
        title="Segment"
        isFlat
        leftActions={
          <button
            type="button"
            onClick={onBack}
            className={`flex items-center gap-0.5 py-1.5 pr-3 pl-2 ${SECONDARY_BUTTON_CLASS_NAME}`}
          >
            <ChevronLeftIcon className="size-4" />
            Routes
          </button>
        }
      />
      <Drawer.Content className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-auto p-4">
        <div className="rounded-xl bg-surface p-4 shadow-card ring-1 ring-border">
          <SegmentDetails start={start} end={end} />
        </div>
      </Drawer.Content>
    </>
  )
}
