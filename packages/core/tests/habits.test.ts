import { beforeEach, describe, expect, it } from "vitest"
import {
  createHabit,
  deleteHabit,
  getHabitChecks,
  getHabits,
  setHabitCheck,
  updateHabit,
} from "../src/api/operations/habits"
import { currentStreak, habitDays } from "../src/utils/habit-days"
import { keyBetween } from "../src/utils/position"
import { installMemoryRuntime } from "./memory-runtime"

beforeEach(installMemoryRuntime)

describe("habitDays", () => {
  it("lists the days ending on the last, oldest first, across a month", () => {
    expect(habitDays("2026-11-02", 4)).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ])
  })
})

describe("currentStreak", () => {
  const done = new Set(["2026-10-22", "2026-10-23", "2026-10-24"])

  it("counts back from today when today is ticked", () => {
    expect(currentStreak(new Set([...done, "2026-10-25"]), "2026-10-25")).toBe(
      4
    )
  })

  it("keeps yesterday's streak while today is still open", () => {
    expect(currentStreak(done, "2026-10-25")).toBe(3)
  })

  it("is broken by a missed day", () => {
    expect(currentStreak(done, "2026-10-26")).toBe(0)
  })
})

describe("habits", () => {
  it("appends new habits and reorders by position", async () => {
    const guitar = await createHabit("Guitar")
    const run = await createHabit("Run")
    expect((await getHabits()).map((h) => h.name)).toEqual(["Guitar", "Run"])

    await updateHabit(run.id, { position: keyBetween(undefined, guitar)! })
    expect((await getHabits()).map((h) => h.name)).toEqual(["Run", "Guitar"])
  })

  it("hides a deleted habit and won't edit it back to life", async () => {
    const habit = await createHabit("Read")
    await deleteHabit(habit.id)
    await updateHabit(habit.id, { name: "Read more" })
    expect(await getHabits()).toEqual([])
  })

  it("ticks, unticks and re-ticks a day under one record", async () => {
    const habit = await createHabit("Guitar")
    await setHabitCheck(habit.id, "2026-10-25", true)
    await setHabitCheck(habit.id, "2026-10-20", true)
    expect(
      (await getHabitChecks("2026-10-21", "2026-10-31")).map((c) => c.date)
    ).toEqual(["2026-10-25"])

    await setHabitCheck(habit.id, "2026-10-25", false)
    expect(await getHabitChecks("2026-10-25", "2026-10-25")).toEqual([])

    await setHabitCheck(habit.id, "2026-10-25", true)
    expect(await getHabitChecks("2026-10-25", "2026-10-25")).toEqual([
      expect.objectContaining({
        id: `${habit.id}:2026-10-25`,
        deletedAt: null,
      }),
    ])
  })
})
