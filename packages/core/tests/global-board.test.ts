import { describe, expect, it } from "vitest"
import type { Card, Column, Dashboard } from "../src/types"
import {
  boardStages,
  globalLanes,
  laneOrder,
  placeInColumn,
  planGlobalDrop,
  stageColumn,
  type GlobalCard,
  type GlobalStage,
} from "../src/utils/global-board"

const board = (id: string) => ({ id, title: id }) as Dashboard

const column = (
  id: string,
  boardId: string,
  position: string,
  done = false
): Column =>
  ({ id, dashboardId: boardId, position, done, deletedAt: null }) as Column

/** A small world: boards with columns, and cards placed in them. */
function world(
  columns: Column[],
  cards: { id: string; column: string; position: string; priority?: string }[]
) {
  const stages = boardStages(columns)
  const entries: GlobalCard[] = cards.map(
    ({ id, column: columnId, position, priority }) => {
      const col = columns.find((c) => c.id === columnId)!
      const stage = (["todo", "doing", "done"] as const).find((s) =>
        stages.get(col.dashboardId)![s].includes(col)
      )!
      return {
        card: { id, columnId, position, priority: priority ?? "" } as Card,
        column: col,
        board: board(col.dashboardId),
        stage,
      }
    }
  )
  return { columns, stages, entries, order: new Map<string, string>() }
}

type World = ReturnType<typeof world>

const ids = (entries: GlobalCard[]) => entries.map((e) => e.card.id)

/** The board column's cards in board order. */
const boardOrder = (w: World, columnId: string) =>
  ids(
    w.entries
      .filter((e) => e.column.id === columnId)
      .sort((a, b) => (a.card.position < b.card.position ? -1 : 1))
  )

/** Drops a card and writes the plan back into the world, as the app does. */
function drop(
  w: World,
  cardId: string,
  stage: GlobalStage,
  index: number,
  isVisible: (e: GlobalCard) => boolean = () => true
) {
  const plan = planGlobalDrop({ ...w, isVisible, cardId, stage, index })
  if (!plan) return false
  if (plan.place) {
    const { columnId, position } = plan.place
    const col = w.columns.find((c) => c.id === columnId)!
    w.entries = w.entries.map((e) =>
      e.card.id === cardId
        ? { ...e, stage, column: col, card: { ...e.card, columnId, position } }
        : e
    )
  }
  for (const [id, key] of plan.order) w.order.set(id, key)
  return true
}

const lane = (w: World, stage: GlobalStage) =>
  ids(globalLanes(w.entries, w.order)[stage])

describe("boardStages", () => {
  it("maps the leftmost undone column to To do, other undone ones to In progress", () => {
    const stages = boardStages([
      column("done", "b", "a3", true),
      column("review", "b", "a2"),
      column("todo", "b", "a0"),
      column("doing", "b", "a1"),
    ])
    const b = stages.get("b")!
    expect(b.todo.map((c) => c.id)).toEqual(["todo"])
    expect(b.doing.map((c) => c.id)).toEqual(["doing", "review"])
    expect(b.done.map((c) => c.id)).toEqual(["done"])
  })

  it("sends In progress to the only undone column, and has no Done without one", () => {
    const b = boardStages([column("only", "b", "a0")]).get("b")
    expect(stageColumn(b, "doing")?.id).toBe("only")
    expect(stageColumn(b, "done")).toBeNull()
  })

  it("leaves the backlog column out, so To do is the next one", () => {
    const backlog = { ...column("later", "b", "a0"), backlog: true }
    const b = boardStages([backlog, column("todo", "b", "a1")]).get("b")!
    expect(b.todo.map((c) => c.id)).toEqual(["todo"])
    expect([...b.doing, ...b.done]).toEqual([])
  })
})

describe("laneOrder", () => {
  it("fills a column's slots in its board order", () => {
    const w = world(
      [column("web", "W", "a0"), column("ops", "O", "a0")],
      [
        { id: "w1", column: "web", position: "a0" },
        { id: "w2", column: "web", position: "a1" },
        { id: "o1", column: "ops", position: "a0" },
      ]
    )
    // The arrangement says w2 first, but within web w1 comes first.
    w.order = new Map([
      ["w2", "a0"],
      ["o1", "a1"],
      ["w1", "a2"],
    ])
    expect(laneOrder(w.entries, w.order).map((e) => e.card.id)).toEqual([
      "w1",
      "o1",
      "w2",
    ])
  })

  it("puts unplaced cards last, by priority", () => {
    const w = world(
      [column("a", "A", "a0"), column("b", "B", "a0"), column("c", "C", "a0")],
      [
        { id: "low", column: "a", position: "a0", priority: "low" },
        { id: "high", column: "b", position: "a0", priority: "high" },
        { id: "placed", column: "c", position: "a0" },
      ]
    )
    w.order.set("placed", "a0")
    expect(lane(w, "todo")).toEqual(["placed", "high", "low"])
  })
})

