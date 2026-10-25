import { beforeAll, beforeEach, describe, expect, test } from "vitest"
import { getDB } from "../src/db/get-db"
import { cards, dashboards } from "../src/db/schema"
import { rpcClient, resetTables, startServer, type Harness } from "./harness"

let h: Harness
let client: ReturnType<typeof rpcClient>

beforeAll(async () => {
  h = await startServer()
  client = rpcClient(h)
})

beforeEach(resetTables)

const now = 1_000

function card(id: string, columnId: string, updatedAt = now) {
  return {
    id,
    title: id,
    body: "",
    position: "a",
    columnId,
    number: null,
    deadline: null,
    attachments: [],
    parentId: null,
    updatedAt,
    deletedAt: null,
  }
}

describe("board.sync", () => {
  test("pushes changes and reads them back past the cursor", async () => {
    const res = await client.board.sync({
      boardId: "b1",
      since: 0,
      changes: [
        { store: "columns", record: {
          id: "c1", title: "Todo", position: "a",
          dashboardId: "b1", collapsed: false, updatedAt: now, deletedAt: null,
        } },
        { store: "cards", record: card("card1", "c1") },
      ],
    })

    expect(res.cursor).toBeGreaterThan(0)
    expect(res.changes).toHaveLength(2)

    // Landed in the DB, not just echoed back.
    const rows = await getDB().select().from(cards)
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe("card1")
    expect(rows[0].boardId).toBe("b1")
  })

  test("a later cursor pulls only newer records", async () => {
    const first = await client.board.sync({
      boardId: "b1",
      since: 0,
      changes: [{ store: "cards", record: card("card1", "c1") }],
    })

    const second = await client.board.sync({
      boardId: "b1",
      since: first.cursor,
      changes: [{ store: "cards", record: card("card2", "c1", now + 1) }],
    })

    expect(second.changes.map((c) => c.record.id)).toEqual(["card2"])
  })

  test("scopes reads to the requested board", async () => {
    await client.board.sync({
      boardId: "b1",
      since: 0,
      changes: [{ store: "cards", record: card("card1", "c1") }],
    })

    const other = await client.board.sync({
      boardId: "b2",
      since: 0,
      changes: [],
    })
    expect(other.changes).toHaveLength(0)
  })
})

describe("dashboards.sync", () => {
  test("pushes and reads a dashboard on the account-level channel", async () => {
    const res = await client.dashboards.sync({
      since: 0,
      changes: [
        { store: "dashboards", record: {
          id: "b1", title: "Roadmap", position: "a",
          updatedAt: now, deletedAt: null,
        } },
      ],
    })

    expect(res.cursor).toBeGreaterThan(0)
    expect(res.changes.map((c) => c.record.id)).toEqual(["b1"])

    const rows = await getDB().select().from(dashboards)
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe("Roadmap")
  })

  test("a board's sort choice survives push and pull, on the boards-list channel", async () => {
    const res = await client.dashboards.sync({
      since: 0,
      changes: [
        { store: "dashboards", record: {
          id: "b1", title: "Roadmap", position: "a",
          sort: ["priority"], updatedAt: now, deletedAt: null,
        } },
      ],
    })

    const pulled = res.changes.find((c) => c.record.id === "b1")
    expect((pulled?.record as { sort: string[] }).sort).toEqual(["priority"])

    const rows = await getDB().select().from(dashboards)
    expect(rows[0].sort).toEqual(["priority"])
  })

  test("a board pushed without a sort defaults to empty", async () => {
    const res = await client.dashboards.sync({
      since: 0,
      changes: [
        { store: "dashboards", record: {
          id: "b1", title: "Roadmap", position: "a",
          updatedAt: now, deletedAt: null,
        } },
      ],
    })

    const pulled = res.changes.find((c) => c.record.id === "b1")
    expect((pulled?.record as { sort: string[] }).sort).toEqual([])
  })
})

describe("guard", () => {
  test("rejects an unauthenticated RPC call with 401", async () => {
    const res = await h.app.inject({
      method: "POST",
      url: "/api/rpc/board/sync",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ boardId: "b1", since: 0, changes: [] }),
    })
    expect(res.statusCode).toBe(401)
  })
})

describe("epic, backlog and default-tag fields", () => {
  test("round-trip through both channels", async () => {
    const list = await client.dashboards.sync({
      since: 0,
      changes: [
        {
          store: "dashboards",
          record: {
            id: "b1",
            title: "Music",
            position: "a",
            sort: [],
            defaultTags: ["music"],
            updatedAt: now,
            deletedAt: null,
          },
        },
      ],
    })
    expect(list.changes[0].record).toMatchObject({ defaultTags: ["music"] })

    const res = await client.board.sync({
      boardId: "b1",
      since: 0,
      changes: [
        {
          store: "columns",
          record: {
            id: "c1",
            title: "Someday",
            position: "a",
            dashboardId: "b1",
            collapsed: false,
            backlog: true,
            updatedAt: now,
            deletedAt: null,
          },
        },
        { store: "cards", record: card("epic", "c1") },
        {
          store: "cards",
          record: { ...card("child", "c1"), parentId: "epic" },
        },
      ],
    })
    const pulled = Object.fromEntries(
      res.changes.map((c) => [c.record.id, c.record])
    )
    expect(pulled.c1).toMatchObject({ backlog: true })
    expect(pulled.epic).toMatchObject({ parentId: null })
    expect(pulled.child).toMatchObject({ parentId: "epic" })
  })
})
