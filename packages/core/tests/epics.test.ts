import { describe, expect, it } from "vitest"
import type { Card, Column, Dashboard } from "../src/types"
import {
  buildEpicIndex,
  epicCandidates,
  epicChildren,
  epicOf,
  epicProgress,
  parentProblem,
  subCardColumn,
} from "../src/utils/epics"

const board = (id: string, deletedAt: number | null = null) =>
  ({ id, title: id, position: id, deletedAt }) as Dashboard

const column = (
  id: string,
  boardId: string,
  position: string,
  extra: Partial<Column> = {}
): Column =>
  ({
    id,
    dashboardId: boardId,
    position,
    done: false,
    backlog: false,
    deletedAt: null,
    ...extra,
  }) as Column

const card = (
  id: string,
  columnId: string,
  parentId: string | null = null,
  extra: Partial<Card> = {}
): Card =>
  ({
    id,
    columnId,
    position: id,
    parentId,
    deletedAt: null,
    ...extra,
  }) as Card

const columns = [
  column("todo", "b1", "a0"),
  column("done", "b1", "a1", { done: true }),
  column("other", "b2", "a0"),
]
const boards = [board("b1"), board("b2")]

const ids = (entries: { card: Card }[]) => entries.map((e) => e.card.id)

describe("buildEpicIndex", () => {
  it("lists an epic's children across boards, open ones first", () => {
    const index = buildEpicIndex(
      [
        card("epic", "todo"),
        card("c1", "done", "epic"),
        card("c2", "todo", "epic"),
        card("c3", "other", "epic"),
      ],
      columns,
      boards
    )
    expect(ids(epicChildren(index, "epic"))).toEqual(["c2", "c3", "c1"])
    expect(epicProgress(epicChildren(index, "epic"))).toEqual({
      done: 1,
      total: 3,
    })
    expect(epicOf(index, "c3")?.card.id).toBe("epic")
  })

  it("treats a deleted or unplaced epic as none", () => {
    const cards = [card("epic", "todo"), card("c1", "todo", "epic")]
    const deleted = buildEpicIndex(
      [{ ...cards[0], deletedAt: 1 }, cards[1]],
      columns,
      boards
    )
    expect(epicOf(deleted, "c1")).toBeNull()
    expect(epicChildren(deleted, "epic")).toEqual([])

    const goneBoard = buildEpicIndex(
      [card("epic", "other"), card("c1", "todo", "epic")],
      columns,
      [board("b1"), board("b2", 1)]
    )
    expect(epicOf(goneBoard, "c1")).toBeNull()
  })

  it("skips deleted children", () => {
    const index = buildEpicIndex(
      [card("epic", "todo"), card("c1", "todo", "epic", { deletedAt: 1 })],
      columns,
      boards
    )
    expect(epicChildren(index, "epic")).toEqual([])
  })
})

describe("parentProblem", () => {
  const index = buildEpicIndex(
    [
      card("epic", "todo"),
      card("child", "todo", "epic"),
      card("loose", "todo"),
      card("orphan", "todo", "missing"),
    ],
    columns,
    boards
  )

  it("allows a loose card under a top-level card", () => {
    expect(parentProblem(index, "loose", "epic")).toBeNull()
    // A dangling link counts as none.
    expect(parentProblem(index, "loose", "orphan")).toBeNull()
  })

  it("keeps epics one level deep", () => {
    expect(parentProblem(index, "loose", "loose")).toMatch(/own epic/)
    expect(parentProblem(index, "loose", "child")).toMatch(/already in/)
    expect(parentProblem(index, "epic", "loose")).toMatch(/sub-cards/)
    expect(parentProblem(index, "loose", "missing")).toMatch(/gone/)
  })

  it("offers only cards that can take the card", () => {
    expect(ids(epicCandidates(index, "loose")).sort()).toEqual([
      "epic",
      "orphan",
    ])
    expect(epicCandidates(index, "epic")).toEqual([])
  })
})

describe("subCardColumn", () => {
  it("picks the leftmost open column that isn't the backlog", () => {
    const board = [
      column("backlog", "b1", "a0", { backlog: true }),
      column("done", "b1", "a1", { done: true }),
      column("doing", "b1", "a3"),
      column("todo", "b1", "a2"),
    ]
    expect(subCardColumn(board)?.id).toBe("todo")
    expect(subCardColumn(board.slice(0, 2))?.id).toBe("backlog")
    expect(subCardColumn([board[1]])).toBeNull()
  })
})
