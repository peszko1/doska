import { Readable } from "node:stream"
import { ORPCError } from "@orpc/client"
import { eq } from "drizzle-orm"
import { beforeAll, beforeEach, describe, expect, test } from "vitest"
import { auth } from "../src/auth"
import { getDB } from "../src/db/get-db"
import { user } from "../src/db/auth-schema"
import { dashboards } from "../src/db/schema"
import type { ServerStorage } from "../src/routes/files"
import { rpcClient, resetTables, startServer, type Harness } from "./harness"

/**
 * Public board links. The point of every test here is what happens with *no*
 * credentials, so `anon()` is the only way this file reaches the route — it
 * takes no headers at all, and never `h.cookie`.
 */

class FakeStorage implements ServerStorage {
  readonly maxBytes = 1_000
  readonly blobs = new Map<string, Buffer>()

  async put(bytes: Buffer, meta: { name: string }) {
    const key = `att/${meta.name}`
    this.blobs.set(key, bytes)
    return { key, mime: "text/plain", size: bytes.length }
  }

  async fetch(key: string) {
    const bytes = this.blobs.get(key)
    if (!bytes) throw new Error("not found")
    return {
      body: Readable.from([bytes]),
      contentType: "text/plain",
      contentLength: bytes.length,
      disposition: "attachment" as const,
    }
  }

  async remove(key: string) {
    this.blobs.delete(key)
  }
}

let h: Harness
let storage: FakeStorage
let owner: ReturnType<typeof rpcClient>
let member: ReturnType<typeof rpcClient>
let memberId: string

const now = 1_000

const board = (id: string) => ({
  store: "dashboards" as const,
  record: {
    id,
    title: id,
    position: "a",
    updatedAt: now,
    deletedAt: null,
  },
})

const column = (id: string, boardId: string, position = "a") => ({
  store: "columns" as const,
  record: {
    id,
    title: id,
    position,
    dashboardId: boardId,
    collapsed: false,
    color: "",
    done: false,
    backlog: false,
    updatedAt: now,
    deletedAt: null,
  },
})

const card = (
  id: string,
  columnId: string,
  extra: Partial<{
    position: string
    deletedAt: number | null
    attachments: {
      id: string
      name: string
      key: string
      mime: string
      size: number
    }[]
  }> = {}
) => ({
  store: "cards" as const,
  record: {
    id,
    title: id,
    body: "",
    position: "a",
    columnId,
    number: null,
    deadline: null,
    attachments: [],
    parentId: null,
    updatedAt: now,
    deletedAt: null,
    ...extra,
  },
})

/** A request carrying nothing — no cookie, no bearer token. */
const anon = (url: string) => h.app.inject({ method: "GET", url })

async function statusOf(run: Promise<unknown>): Promise<number | undefined> {
  try {
    await run
    return undefined
  } catch (err) {
    return err instanceof ORPCError ? err.status : -1
  }
}

beforeAll(async () => {
  storage = new FakeStorage()
  h = await startServer(storage)
  owner = rpcClient(h)

  const created = await auth.api.createUser({
    body: {
      name: "member",
      email: "member@deck.invalid",
      password: "member-password",
      data: { username: "member", displayUsername: "member" },
    },
    headers: new Headers({ cookie: h.cookie }),
  })
  memberId = created.user.id

  const signIn = await auth.api.signInUsername({
    body: { username: "member", password: "member-password" },
    asResponse: true,
  })
  member = rpcClient({
    app: h.app,
    cookie: signIn.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; "),
  })
})

beforeEach(async () => {
  await resetTables()
  await owner.dashboards.sync({ since: 0, changes: [board("b1")] })
  await owner.board.sync({
    boardId: "b1",
    since: 0,
    changes: [column("col1", "b1"), card("card1", "col1")],
  })
})

