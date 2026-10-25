import { ORPCError } from "@orpc/client"
import { beforeAll, beforeEach, describe, expect, test } from "vitest"
import { auth } from "../src/auth"
import { rpcClient, resetTables, startServer, type Harness } from "./harness"

let h: Harness
let owner: ReturnType<typeof rpcClient>
let second: ReturnType<typeof rpcClient>

const now = 1_000

const board = (id: string, title: string) => ({
  store: "dashboards" as const,
  record: {
    id,
    title,
    position: "a",
    updatedAt: now,
    deletedAt: null,
  },
})

const column = (id: string, title: string, dashboardId = "b1") => ({
  store: "columns" as const,
  record: {
    id,
    title,
    position: "a",
    dashboardId,
    collapsed: false,
    color: "",
    done: false,
    backlog: false,
    updatedAt: now,
    deletedAt: null,
  },
})

/** The status the client's `classify` reads to tell a scope from a session. */
async function statusOf(run: Promise<unknown>): Promise<number | undefined> {
  try {
    await run
    return undefined
  } catch (err) {
    return err instanceof ORPCError ? err.status : -1
  }
}

beforeAll(async () => {
  h = await startServer()
  owner = rpcClient(h)

  await auth.api.createUser({
    body: {
      name: "second",
      email: "second@deck.invalid",
      password: "second-password",
      data: { username: "second", displayUsername: "second" },
    },
    headers: new Headers({ cookie: h.cookie }),
  })

  const signIn = await auth.api.signInUsername({
    body: { username: "second", password: "second-password" },
    asResponse: true,
  })
  const cookie = signIn.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ")
  second = rpcClient({ app: h.app, cookie })
})

beforeEach(resetTables)

describe("board.sync is refused to non-owners", () => {
  test("another account's board is 403, not 401", async () => {
    await owner.dashboards.sync({ since: 0, changes: [board("b1", "Roadmap")] })
    await owner.board.sync({
      boardId: "b1",
      since: 0,
      changes: [column("c1", "Todo")],
    })

    const status = await statusOf(
      second.board.sync({ boardId: "b1", since: 0, changes: [] })
    )

    expect(status).toBe(403)
  })

  test("a push to another account's board is refused, contents untouched", async () => {
    await owner.dashboards.sync({ since: 0, changes: [board("b1", "Roadmap")] })
    await owner.board.sync({
      boardId: "b1",
      since: 0,
      changes: [column("c1", "Todo")],
    })

    const status = await statusOf(
      second.board.sync({
        boardId: "b1",
        since: 0,
        changes: [column("c1", "Renamed by an intruder")],
      })
    )
    expect(status).toBe(403)

    const res = await owner.board.sync({ boardId: "b1", since: 0, changes: [] })
    expect(res.changes.map((c) => c.record.title)).toEqual(["Todo"])
  })

  // The board row reaches the server on its own request, so a card push can
  // legitimately name a board the server has never heard of.
  test("a board id nobody has registered is accepted", async () => {
    const res = await second.board.sync({
      boardId: "unregistered",
      since: 0,
      changes: [column("c9", "Todo", "unregistered")],
    })

    expect(res.changes.map((c) => c.record.id)).toEqual(["c9"])
  })

  test("the owner's own board round-trips", async () => {
    await owner.dashboards.sync({ since: 0, changes: [board("b1", "Roadmap")] })

    const pushed = await owner.board.sync({
      boardId: "b1",
      since: 0,
      changes: [column("c1", "Todo")],
    })
    expect(pushed.changes.map((c) => c.record.title)).toEqual(["Todo"])

    const again = await owner.board.sync({
      boardId: "b1",
      since: pushed.cursor,
      changes: [],
    })
    expect(again.changes).toHaveLength(0)
  })
})
