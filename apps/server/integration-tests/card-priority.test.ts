import { beforeAll, beforeEach, describe, expect, test } from "vitest"
import type { Card } from "@doska/contract"
import { getDB } from "../src/db/get-db"
import { cards } from "../src/db/schema"
import {
  callTool,
  mcpToken,
  rpcClient,
  resetTables,
  startServer,
  toolJson,
  type Harness,
} from "./harness"

let h: Harness
let client: ReturnType<typeof rpcClient>
let token: string

beforeAll(async () => {
  h = await startServer()
  client = rpcClient(h)
  token = await mcpToken(h, h.cookie)
})

beforeEach(resetTables)

const now = 1_000

function card(id: string, priority: string) {
  return {
    id,
    title: "Card",
    body: "",
    position: "a",
    columnId: "c1",
    number: null,
    deadline: null,
    priority,
    attachments: [],
    parentId: null,
    updatedAt: now,
    deletedAt: null,
  }
}

describe("card priority sync", () => {
  test("persists the priority to the DB and reads it back", async () => {
    const res = await client.board.sync({
      boardId: "b1",
      since: 0,
      changes: [{ store: "cards", record: card("card1", "high") }],
    })

    const rows = await getDB().select().from(cards)
    expect(rows[0].priority).toBe("high")

    const pulled = res.changes.find((c) => c.record.id === "card1")
    expect((pulled?.record as { priority: string }).priority).toBe("high")
  })

  test("a card pushed without a priority defaults to empty, not null", async () => {
    await client.board.sync({
      boardId: "b1",
      since: 0,
      changes: [
        {
          store: "cards",
          // A client on the previous version sends no priority at all — the cast
          // is the point of the test, so it has to defeat the schema's type.
          record: {
            id: "card2",
            title: "Card",
            body: "",
            position: "a",
            columnId: "c1",
            number: null,
            deadline: null,
            attachments: [],
            parentId: null,
            updatedAt: now,
            deletedAt: null,
          } as unknown as Card,
        },
      ],
    })

    const rows = await getDB().select().from(cards)
    expect(rows[0].priority).toBe("")
  })

  test("a later push updates the priority", async () => {
    const first = await client.board.sync({
      boardId: "b1",
      since: 0,
      changes: [{ store: "cards", record: card("card1", "high") }],
    })

    const second = await client.board.sync({
      boardId: "b1",
      since: first.cursor,
      changes: [
        { store: "cards", record: { ...card("card1", "low"), updatedAt: now + 1 } },
      ],
    })

    const rows = await getDB().select().from(cards)
    expect(rows[0].priority).toBe("low")
    expect(
      (second.changes.find((c) => c.record.id === "card1")?.record as {
        priority: string
      }).priority
    ).toBe("low")
  })
})

describe("card priority over MCP", () => {
  const call = (name: string, args?: Record<string, unknown>) =>
    callTool(h, token, name, args)

  /** A fresh board with one card, returned as {boardId, columnId, card}. */
  async function seed(args: Record<string, unknown> = {}) {
    const board = toolJson(await call("create_board", { title: "Roadmap" }))
    const boardId: string = board.board.id
    const columnId: string = board.columns[0].id
    const created = toolJson(
      await call("create_card", { boardId, columnId, title: "Card", ...args })
    )
    return { boardId, columnId, card: created }
  }

  test("create_card stores a priority and get_card reads it back", async () => {
    const { boardId, card } = await seed({ priority: "high" })
    expect(card.priority).toBe("high")

    const read = toolJson(await call("get_card", { boardId, cardId: card.id }))
    expect(read.priority).toBe("high")
  })

  test("a card created without one has no priority", async () => {
    const { card } = await seed()
    expect(card.priority).toBeNull()
  })

  test("update_card changes it, and null clears it", async () => {
    const { boardId, card } = await seed({ priority: "high" })

    const lowered = toolJson(
      await call("update_card", { boardId, cardId: card.id, priority: "low" })
    )
    expect(lowered.priority).toBe("low")

    const cleared = toolJson(
      await call("update_card", { boardId, cardId: card.id, priority: null })
    )
    expect(cleared.priority).toBeNull()
  })

  test("update_card leaves the priority alone when it isn't passed", async () => {
    const { boardId, card } = await seed({ priority: "medium" })

    const renamed = toolJson(
      await call("update_card", { boardId, cardId: card.id, title: "Renamed" })
    )
    expect(renamed.title).toBe("Renamed")
    expect(renamed.priority).toBe("medium")
  })

  test("search_cards filters by priority", async () => {
    const { boardId, columnId } = await seed({ priority: "high" })
    await call("create_card", {
      boardId,
      columnId,
      title: "Someday",
      priority: "low",
    })

    const found = toolJson(await call("search_cards", { priority: "high" }))
    expect(found.cards.map((c: { title: string }) => c.title)).toEqual(["Card"])
  })

  test("an unknown priority is refused at the tool boundary", async () => {
    const board = toolJson(await call("create_board", { title: "Roadmap" }))
    const result = await call("create_card", {
      boardId: board.board.id,
      columnId: board.columns[0].id,
      title: "Card",
      priority: "urgent",
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain("priority")
  })
})
