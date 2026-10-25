import { cn } from "@doska/ui-kit"
import { Check } from "lucide-react"

interface IProps {
  done: boolean
  /** The habit's hue; the tick is drawn in it. */
  hue: number
  /** Future days can't be ticked yet. */
  disabled: boolean
  label: string
  onToggle: () => void
}

/** One day of one habit: a square that fills when the day is ticked. */
export function HabitCheckCell({
  done,
  hue,
  disabled,
  label,
  onToggle,
}: IProps) {
  return (
    <button
      type="button"
      aria-pressed={done}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "flex size-6 items-center justify-center rounded-md border outline-none",
        "transition-[background-color,border-color,scale] duration-150 ease-out active:scale-90",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        "disabled:cursor-default disabled:opacity-35 disabled:active:scale-100",
        !done && "border-input bg-background hover:border-muted-foreground/60"
      )}
      style={
        done
          ? {
              background: `oklch(0.68 0.15 ${hue})`,
              borderColor: `oklch(0.6 0.15 ${hue})`,
            }
          : undefined
      }
    >
      {done && (
        <Check className="size-4 text-white" strokeWidth={3} aria-hidden />
      )}
    </button>
  )
}
