import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

interface UnitToggleProps<T extends string> {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  ariaLabel: string
}

export function UnitToggle<T extends string>({ value, onChange, options, ariaLabel }: UnitToggleProps<T>) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as T)
      }}
      variant="outline"
      size="sm"
      spacing={0}
      aria-label={ariaLabel}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-3"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
