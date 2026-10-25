import type { Habit, HabitCheck } from "../../types"
import { byPosition, habitCheckId, keyBetween } from "../../utils"
import { runtime } from "../../runtime"
import { HABIT_CHECKS, HABIT_CHECKS_BY_DATE, HABITS } from "../constants"
import { live } from "./live"
import { newId } from "./new-id"
import {
  deleteUserRecord,
  getUserRecord,
  getUserRecords,
  putUserRecord,
} from "./user-records"

/** Every live habit, archived ones included, in tracker order. */
export async function getHabits(): Promise<Habit[]> {
  return (await getUserRecords(HABITS)).sort(byPosition)
}

/** Live ticks dated within `[from, to]` (inclusive `YYYY-MM-DD` bounds). */
export async function getHabitChecks(
  from: string,
  to: string
): Promise<HabitCheck[]> {
  const checks = await runtime().db.getAll<HabitCheck>(HABIT_CHECKS, {
    index: HABIT_CHECKS_BY_DATE,
    range: { lower: from, upper: to },
  })
  return checks.filter(live)
}

/** A new habit, at the end of the list. */
export async function createHabit(name: string): Promise<Habit> {
  const habits = await getHabits()
  return putUserRecord(HABITS, {
    id: newId("habit"),
    name,
    color: "",
    position: keyBetween(habits.at(-1)) ?? "a0",
    archivedAt: null,
    deletedAt: null,
  })
}

/** Applies `patch` to a live habit; a missing or deleted one is left alone. */
export async function updateHabit(
  id: string,
  patch: Partial<Pick<Habit, "name" | "color" | "position" | "archivedAt">>
): Promise<void> {
  const habit = await getUserRecord(HABITS, id)
  if (!habit || habit.deletedAt !== null) return
  await putUserRecord(HABITS, { ...habit, ...patch })
}

/** Tombstones the habit. Its ticks are left be: nothing shows a tick without
 * its live habit. */
export function deleteHabit(id: string): Promise<void> {
  return deleteUserRecord(HABITS, id)
}

/** Ticks or unticks one day. Re-ticking revives the day's tombstone. */
export async function setHabitCheck(
  habitId: string,
  date: string,
  done: boolean
): Promise<void> {
  const id = habitCheckId(habitId, date)
  if (!done) return deleteUserRecord(HABIT_CHECKS, id)
  await putUserRecord(HABIT_CHECKS, { id, habitId, date, deletedAt: null })
}
