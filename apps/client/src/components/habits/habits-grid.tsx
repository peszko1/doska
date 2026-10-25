import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd"
import { type Habit, keyBetween } from "@doska/core"
import { useIsMobile } from "@doska/ui-kit"
import { useLayoutEffect, useRef } from "react"
import type { HabitActions, HabitStats } from "./habit-actions"
import { HabitDaysHeader } from "./habit-days-header"
import { HabitRow } from "./habit-row"

interface IProps {
  habits: Habit[]
  stats: (habit: Habit) => HabitStats
  days: string[]
  today: string
  actions: HabitActions
  /** Absent for a list that doesn't reorder, like the archived habits. */
  onMove?: (habit: Habit, position: string) => void
}

/** Habits as rows and days as columns, reordered by dragging a habit's name. */
export function HabitsGrid({
  habits,
  stats,
  days,
  today,
  actions,
  onMove,
}: IProps) {
  const isMobile = useIsMobile()
  const scroller = useRef<HTMLDivElement>(null)

  // Too narrow even at the smallest cells, the newest days are the ones to
  // show: today sits last.
  const lastDay = days.at(-1)
  useLayoutEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [lastDay])
  // Phones get a narrower name column so a week fits without scrolling.
  const name = isMobile ? "minmax(6.5rem, 1fr)" : "minmax(8rem, 16rem)"
  const gridTemplateColumns = `${name} repeat(${days.length}, minmax(1.5rem, 2rem))`

  function handleDragEnd({ source, destination }: DropResult) {
    if (!onMove || !destination || destination.index === source.index) return
    const moved = habits[source.index]
    if (!moved) return
    const rest = habits.filter((habit) => habit.id !== moved.id)
    const position = keyBetween(
      rest[destination.index - 1],
      rest[destination.index]
    )
    if (position) onMove(moved, position)
  }

  return (
    <div ref={scroller} className="overflow-x-auto">
      <div className="min-w-min">
        <HabitDaysHeader
          days={days}
          today={today}
          gridTemplateColumns={gridTemplateColumns}
        />
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="habits" isDropDisabled={!onMove}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {habits.map((habit, index) => (
                  <Draggable
                    key={habit.id}
                    draggableId={habit.id}
                    index={index}
                    isDragDisabled={!onMove}
                  >
                    {(drag, snapshot) => (
                      <div ref={drag.innerRef} {...drag.draggableProps}>
                        <HabitRow
                          habit={habit}
                          stats={stats(habit)}
                          days={days}
                          today={today}
                          gridTemplateColumns={gridTemplateColumns}
                          actions={actions}
                          dragHandleProps={onMove ? drag.dragHandleProps : null}
                          isDragging={snapshot.isDragging}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  )
}
