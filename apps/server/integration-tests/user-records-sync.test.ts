import { beforeAll, beforeEach, describe, expect, test } from "vitest"
import { RETENTION_MS, type DashboardChange } from "@doska/contract"
import { auth } from "../src/auth"
import { getDB } from "../src/db/get-db"
import { userRecords } from "../src/db/schema"
import { purgeExpired } from "../src/db/sync/purge"
import { rpcClient, resetTables, startServer, type Harness } from "./harness"

let h: Harness
let owner: ReturnType<typeof rpcClient>
let second: ReturnType<typeof rpcClient>

const now = 1_000

const tag = (
  color: string,
  updatedAt = now,
  deletedAt: number | null = null
) => ({
  store: "tags" as const,
  record: {
    id: "music",
    name: "Music",
    color,
    pin: null,
    updatedAt,
    deletedAt,
  },
})

const check = (habitId: string, date: string) => ({
  store: "habitChecks" as const,
  record: {
    id: `${habitId}:${date}`,
    habitId,
    date,
    updatedAt: now,
    deletedAt: null,
  },
})

const pulled = (changes: DashboardChange[], store: string) =>
  changes.filter((c) => c.store === store).map((c) => c.record)

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

describe("own records on dashboards.sync", () => {
  test("a pushed record comes back to its owner, past the cursor", async () => {
    const pushed = await owner.dashboards.sync({
      since: 0,
      changes: [tag("blue"), check("h1", "2026-10-25")],
    })
    expect(pulled(pushed.changes, "tags")).toEqual([tag("blue").record])
    expect(pulled(pushed.changes, "habitChecks")).toEqual([
      check("h1", "2026-10-25").record,
    ])

    const later = await owner.dashboards.sync({
      since: pushed.cursor,
      changes: [],
    })
    expect(later.changes).toEqual([])
  })

  test("accounts keep separate records under the same id", async () => {
    await owner.dashboards.sync({ since: 0, changes: [tag("blue")] })
    await second.dashboards.sync({ since: 0, changes: [tag("red")] })

    const ownerSees = await owner.dashboards.sync({ since: 0, changes: [] })
    const secondSees = await second.dashboards.sync({ since: 0, changes: [] })
    expect(pulled(ownerSees.changes, "tags")).toEqual([tag("blue").record])
    expect(pulled(secondSees.changes, "tags")).toEqual([tag("red").record])
  })

  test("an older updatedAt loses", async () => {
    await owner.dashboards.sync({ since: 0, changes: [tag("new", now + 5)] })
    await owner.dashboards.sync({ since: 0, changes: [tag("stale", now)] })

    const res = await owner.dashboards.sync({ since: 0, changes: [] })
    expect(pulled(res.changes, "tags")).toEqual([tag("new", now + 5).record])
  })

  test("a tombstone syncs, then ages out", async () => {
    await owner.dashboards.sync({ since: 0, changes: [tag("blue", now, now)] })
    const res = await owner.dashboards.sync({ since: 0, changes: [] })
    expect(pulled(res.changes, "tags")).toEqual([tag("blue", now, now).record])

    const result = await purgeExpired(now + RETENTION_MS + 1)
    expect(result.userRecords).toBe(1)
    expect(await getDB().select().from(userRecords)).toEqual([])
  })
})
