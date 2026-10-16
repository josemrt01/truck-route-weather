import type { ReactNode } from 'react'

type PanelToolbarProps = {
  title: string
  // Buttons on the left (e.g. back) and on the right (e.g. Edit and close); empty when the view has none.
  leftActions?: ReactNode
  rightActions?: ReactNode
}

// The silver bar across the top of the side panel: actions on both sides,
// the view's title in the middle.
export function PanelToolbar({ title, leftActions, rightActions }: PanelToolbarProps) {
  return (
    // Three columns of equal outer width keep the title centered whatever the side buttons are.
    <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-toolbar-edge bg-linear-to-b from-toolbar-top to-toolbar-bottom px-4 py-2.5 inset-shadow-highlight">
      <div className="flex justify-self-start gap-2">{leftActions}</div>
      <h2 className="text-lg font-semibold text-shadow-letterpress">{title}</h2>
      <div className="flex justify-self-end gap-2">{rightActions}</div>
    </div>
  )
}
