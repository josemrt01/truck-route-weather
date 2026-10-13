type PlaceFieldProps = {
  id: string
  label: string
  value: string
  placeholder: string
  // Message shown under the input; undefined when the field is fine.
  error?: string
  onChange: (text: string) => void
}

export function PlaceField({ id, label, value, placeholder, error, onChange }: PlaceFieldProps) {
  return (
    <>
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        // The border turns red while the field has an error.
        className="rounded-md border border-border px-2.5 py-2 aria-[invalid=true]:border-error"
      />
      {error && <p className="text-error">{error}</p>}
    </>
  )
}