describe("publish / unpublish", () => {
  test("the board is readable with no credentials at all", async () => {
    const { token } = await owner.boards.publish({ boardId: "b1" })

    const res = await anon(`/api/public/b/${token}`)

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.dashboard.title).toBe("b1")
    expect(body.columns.map((c: { id: string }) => c.id)).toEqual(["col1"])
    expect(body.cards.map((c: { id: string }) => c.id)).toEqual(["card1"])
  })

  test("publishing twice returns the same token", async () => {
    const first = await owner.boards.publish({ boardId: "b1" })
    const second = await owner.boards.publish({ boardId: "b1" })

    expect(second.token).toBe(first.token)
  })

  test("the token is not a board id, and is long enough to be a capability", async () => {
    const { token } = await owner.boards.publish({ boardId: "b1" })

    expect(token).not.toBe("b1")
    expect(token).toMatch(/^[0-9a-f]{32}$/)
  })

  test("publicStatus reports the link, before and after", async () => {
    expect(
      (await owner.boards.publicStatus({ boardId: "b1" })).token
    ).toBeNull()

    const { token } = await owner.boards.publish({ boardId: "b1" })
    expect((await owner.boards.publicStatus({ boardId: "b1" })).token).toBe(
      token
    )

    await owner.boards.unpublish({ boardId: "b1" })
    expect(
      (await owner.boards.publicStatus({ boardId: "b1" })).token
    ).toBeNull()
  })

  test("unpublishing kills the link it had already handed out", async () => {
    const { token } = await owner.boards.publish({ boardId: "b1" })
    expect((await anon(`/api/public/b/${token}`)).statusCode).toBe(200)

    await owner.boards.unpublish({ boardId: "b1" })

    expect((await anon(`/api/public/b/${token}`)).statusCode).toBe(404)
  })

  test("republishing mints a new token and does not revive the old one", async () => {
    const { token: first } = await owner.boards.publish({ boardId: "b1" })
    await owner.boards.unpublish({ boardId: "b1" })
    const { token: second } = await owner.boards.publish({ boardId: "b1" })

    expect(second).not.toBe(first)
    expect((await anon(`/api/public/b/${first}`)).statusCode).toBe(404)
    expect((await anon(`/api/public/b/${second}`)).statusCode).toBe(200)
  })

  test("only the owner may publish or unpublish", async () => {
    await owner.members.add({ boardId: "b1", userId: memberId })

    expect(await statusOf(member.boards.publish({ boardId: "b1" }))).toBe(403)
    expect(await statusOf(member.boards.unpublish({ boardId: "b1" }))).toBe(403)

    const [row] = await getDB()
      .select({ token: dashboards.publicToken })
      .from(dashboards)
      .where(eq(dashboards.id, "b1"))
    expect(row.token).toBeNull()
  })

  test("a member may read the status of the board they work on", async () => {
    await owner.members.add({ boardId: "b1", userId: memberId })
    const { token } = await owner.boards.publish({ boardId: "b1" })

    expect((await member.boards.publicStatus({ boardId: "b1" })).token).toBe(
      token
    )
  })

  test("an outsider may not read the status", async () => {
    expect(await statusOf(member.boards.publicStatus({ boardId: "b1" }))).toBe(
      403
    )
  })

  test("published lists the boards, and only for those on them", async () => {
    await owner.boards.publish({ boardId: "b1" })

    expect((await owner.boards.published()).boardIds).toEqual(["b1"])
    expect((await member.boards.published()).boardIds).toEqual([])

    await owner.members.add({ boardId: "b1", userId: memberId })
    expect((await member.boards.published()).boardIds).toEqual(["b1"])
  })

  test("a banned owner's link stops resolving", async () => {
    const { token } = await owner.boards.publish({ boardId: "b1" })
    const [row] = await getDB()
      .select({ ownerId: dashboards.ownerId })
      .from(dashboards)
      .where(eq(dashboards.id, "b1"))
    const ban = (banned: boolean) =>
      getDB()
        .update(user)
        .set({ banned })
        .where(eq(user.id, row.ownerId as string))

    await ban(true)
    try {
      expect((await anon(`/api/public/b/${token}`)).statusCode).toBe(404)
    } finally {
      // The account outlives `resetTables`, and it is the one every other test
      // signs in as.
      await ban(false)
    }
  })
})

