import type { Habit } from "@doska/core"

/** Everything a habit row can do to its habit. */
export interface HabitActions {
  onToggle: (habit: Habit, date: string, done: boolean) => void
  onRename: (habit: Habit, name: string) => void
  onRecolor: (habit: Habit, color: string) => void
  onArchive: (habit: Habit, archived: boolean) => void
  onDelete: (habit: Habit) => void
}

/** One habit with what the visible range shows of it. */
export interface HabitStats {
  /** Ticked days, within the range read. */
  done: ReadonlySet<string>
  streak: number
}
