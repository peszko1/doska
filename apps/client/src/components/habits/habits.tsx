import { Button, cn } from "@doska/ui-kit"
import type { Habit } from "@doska/core"
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  TriangleAlert,
} from "lucide-react"
import { useState } from "react"
import { PageHeader } from "../app/page-header"
import { CenteredState } from "../digest/centered-state"
import type { HabitActions, HabitStats } from "./habit-actions"
import { HabitNameInput } from "./habit-name-input"
import { HabitsGrid } from "./habits-grid"

interface IProps {
  habits: Habit[]
  stats: (habit: Habit) => HabitStats
  days: string[]
  today: string
  isLoading: boolean
  error: Error | null
  /** Pages of days back from today; 0 ends on today. */
  page: number
  onChangePage: (page: number) => void
  actions: HabitActions
  onCreate: (name: string) => void
  onMove: (habit: Habit, position: string) => void
}

/** The habit tracker: every active habit against the recent days. */
export function Habits({
  habits,
  stats,
  days,
  today,
  isLoading,
  error,
  page,
  onChangePage,
  actions,
  onCreate,
  onMove,
}: IProps) {
  const [showArchived, setShowArchived] = useState(false)
  const active = habits.filter((habit) => habit.archivedAt === null)
  const archived = habits.filter((habit) => habit.archivedAt !== null)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader>
        <h1 className="text-base font-semibold">Habits</h1>
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Earlier days"
            onClick={() => onChangePage(page + 1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={page === 0}
            className="text-muted-foreground"
            onClick={() => onChangePage(0)}
          >
            Today
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Later days"
            disabled={page === 0}
            onClick={() => onChangePage(page - 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8">
        <div className="mx-auto flex w-fit max-w-full flex-col gap-6">
          {error ? (
            <CenteredState
              icon={<TriangleAlert className="size-8 text-destructive" />}
            >
              <p className="max-w-sm text-sm text-muted-foreground">
                Couldn't read your habits. If the app is open in another tab,
                close it and reload.
              </p>
            </CenteredState>
          ) : isLoading ? null : active.length === 0 ? (
            <CenteredState
              icon={<ListChecks className="size-8 text-muted-foreground" />}
            >
              <p className="max-w-sm text-sm text-muted-foreground">
                Add something you want to do every day, then tick it off as you
                go.
              </p>
            </CenteredState>
          ) : (
            <HabitsGrid
              habits={active}
              stats={stats}
              days={days}
              today={today}
              actions={actions}
              onMove={onMove}
            />
          )}

          {!error && (
            <div className="w-full max-w-64">
              <HabitNameInput
                label="New habit"
                placeholder="New habit…"
                onCommit={onCreate}
              />
            </div>
          )}

          {archived.length > 0 && (
            <section className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="ghost"
                aria-expanded={showArchived}
                className="self-start text-muted-foreground"
                onClick={() => setShowArchived((shown) => !shown)}
              >
                <ChevronDown
                  className={cn(
                    "transition-transform",
                    !showArchived && "-rotate-90"
                  )}
                />
                Archived ({archived.length})
              </Button>
              {showArchived && (
                <div className="opacity-70">
                  <HabitsGrid
                    habits={archived}
                    stats={stats}
                    days={days}
                    today={today}
                    actions={actions}
                  />
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