describe("a token that addresses nothing", () => {
  test("unknown, malformed and empty tokens are all 404", async () => {
    for (const token of ["nope", "b1", "%2e%2e%2f", "../../etc"]) {
      expect((await anon(`/api/public/b/${token}`)).statusCode).toBe(404)
    }
  })

  test("a soft-deleted board's token stops resolving", async () => {
    const { token } = await owner.boards.publish({ boardId: "b1" })

    await owner.dashboards.sync({
      since: 0,
      changes: [
        {
          store: "dashboards",
          record: {
            ...board("b1").record,
            updatedAt: now + 1,
            deletedAt: now + 1,
          },
        },
      ],
    })

    expect((await anon(`/api/public/b/${token}`)).statusCode).toBe(404)
  })
})

describe("the payload", () => {
  test("a deleted card and its column are absent", async () => {
    await owner.board.sync({
      boardId: "b1",
      since: 0,
      changes: [
        column("col2", "b1", "b"),
        card("card2", "col2"),
        {
          ...card("card1", "col1"),
          record: {
            ...card("card1", "col1").record,
            updatedAt: now + 1,
            deletedAt: now + 1,
          },
        },
        {
          ...column("col2", "b1", "b"),
          record: {
            ...column("col2", "b1", "b").record,
            updatedAt: now + 1,
            deletedAt: now + 1,
          },
        },
      ],
    })
    const { token } = await owner.boards.publish({ boardId: "b1" })

    const body = (await anon(`/api/public/b/${token}`)).json()

    expect(body.cards).toEqual([])
    expect(body.columns.map((c: { id: string }) => c.id)).toEqual(["col1"])
  })

  test("carries no seq, no owner, no token", async () => {
    const { token } = await owner.boards.publish({ boardId: "b1" })

    const raw = (await anon(`/api/public/b/${token}`)).body

    for (const leak of ["seq", "ownerId", "owner_id", "publicToken", token]) {
      expect(raw).not.toContain(leak)
    }
  })

  test("columns and cards come back in position order", async () => {
    await owner.board.sync({
      boardId: "b1",
      since: 0,
      // Pushed back to front, so insertion order cannot pass for sorted.
      changes: [
        column("colLast", "b1", "z"),
        card("cardLast", "col1", { position: "z" }),
        card("cardMid", "col1", { position: "b" }),
      ],
    })
    const { token } = await owner.boards.publish({ boardId: "b1" })

    const body = (await anon(`/api/public/b/${token}`)).json()

    expect(body.columns.map((c: { id: string }) => c.id)).toEqual([
      "col1",
      "colLast",
    ])
    expect(body.cards.map((c: { id: string }) => c.id)).toEqual([
      "card1",
      "cardMid",
      "cardLast",
    ])
  })

  test("card priority and the board's sort choice appear in the payload", async () => {
    await owner.dashboards.sync({
      since: 0,
      changes: [
        {
          ...board("b1"),
          record: { ...board("b1").record, sort: ["priority"], updatedAt: now + 1 },
        },
      ],
    })
    await owner.board.sync({
      boardId: "b1",
      since: 0,
      changes: [
        {
          ...card("card1", "col1"),
          record: {
            ...card("card1", "col1").record,
            priority: "high",
            updatedAt: now + 1,
          },
        },
      ],
    })
    const { token } = await owner.boards.publish({ boardId: "b1" })

    const body = (await anon(`/api/public/b/${token}`)).json()

    expect(body.dashboard.sort).toEqual(["priority"])
    expect(
      body.cards.find((c: { id: string }) => c.id === "card1").priority
    ).toBe("high")
  })

  test("another board's records never appear", async () => {
    await owner.dashboards.sync({ since: 0, changes: [board("b2")] })
    await owner.board.sync({
      boardId: "b2",
      since: 0,
      changes: [column("col9", "b2"), card("card9", "col9")],
    })
    const { token } = await owner.boards.publish({ boardId: "b1" })

    const raw = (await anon(`/api/public/b/${token}`)).body

    expect(raw).not.toContain("card9")
    expect(raw).not.toContain("col9")
  })
})

