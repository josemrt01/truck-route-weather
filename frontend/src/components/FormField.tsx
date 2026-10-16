import type { ReactNode } from 'react'

type FormFieldProps = {
  // id of the input or select inside, so clicking the label focuses it.
  id: string
  label: string
  // Shows a red * after the label; the input itself sets aria-required for screen readers.
  isRequired?: boolean
  // Message shown under the control; undefined when the field is fine.
  error?: string
  // The input or select itself.
  children: ReactNode
}

export function FormField({ id, label, isRequired = false, error, children }: FormFieldProps) {
  return (
    <>
      <label htmlFor={id} className="font-semibold">
        {label}
        {/* Hidden from screen readers, which hear "required" from aria-required instead of "star". */}
        {isRequired && (
          <span aria-hidden="true" className="text-error">
            {' *'}
          </span>
        )}
      </label>
      {children}
      {error && <p className="text-error">{error}</p>}
    </>
  )
}
