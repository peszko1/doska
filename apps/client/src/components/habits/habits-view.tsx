import { useEffect, useMemo, useState } from "react"
import {
  addDays,
  currentStreak,
  habitDays,
  todayIso,
  useCreateHabit,
  useDeleteHabit,
  useHabitChecks,
  useHabits,
  useSetHabitCheck,
  useUpdateHabit,
  type Habit,
} from "@doska/core"
import { useIsMobile } from "@doska/ui-kit"
import type { HabitActions, HabitStats } from "./habit-actions"
import { Habits } from "./habits"

/** Four weeks on a wide screen; one on a phone, so it fits without scrolling. */
const WIDE_SPAN = 28
const NARROW_SPAN = 7

/** How far back ticks are read for streaks, past the days on screen. */
const STREAK_LOOKBACK = 366

const NO_TICKS: ReadonlySet<string> = new Set()

/** Today, kept current: the tracker moves on at midnight while it's open. */
function useToday(): string {
  const [today, setToday] = useState(todayIso)
  useEffect(() => {
    const timer = setInterval(() => setToday(todayIso()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return today
}

/** Connects the habit tracker to its data. */
export function HabitsView() {
  const today = useToday()
  const span = useIsMobile() ? NARROW_SPAN : WIDE_SPAN
  const [page, setPage] = useState(0)

  const days = useMemo(
    () => habitDays(addDays(today, -page * span), span),
    [today, page, span]
  )
  const streakFrom = addDays(today, -STREAK_LOOKBACK)
  const from = days[0] < streakFrom ? days[0] : streakFrom

  const { data: habits = [], isPending, error } = useHabits()
  const { data: checks = [] } = useHabitChecks(from, today)

  const byHabit = useMemo(() => {
    const done = new Map<string, Set<string>>()
    for (const check of checks) {
      let dates = done.get(check.habitId)
      if (!dates) done.set(check.habitId, (dates = new Set()))
      dates.add(check.date)
    }
    return done
  }, [checks])

  const stats = (habit: Habit): HabitStats => {
    const done = byHabit.get(habit.id) ?? NO_TICKS
    return { done, streak: currentStreak(done, today) }
  }

  const { mutate: create } = useCreateHabit()
  const { mutate: update } = useUpdateHabit()
  const { mutate: remove } = useDeleteHabit()
  const { mutate: setCheck } = useSetHabitCheck()

  const actions: HabitActions = {
    onToggle: (habit, date, done) =>
      setCheck({ habitId: habit.id, date, done }),
    onRename: (habit, name) => update({ id: habit.id, patch: { name } }),
    onRecolor: (habit, color) => update({ id: habit.id, patch: { color } }),
    onArchive: (habit, archived) =>
      update({
        id: habit.id,
        patch: { archivedAt: archived ? Date.now() : null },
      }),
    onDelete: (habit) => remove(habit.id),
  }

  return (
    <Habits
      habits={habits}
      stats={stats}
      days={days}
      today={today}
      isLoading={isPending}
      error={error}
      page={page}
      onChangePage={setPage}
      actions={actions}
      onCreate={(name) => create(name)}
      onMove={(habit, position) =>
        update({ id: habit.id, patch: { position } })
      }
    />
  )
}
