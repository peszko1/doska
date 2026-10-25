import { addDays } from "@doska/utils"

/**
 * A habit tracker's days are `YYYY-MM-DD` strings in the account's own
 * calendar, like card deadlines — so a tick made just before midnight stays on
 * that day whichever timezone the next device is in.
 */

/** The `length` days ending on `last`, oldest first. */
export function habitDays(last: string, length: number): string[] {
  return Array.from({ length }, (_, index) => addDays(last, index - length + 1))
}

/**
 * Consecutive ticked days ending today. Today not being ticked yet doesn't
 * break the streak — the day isn't over — so it then counts back from
 * yesterday instead.
 */
export function currentStreak(
  done: ReadonlySet<string>,
  today: string
): number {
  let day = done.has(today) ? today : addDays(today, -1)
  let streak = 0
  while (done.has(day)) {
    streak += 1
    day = addDays(day, -1)
  }
  return streak
}

/** The id of one habit's tick on one day: the same on every device. */
export const habitCheckId = (habitId: string, date: string) =>
  `${habitId}:${date}`
