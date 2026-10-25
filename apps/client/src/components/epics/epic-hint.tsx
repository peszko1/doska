import { cardDisplayId } from "@doska/contract"
import type { Card } from "@doska/core"
import { cn } from "@doska/ui-kit"
import { Diamond } from "lucide-react"

interface IProps {
  epic: Pick<Card, "number" | "title">
  onOpen: () => void
  className?: string
}

/** One truncated line naming a sub-card's epic; the full text is the tooltip. */
export function EpicHint({ epic, onOpen, className }: IProps) {
  const id = cardDisplayId(epic.number)
  const title = epic.title || "Untitled card"
  const text = id ? `${id} ${title}` : title

  return (
    <button
      type="button"
      title={`Epic: ${text}`}
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      className={cn(
        "flex w-full min-w-0 items-center gap-1 text-left text-xs text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <Diamond className="size-3 shrink-0" />
      <span className="min-w-0 truncate">{text}</span>
    </button>
  )
}
