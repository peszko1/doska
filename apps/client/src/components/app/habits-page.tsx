import { useEffect } from "react"
import { HabitsView } from "@/components/habits/habits-view"
import { sync } from "@doska/core"
import { AppShell } from "./app-shell"

const NO_DECK = { id: "", sort: [] }

/** The habit tracker, at `/habits`. */
export function HabitsPage() {
  useEffect(() => {
    sync.setActiveBoard(null)
  }, [])

  return (
    <AppShell deck={NO_DECK}>
      <HabitsView />
    </AppShell>
  )
}
