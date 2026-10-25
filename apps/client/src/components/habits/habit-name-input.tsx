import { cn } from "@doska/ui-kit"
import { useState } from "react"

interface IProps {
  /** The current name when renaming; empty for a new habit. */
  value?: string
  label: string
  placeholder?: string
  /** Renaming: the input stays only until it commits or is dismissed. */
  autoFocus?: boolean
  onCommit: (name: string) => void
  onDone?: () => void
  className?: string
}

/**
 * A habit's name, typed in place. Renaming commits on blur; adding keeps the
 * input open and empties it, so several habits go in one after another.
 */
export function HabitNameInput({
  value = "",
  label,
  placeholder,
  autoFocus,
  onCommit,
  onDone,
  className,
}: IProps) {
  const [draft, setDraft] = useState(value)

  function commit() {
    const next = draft.trim()
    if (next && next !== value) onCommit(next)
    if (onDone) onDone()
    else setDraft("")
  }

  return (
    <input
      value={draft}
      autoFocus={autoFocus}
      autoComplete="off"
      spellCheck={false}
      aria-label={label}
      placeholder={placeholder}
      maxLength={100}
      onFocus={(e) => autoFocus && e.target.select()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onDone && commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit()
        if (e.key === "Escape") {
          if (onDone) onDone()
          else setDraft("")
        }
      }}
      className={cn(
        "h-8 w-full min-w-0 rounded-md bg-muted/60 px-2 text-base outline-none placeholder:text-muted-foreground sm:text-sm",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
    />
  )
}
