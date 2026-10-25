import type { EpicProgress as Progress } from "@doska/core"
import { cn, useIsMobile } from "@doska/ui-kit"
import { Diamond } from "lucide-react"

/** "◆ 3/5": how many of an epic's sub-cards sit in a done column. */
export function EpicProgress({ done, total }: Progress) {
  const isMobile = useIsMobile()
  const complete = done === total

  return (
    <span
      title={`${done} of ${total} sub-cards done`}
      className={cn(
        "inline-flex items-center gap-1 font-mono text-muted-foreground tabular-nums",
        isMobile ? "text-sm" : "text-xs",
        complete && "text-foreground"
      )}
    >
      <Diamond className={cn("shrink-0", isMobile ? "size-4" : "size-3.5")} />
      {done}/{total}
    </span>
  )
}
