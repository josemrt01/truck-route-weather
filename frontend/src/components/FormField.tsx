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
  // A small gap inside one field (label, control, message); the form puts a bigger gap between fields.
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel id={id} label={label} isRequired={isRequired} />
      {children}
      {error && <FieldError message={error} />}
    </div>
  )
}

type FieldLabelProps = {
  id: string
  label: string
  isRequired: boolean
  // Extra Tailwind classes, e.g. a grid position.
  className?: string
}

// A field's label with the red * for required fields; used by FormField and TripEndpointFields.
export function FieldLabel({ id, label, isRequired, className = '' }: FieldLabelProps) {
  return (
    <label htmlFor={id} className={`font-semibold ${className}`}>
      {label}
      {/* Hidden from screen readers, which hear "required" from aria-required instead of "star". */}
      {isRequired && (
        <span aria-hidden="true" className="text-error">
          {' *'}
        </span>
      )}
    </label>
  )
}

type FieldErrorProps = {
  message: string
  // Extra Tailwind classes, e.g. a grid position.
  className?: string
}

// The red message under a field; used by FormField and TripEndpointFields.
export function FieldError({ message, className = '' }: FieldErrorProps) {
  return <p className={`text-error ${className}`}>{message}</p>
}
