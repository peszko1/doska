import { beforeEach, describe, expect, it } from "vitest"
import type { Card, Column, Dashboard } from "../src/types"
import { CARDS, COLUMNS, DASHBOARDS, TAGS } from "../src/api/constants"
import {
  getPinnedTags,
  getTags,
  movePinnedTag,
  renameTag,
  setTagColor,
  setTagPinned,
} from "../src/api/operations/tags"
import { getUserRecord } from "../src/api/operations/user-records"
import { installMemoryRuntime, rows } from "./memory-runtime"

beforeEach(installMemoryRuntime)

const board = (id: string, deletedAt: number | null = null) =>
  rows.set(`${DASHBOARDS}/${id}`, {
    id,
    title: id,
    position: "a0",
    sort: [],
    defaultTags: [],
    updatedAt: 1,
    deletedAt,
  } satisfies Dashboard)

const column = (id: string, dashboardId: string) =>
  rows.set(`${COLUMNS}/${id}`, {
    id,
    title: id,
    position: "a0",
    dashboardId,
    collapsed: false,
    color: "",
    done: false,
    backlog: false,
    updatedAt: 1,
    deletedAt: null,
    stamps: {},
  } satisfies Column)

const card = (id: string, columnId: string, tags: string[]) =>
  rows.set(`${CARDS}/${id}`, {
    id,
    title: id,
    body: "",
    position: "a0",
    columnId,
    number: null,
    deadline: null,
    priority: "",
    tags,
    users: [],
    attachments: [],
    parentId: null,
    updatedAt: 1,
    deletedAt: null,
    stamps: {},
    bodyConflict: null,
  } satisfies Card)

const tagsOf = (id: string) => (rows.get(`${CARDS}/${id}`) as Card).tags

describe("getTags", () => {
  it("counts every live board's cards, ignoring case", async () => {
    board("work")
    board("home")
    board("gone", 5)
    column("w", "work")
    column("h", "home")
    column("g", "gone")
    card("c1", "w", ["Music"])
    card("c2", "h", ["music", "hobby"])
    card("c3", "g", ["music"])

    expect(await getTags()).toEqual([
      { name: "Music", count: 2, color: "", pin: null },
      { name: "hobby", count: 1, color: "", pin: null },
    ])
  })

  it("keeps a styled tag no card carries, with its color", async () => {
    await setTagColor("Work", "blue")
    expect(await getTags()).toEqual([
      { name: "Work", count: 0, color: "blue", pin: null },
    ])
  })
})

describe("renameTag", () => {
  beforeEach(() => {
    board("b")
    column("c", "b")
  })

  it("renames on every card and moves the color along", async () => {
    card("c1", "c", ["music", "work"])
    card("c2", "c", ["Music"])
    await setTagColor("music", "rose")

    await renameTag("music", "Guitar")

    expect(tagsOf("c1")).toEqual(["Guitar", "work"])
    expect(tagsOf("c2")).toEqual(["Guitar"])
    expect((await getUserRecord(TAGS, "music"))?.deletedAt).not.toBeNull()
    expect(await getUserRecord(TAGS, "guitar")).toMatchObject({
      name: "Guitar",
      color: "rose",
      deletedAt: null,
    })
  })

  it("merges onto an existing tag without duplicating it", async () => {
    card("c1", "c", ["music", "guitar"])

    await renameTag("music", "guitar")

    expect(tagsOf("c1")).toEqual(["guitar"])
  })
})

describe("pinned tags", () => {
  const pinned = async () => (await getPinnedTags()).map((t) => t.name)

  it("pins at the end, keeps the color, and unpins", async () => {
    await setTagColor("Music", "rose")
    await setTagPinned("Music", true)
    await setTagPinned("Work", true)
    expect(await pinned()).toEqual(["Music", "Work"])
    expect((await getUserRecord(TAGS, "music"))?.color).toBe("rose")

    await setTagPinned("music", false)
    expect(await pinned()).toEqual(["Work"])
    expect((await getUserRecord(TAGS, "music"))?.color).toBe("rose")
  })

  it("moves a pinned tag between its neighbours", async () => {
    for (const name of ["A", "B", "C"]) await setTagPinned(name, true)

    await movePinnedTag("C", 0)
    expect(await pinned()).toEqual(["C", "A", "B"])
    await movePinnedTag("C", 1)
    expect(await pinned()).toEqual(["A", "C", "B"])
  })

  it("keeps the pin through a rename", async () => {
    board("b")
    column("c", "b")
    card("c1", "c", ["music"])
    await setTagPinned("music", true)

    await renameTag("music", "Guitar")
    expect(await pinned()).toEqual(["Guitar"])
  })
})