describe("attachments", () => {
  // The contract only accepts keys of the shape the upload endpoint mints, so
  // these have to look minted.
  const MINE = "att/11111111-1111-1111-1111-111111111111.txt"
  const THEIRS = "att/22222222-2222-2222-2222-222222222222.txt"

  const attachment = (key: string) => ({
    id: `att-${key}`,
    name: key,
    key,
    mime: "text/plain",
    size: 3,
  })

  beforeEach(async () => {
    storage.blobs.set(MINE, Buffer.from("abc"))
    storage.blobs.set(THEIRS, Buffer.from("xyz"))
    await owner.board.sync({
      boardId: "b1",
      since: 0,
      changes: [
        {
          ...card("card1", "col1"),
          record: {
            ...card("card1", "col1").record,
            updatedAt: now + 1,
            attachments: [attachment(MINE)],
            parentId: null,
          },
        },
      ],
    })
  })

  test("an attachment of a card on this board streams to an anonymous reader", async () => {
    const { token } = await owner.boards.publish({ boardId: "b1" })

    const res = await anon(
      `/api/public/b/${token}/files/${encodeURIComponent(MINE)}`
    )

    expect(res.statusCode).toBe(200)
    expect(res.body).toBe("abc")
  })

  test("a key from another board is 404, even though the object exists", async () => {
    await owner.dashboards.sync({ since: 0, changes: [board("b2")] })
    await owner.board.sync({
      boardId: "b2",
      since: 0,
      changes: [
        column("col9", "b2"),
        {
          ...card("card9", "col9"),
          record: {
            ...card("card9", "col9").record,
            attachments: [attachment(THEIRS)],
            parentId: null,
          },
        },
      ],
    })
    const { token } = await owner.boards.publish({ boardId: "b1" })

    const res = await anon(
      `/api/public/b/${token}/files/${encodeURIComponent(THEIRS)}`
    )

    expect(res.statusCode).toBe(404)
  })

  test("an attachment of a deleted card stops resolving", async () => {
    const { token } = await owner.boards.publish({ boardId: "b1" })
    expect(
      (await anon(`/api/public/b/${token}/files/${encodeURIComponent(MINE)}`))
        .statusCode
    ).toBe(200)

    await owner.board.sync({
      boardId: "b1",
      since: 0,
      changes: [
        {
          ...card("card1", "col1"),
          record: {
            ...card("card1", "col1").record,
            updatedAt: now + 2,
            deletedAt: now + 2,
            attachments: [attachment(MINE)],
            parentId: null,
          },
        },
      ],
    })

    expect(
      (await anon(`/api/public/b/${token}/files/${encodeURIComponent(MINE)}`))
        .statusCode
    ).toBe(404)
  })

  test("a hand-written key never reaches the bucket", async () => {
    storage.blobs.set("secrets/keys.txt", Buffer.from("shh"))

    const status = await statusOf(
      owner.board.sync({
        boardId: "b1",
        since: 0,
        changes: [
          card("card2", "col1", {
            attachments: [attachment("secrets/keys.txt")],
          }),
        ],
      })
    )

    expect(status).toBe(400)
  })

  test("traversal in the key is refused", async () => {
    const { token } = await owner.boards.publish({ boardId: "b1" })

    const res = await anon(`/api/public/b/${token}/files/..%2f..%2fetc`)

    expect(res.statusCode).toBe(400)
  })

  test("an unpublished board's attachment is 404", async () => {
    const { token } = await owner.boards.publish({ boardId: "b1" })
    await owner.boards.unpublish({ boardId: "b1" })

    expect(
      (await anon(`/api/public/b/${token}/files/${encodeURIComponent(MINE)}`))
        .statusCode
    ).toBe(404)
  })
})
