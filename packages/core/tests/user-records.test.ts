import { beforeEach, describe, expect, it } from "vitest"
import { TAGS } from "../src/api/constants"
import {
  deleteUserRecord,
  getUserRecord,
  getUserRecords,
  putUserRecord,
} from "../src/api/operations/user-records"
import { sync } from "../src/api/sync"
import {
  applyDashboardRemote,
  collectDashboardChanges,
} from "../src/api/sync/drivers/dashboard-channel"
import { installMemoryRuntime } from "./memory-runtime"

beforeEach(installMemoryRuntime)

const tag = (name: string, color = "") => ({
  id: name.toLowerCase(),
  name,
  color,
  pin: null,
  deletedAt: null,
})

/** The account channel's dirty queue, as its driver sees it. */
const dirtyRefs = () =>
  (
    sync as unknown as {
      list: { dirty: Parameters<typeof collectDashboardChanges>[0] }
    }
  ).list.dirty

describe("own records", () => {
  it("queues a write for the account channel, slash in the id and all", async () => {
    await putUserRecord(TAGS, tag("Music/Guitar", "blue"))

    expect(sync.isDirty(TAGS, "music/guitar")).toBe(true)
    const { changes } = await collectDashboardChanges(dirtyRefs())
    expect(changes).toEqual([
      {
        store: TAGS,
        record: expect.objectContaining({ id: "music/guitar", color: "blue" }),
      },
    ])
  })

  it("hides a deleted record but keeps its tombstone", async () => {
    await putUserRecord(TAGS, tag("Work"))
    await deleteUserRecord(TAGS, "work")

    expect(await getUserRecords(TAGS)).toEqual([])
    expect((await getUserRecord(TAGS, "work"))?.deletedAt).not.toBeNull()
  })

  it("keeps the newer of a pulled and a stored record", async () => {
    const mine = await putUserRecord(TAGS, tag("Hobby", "green"))

    await applyDashboardRemote([
      {
        store: TAGS,
        record: { ...mine, color: "red", updatedAt: mine.updatedAt - 1 },
      },
    ])
    expect((await getUserRecord(TAGS, "hobby"))?.color).toBe("green")

    await applyDashboardRemote([
      {
        store: TAGS,
        record: { ...mine, color: "red", updatedAt: mine.updatedAt + 1 },
      },
    ])
    expect((await getUserRecord(TAGS, "hobby"))?.color).toBe("red")
  })
})
