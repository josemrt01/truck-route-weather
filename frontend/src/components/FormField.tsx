import type { ReactNode } from 'react'

type FormFieldProps = {
  // id of the input or select inside, so clicking the label focuses it.
  id: string
  label: string
  // Message shown under the control; undefined when the field is fine.
  error?: string
  // The input or select itself.
  children: ReactNode
}

export function FormField({ id, label, error, children }: FormFieldProps) {
  return (
    <>
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {children}
      {error && <p className="text-error">{error}</p>}
    </>
  )
}