describe("planGlobalDrop", () => {
  const twoBoards = () =>
    world(
      [
        column("web", "W", "a0"),
        column("web-doing", "W", "a1"),
        column("web-done", "W", "a2", true),
        column("ops", "O", "a0"),
      ],
      [
        { id: "W1", column: "web", position: "a0" },
        { id: "W2", column: "web", position: "a1" },
        { id: "O1", column: "ops", position: "a0" },
      ]
    )

  it("keeps a personal lane order and mirrors same-board order on the board", () => {
    const w = twoBoards()
    expect(drop(w, "O1", "todo", 0)).toBe(true)
    expect(lane(w, "todo")).toEqual(["O1", "W1", "W2"])

    drop(w, "W2", "todo", 1)
    expect(lane(w, "todo")).toEqual(["O1", "W2", "W1"])
    expect(boardOrder(w, "web")).toEqual(["W2", "W1"])
    expect(boardOrder(w, "ops")).toEqual(["O1"])

    // Someone else, with no arrangement of their own, still follows the board.
    const theirs = laneOrder(w.entries, new Map()).map((e) => e.card.id)
    expect(theirs.filter((id) => id.startsWith("W"))).toEqual(["W2", "W1"])
  })

  it("moves a card to the top of its own lane, board order following", () => {
    const w = twoBoards()
    expect(drop(w, "W2", "todo", 0)).toBe(true)
    expect(lane(w, "todo")[0]).toBe("W2")
    expect(boardOrder(w, "web")).toEqual(["W2", "W1"])
  })

  it("interleaves boards without touching board order", () => {
    const w = twoBoards()
    drop(w, "O1", "todo", 1)
    expect(lane(w, "todo")).toEqual(["W1", "O1", "W2"])
    expect(boardOrder(w, "web")).toEqual(["W1", "W2"])
  })

  it("lands where dropped even when the slot above was made by another card", () => {
    const w = twoBoards()
    // web's slots are made by W2 (first) and W1, but shown as W1 then W2.
    w.order = new Map([
      ["W2", "a0"],
      ["O1", "a1"],
      ["W1", "a2"],
    ])
    expect(lane(w, "todo")).toEqual(["W1", "O1", "W2"])
    drop(w, "O1", "todo", 0)
    expect(lane(w, "todo")).toEqual(["O1", "W1", "W2"])
  })

  it("moves a card to the lane's column on its own board", () => {
    const w = twoBoards()
    drop(w, "W1", "doing", 0)
    expect(w.entries.find((e) => e.card.id === "W1")?.column.id).toBe(
      "web-doing"
    )
    expect(lane(w, "doing")).toEqual(["W1"])
    expect(lane(w, "todo")).toEqual(["O1", "W2"])
  })

  it("refuses a lane the card's board has no column for", () => {
    const w = twoBoards()
    expect(drop(w, "O1", "done", 0)).toBe(false)
    expect(w.entries.find((e) => e.card.id === "O1")?.column.id).toBe("ops")
  })

  it("keeps hidden cards in their board place", () => {
    const w = world(
      [column("web", "W", "a0"), column("ops", "O", "a0")],
      [
        { id: "W1", column: "web", position: "a0" },
        { id: "hidden", column: "web", position: "a1" },
        { id: "W3", column: "web", position: "a2" },
        { id: "O1", column: "ops", position: "a0" },
      ]
    )
    const visible = (e: GlobalCard) => e.card.id !== "hidden"
    // Shown: W1, W3, O1 — drag W3 to the top.
    drop(w, "W3", "todo", 0, visible)
    expect(boardOrder(w, "web")).toEqual(["W3", "W1", "hidden"])
  })

  it("puts every undisturbed drop exactly where it was dropped", () => {
    // Deterministic pseudo-random walk over drops on three boards.
    let seed = 7
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31
      return seed % n
    }
    const w = world(
      [
        column("a", "A", "a0"),
        column("a2", "A", "a1"),
        column("b", "B", "a0"),
        column("c", "C", "a0"),
      ],
      Array.from({ length: 9 }, (_, i) => ({
        id: `k${i}`,
        column: ["a", "b", "c"][i % 3],
        position: `a${i}`,
        priority: ["high", "", "low"][i % 3],
      }))
    )
    for (let step = 0; step < 200; step++) {
      const shown = lane(w, "todo")
      const cardId = shown[rand(shown.length)]
      const index = rand(shown.length)
      const expected = shown.filter((id) => id !== cardId)
      expected.splice(index, 0, cardId)
      expect(drop(w, cardId, "todo", index)).toBe(true)
      expect(lane(w, "todo")).toEqual(expected)
      // And each board column reads the same on its board.
      for (const col of ["a", "b", "c"]) {
        const inLane = lane(w, "todo").filter((id) =>
          w.entries.some((e) => e.card.id === id && e.column.id === col)
        )
        expect(inLane).toEqual(boardOrder(w, col))
      }
    }
  })
})

describe("placeInColumn", () => {
  const entry = (
    id: string,
    columnId: string,
    position: string
  ): GlobalCard => ({
    card: { id, columnId, position } as Card,
    column: { id: columnId } as Column,
    board: board("W"),
    stage: "todo",
  })

  it("follows the nearest same-column card above it in the lane", () => {
    const a = entry("a", "web", "a1")
    const moved = entry("x", "web", "a5")
    const rest = [entry("b", "web", "a0"), a, entry("c", "web", "a2")]
    const position = placeInColumn({
      lane: [a, entry("o", "ops", "a0"), moved, rest[0]],
      moved,
      column: rest.map((e) => e.card),
      columnChanged: false,
    })
    expect(position! > "a1" && position! < "a2").toBe(true)
  })

  it("precedes the nearest same-column card below when none is above", () => {
    const b = entry("b", "web", "a1")
    const moved = entry("x", "web", "a5")
    const position = placeInColumn({
      lane: [entry("o", "ops", "a0"), moved, b],
      moved,
      column: [entry("a", "web", "a0").card, b.card],
      columnChanged: false,
    })
    expect(position! > "a0" && position! < "a1").toBe(true)
  })

  it("tops a column it moved into without neighbours, and leaves a reorder alone", () => {
    const moved = entry("x", "web", "a5")
    const column = [entry("a", "web", "a0").card]
    const lane = [entry("o", "ops", "a0"), moved]
    expect(
      placeInColumn({ lane, moved, column, columnChanged: true })! < "a0"
    ).toBe(true)
    expect(
      placeInColumn({ lane, moved, column, columnChanged: false })
    ).toBeNull()
  })
})
