import { cn, columnHue, longDate } from "@doska/ui-kit"
import type { Habit } from "@doska/core"
import { Flame } from "lucide-react"
import { useState, type HTMLAttributes } from "react"
import { HabitCheckCell } from "./habit-check-cell"
import type { HabitActions, HabitStats } from "./habit-actions"
import { HabitMenu } from "./habit-menu"
import { HabitNameInput } from "./habit-name-input"

/** Green, when a habit has no color of its own. */
const DEFAULT_HUE = 145

interface IProps {
  habit: Habit
  stats: HabitStats
  days: string[]
  today: string
  gridTemplateColumns: string
  actions: HabitActions
  /** Spread on the name, so the row drags by it. */
  dragHandleProps?: HTMLAttributes<HTMLElement> | null
  isDragging?: boolean
}

/** One habit: its name, streak and menu, then a tick box per day. */
export function HabitRow({
  habit,
  stats,
  days,
  today,
  gridTemplateColumns,
  actions,
  dragHandleProps,
  isDragging,
}: IProps) {
  const [renaming, setRenaming] = useState(false)
  const hue = columnHue(habit.color) ?? DEFAULT_HUE
  const inRange = days.filter((day) => stats.done.has(day)).length

  return (
    <div
      className={cn(
        "group/habit grid items-center border-t border-border/60 bg-background",
        isDragging && "rounded-md shadow-md"
      )}
      style={{ gridTemplateColumns }}
    >
      <div className="flex min-w-0 items-center gap-1 py-1.5 pr-1.5">
        {renaming ? (
          <HabitNameInput
            value={habit.name}
            label="Habit name"
            autoFocus
            onCommit={(name) => actions.onRename(habit, name)}
            onDone={() => setRenaming(false)}
          />
        ) : (
          <>
            <span
              {...dragHandleProps}
              className="min-w-0 cursor-grab truncate text-sm"
              title={habit.name}
            >
              {habit.name}
            </span>
            {stats.streak > 0 && (
              <span
                className="flex shrink-0 items-center gap-0.5 rounded-full px-1.5 text-[11px] font-medium tabular-nums"
                style={{
                  background: `oklch(0.68 0.15 ${hue} / 0.14)`,
                  color: `oklch(0.55 0.15 ${hue})`,
                }}
                title={`${stats.streak}-day streak`}
              >
                <Flame className="size-3" aria-hidden />
                {stats.streak}
              </span>
            )}
            <span
              className="shrink-0 text-[11px] text-muted-foreground tabular-nums max-md:hidden"
              title={`${inRange} of ${days.length} days shown`}
            >
              {inRange}/{days.length}
            </span>
            <span className="ml-auto">
              <HabitMenu
                habit={habit}
                onRename={() => setRenaming(true)}
                onRecolor={(color) => actions.onRecolor(habit, color)}
                onArchive={(archived) => actions.onArchive(habit, archived)}
                onDelete={() => actions.onDelete(habit)}
              />
            </span>
          </>
        )}
      </div>
      {days.map((day) => {
        const done = stats.done.has(day)
        return (
          <div
            key={day}
            className={cn(
              "flex justify-center py-1.5",
              day === today && "bg-accent"
            )}
          >
            <HabitCheckCell
              done={done}
              hue={hue}
              disabled={day > today}
              label={`${habit.name}, ${longDate(day)}`}
              onToggle={() => actions.onToggle(habit, day, !done)}
            />
          </div>
        )
      })}
    </div>
  )
}
