import type { ReactNode } from 'react'

type PanelToolbarProps = {
  title: string
  // Buttons on the left (e.g. back) and on the right (e.g. Edit and close); empty when the view has none.
  leftActions?: ReactNode
  rightActions?: ReactNode
  // In the drawer: no silver gradient, just the drawer's own gray, so the bar joins the handle strip above it
  // without a visible edge.
  isFlat?: boolean
}

// The bar across the top of the panel: actions on both sides, the view's title in the middle.
// Silver in the side panel; flat in the drawer.
export function PanelToolbar({ title, leftActions, rightActions, isFlat = false }: PanelToolbarProps) {
  const backgroundClassName = isFlat
    ? 'bg-panel'
    : 'bg-linear-to-b from-toolbar-top to-toolbar-bottom inset-shadow-highlight'

  return (
    // Three columns of equal outer width keep the title centered whatever the side buttons are.
    <div
      className={`grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-toolbar-edge px-4 py-2.5 ${backgroundClassName}`}
    >
      <div className="flex justify-self-start gap-2">{leftActions}</div>
      <h2 className="text-lg font-semibold text-shadow-letterpress">{title}</h2>
      <div className="flex justify-self-end gap-2">{rightActions}</div>
    </div>
  )
}
