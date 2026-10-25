import { useMutation, useQueryClient } from "@tanstack/react-query"
import * as api from "../../api/operations"
import { HABIT_CHECKS, HABITS } from "../../api/constants"
import type { Habit, HabitCheck } from "../../types"
import { byPosition, habitCheckId } from "../../utils"
import { keys } from "../keys"
import { flushSyncUpdate } from "./flush-sync"

const habitsKey = keys.habits
const habitsStoreKey = keys.userStore(HABITS)
const checksKey = keys.userStore(HABIT_CHECKS)

type HabitPatch = Parameters<typeof api.updateHabit>[1]

export function useCreateHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.createHabit(name),
    onSettled: () => qc.invalidateQueries({ queryKey: habitsStoreKey }),
  })
}

/**
 * Renames, recolors, reorders or (un)archives a habit. Applied to the cache
 * first and synchronously, so a drag drop doesn't paint the old order for a
 * frame before the refetch.
 */
export function useUpdateHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: HabitPatch }) =>
      api.updateHabit(id, patch),
    onMutate: ({ id, patch }) => {
      const previous = qc.getQueryData<Habit[]>(habitsKey)
      if (previous) {
        const next = previous
          .map((habit) => (habit.id === id ? { ...habit, ...patch } : habit))
          .sort(byPosition)
        flushSyncUpdate(() => qc.setQueryData(habitsKey, next))
      }
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(habitsKey, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: habitsStoreKey }),
  })
}

export function useDeleteHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteHabit(id),
    onSettled: () => qc.invalidateQueries({ queryKey: habitsStoreKey }),
  })
}

/** Ticks or unticks a day, showing it at once in every loaded range. */
export function useSetHabitCheck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      habitId,
      date,
      done,
    }: {
      habitId: string
      date: string
      done: boolean
    }) => api.setHabitCheck(habitId, date, done),
    onMutate: async ({ habitId, date, done }) => {
      await qc.cancelQueries({ queryKey: checksKey })
      const id = habitCheckId(habitId, date)
      qc.setQueriesData<HabitCheck[]>({ queryKey: checksKey }, (checks) => {
        if (!checks) return checks
        const rest = checks.filter((check) => check.id !== id)
        if (!done) return rest
        return [...rest, { id, habitId, date, updatedAt: 0, deletedAt: null }]
      })
    },
    onSettled: () => qc.invalidateQueries({ queryKey: checksKey }),
  })
}
