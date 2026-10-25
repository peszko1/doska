import { columnHue } from "@doska/tokens"
import { Hash, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "./lib/cn"

interface IProps {
  label: string
  className?: string
  icon?: LucideIcon
  /** Palette id, as on columns; empty keeps the default primary tint. */
  color?: string
  children?: ReactNode
}

export function TagChip({
  label,
  className,
  icon: Icon = Hash,
  color = "",
  children,
}: IProps) {
  const hue = columnHue(color)

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-[0.5rem] px-1.5 py-[1px] text-[13px]",
        "bg-primary/10 text-card-foreground border border-primary/10",
        className
      )}
      style={
        hue === null
          ? undefined
          : {
              background: `oklch(0.72 0.14 ${hue} / 0.16)`,
              borderColor: `oklch(0.62 0.15 ${hue} / 0.3)`,
            }
      }
    >
      <Icon
        className="size-3.5 shrink-0 stroke-[2.5] text-primary mt-[1px]"
        style={hue === null ? undefined : { color: `oklch(0.62 0.15 ${hue})` }}
      />
      <span className="truncate leading-4.5">{label}</span>
      {children}
    </span>
  )
}
