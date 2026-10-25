import { beforeEach, describe, expect, it } from "vitest"
import { CARDS, COLUMNS, DASHBOARDS } from "../src/api/constants"
import type { Card, Column } from "../src/types"
import { installMemoryRuntime, rows } from "./memory-runtime"

const board = (id: string, position = "a0") => ({
  id,
  title: id,
  position,
  sort: [],
  updatedAt: 1,
  deletedAt: null,
})
const column = (
  id: string,
  dashboardId: string,
  position: string,
  flags: { done?: boolean; backlog?: boolean } = {}
) => ({
  id,
  title: id,
  dashboardId,
  position,
  collapsed: false,
  color: "",
  done: flags.done ?? false,
  backlog: flags.backlog ?? false,
  updatedAt: 1,
  deletedAt: null,
  stamps: {},
})
const card = (id: string, columnId: string, position: string) => ({
  id,
  columnId,
  position,
  title: id,
  body: "",
  number: 1,
  tags: [],
  users: [],
  attachments: [],
  updatedAt: 1,
  deletedAt: null,
  stamps: {},
})

const storedCard = (id: string) => rows.get(`${CARDS}/${id}`) as Card
const storedColumn = (id: string) => rows.get(`${COLUMNS}/${id}`) as Column
const columnsOf = (dashboardId: string) =>
  [...rows.entries()]
    .filter(([key]) => key.startsWith(`${COLUMNS}/`))
    .map(([, row]) => row as Column)
    .filter((c) => c.dashboardId === dashboardId)

beforeEach(installMemoryRuntime)

describe("setColumnBacklog", () => {
  it("keeps one backlog column per board, and a backlog is never done", async () => {
    rows.set(`${COLUMNS}/old`, column("old", "B", "a0", { backlog: true }))
    rows.set(`${COLUMNS}/done`, column("done", "B", "a1", { done: true }))
    rows.set(`${COLUMNS}/other`, column("other", "O", "a0", { backlog: true }))

    const { setColumnBacklog } =
      await import("../src/api/operations/set-column-backlog")
    await setColumnBacklog("done", true)

    expect(storedColumn("done")).toMatchObject({ backlog: true, done: false })
    expect(storedColumn("old").backlog).toBe(false)
    // Another board's backlog is its own business.
    expect(storedColumn("other").backlog).toBe(true)
  })

  it("marking done unmarks the backlog", async () => {
    rows.set(`${COLUMNS}/later`, column("later", "B", "a0", { backlog: true }))
    const { setColumnDone } =
      await import("../src/api/operations/set-column-done")
    await setColumnDone("later", true)
    expect(storedColumn("later")).toMatchObject({ backlog: false, done: true })
  })
})

describe("moveCardToBacklog", () => {
  it("moves the card to the top of its board's backlog column", async () => {
    rows.set(`${COLUMNS}/todo`, column("todo", "B", "a1"))
    rows.set(`${COLUMNS}/later`, column("later", "B", "a0", { backlog: true }))
    rows.set(`${CARDS}/parked`, card("parked", "later", "a0"))
    rows.set(`${CARDS}/moved`, card("moved", "todo", "a0"))

    const { moveCardToBacklog } =
      await import("../src/api/operations/move-card-to-backlog")
    expect(await moveCardToBacklog("moved")).toBe("moved")

    const moved = storedCard("moved")
    expect(moved.columnId).toBe("later")
    expect(moved.position < storedCard("parked").position).toBe(true)
  })

  it("makes a flagged Backlog column at the far left when the board has none", async () => {
    rows.set(`${COLUMNS}/todo`, column("todo", "B", "a0"))
    rows.set(`${CARDS}/moved`, card("moved", "todo", "a0"))

    const { moveCardToBacklog } =
      await import("../src/api/operations/move-card-to-backlog")
    await moveCardToBacklog("moved")

    const backlog = columnsOf("B").find((c) => c.backlog)!
    expect(backlog.title).toBe("Backlog")
    expect(backlog.done).toBe(false)
    expect(backlog.position < "a0").toBe(true)
    expect(storedCard("moved").columnId).toBe(backlog.id)

    // A second move reuses it.
    rows.set(`${CARDS}/next`, card("next", "todo", "a1"))
    await moveCardToBacklog("next")
    expect(columnsOf("B").filter((c) => c.backlog)).toHaveLength(1)
  })
})

describe("sendCardToBoard", () => {
  it("moves a backlog card to the top of To do, the first column that is neither backlog nor done", async () => {
    rows.set(`${COLUMNS}/later`, column("later", "B", "a0", { backlog: true }))
    rows.set(`${COLUMNS}/todo`, column("todo", "B", "a1"))
    rows.set(`${COLUMNS}/doing`, column("doing", "B", "a2"))
    rows.set(`${CARDS}/first`, card("first", "todo", "a0"))
    rows.set(`${CARDS}/parked`, card("parked", "later", "a0"))

    const { sendCardToBoard } =
      await import("../src/api/operations/send-card-to-board")
    await sendCardToBoard("parked")

    const sent = storedCard("parked")
    expect(sent.columnId).toBe("todo")
    expect(sent.position < storedCard("first").position).toBe(true)
  })

  it("refuses a board with nowhere to send it", async () => {
    rows.set(`${COLUMNS}/later`, column("later", "B", "a0", { backlog: true }))
    rows.set(`${COLUMNS}/done`, column("done", "B", "a1", { done: true }))
    rows.set(`${CARDS}/parked`, card("parked", "later", "a0"))

    const { sendCardToBoard } =
      await import("../src/api/operations/send-card-to-board")
    await expect(sendCardToBoard("parked")).rejects.toThrow()
    expect(storedCard("parked").columnId).toBe("later")
  })
})

describe("getBacklog", () => {
  it("groups backlog cards by board in sidebar order, cards in column order", async () => {
    rows.set(`${DASHBOARDS}/A`, board("A", "a0"))
    rows.set(`${DASHBOARDS}/B`, board("B", "a1"))
    rows.set(`${DASHBOARDS}/C`, board("C", "a2"))
    rows.set(
      `${COLUMNS}/a-later`,
      column("a-later", "A", "a0", { backlog: true })
    )
    rows.set(`${COLUMNS}/a-todo`, column("a-todo", "A", "a1"))
    rows.set(
      `${COLUMNS}/b-later`,
      column("b-later", "B", "a0", { backlog: true })
    )
    rows.set(
      `${COLUMNS}/c-later`,
      column("c-later", "C", "a0", { backlog: true })
    )
    rows.set(`${CARDS}/a2`, card("a2", "a-later", "a1"))
    rows.set(`${CARDS}/a1`, card("a1", "a-later", "a0"))
    rows.set(`${CARDS}/a-open`, card("a-open", "a-todo", "a0"))
    rows.set(`${CARDS}/b1`, card("b1", "b-later", "a0"))

    const { getBacklog } = await import("../src/api/operations/get-backlog")
    const groups = await getBacklog()

    // C's backlog is empty, so it's left out.
    expect(groups.map((g) => g.board.id)).toEqual(["A", "B"])
    expect(groups[0].cards.map((c) => c.id)).toEqual(["a1", "a2"])
  })
})
