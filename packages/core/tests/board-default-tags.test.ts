import { beforeEach, describe, expect, it } from "vitest"
import type { Card, Column, Dashboard } from "../src/types"
import { CARDS, COLUMNS, DASHBOARDS } from "../src/api/constants"
import { applyDefaultTags } from "@doska/utils"
import {
  addTagToBoardCards,
  setBoardDefaultTags,
} from "../src/api/operations/board-default-tags"
import { createCard } from "../src/api/operations/create-card"
import { moveCardToBoard } from "../src/api/operations/move-card-to-board"
import { installMemoryRuntime, rows } from "./memory-runtime"

beforeEach(installMemoryRuntime)

const board = (id: string, defaultTags: string[] = []) =>
  rows.set(`${DASHBOARDS}/${id}`, {
    id,
    title: id,
    position: "a0",
    sort: [],
    defaultTags,
    updatedAt: 1,
    deletedAt: null,
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

const card = (
  id: string,
  columnId: string,
  tags: string[],
  deletedAt: number | null = null
) =>
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
    deletedAt,
    stamps: {},
    bodyConflict: null,
  } satisfies Card)

const tagsOf = (id: string) => (rows.get(`${CARDS}/${id}`) as Card).tags
const dashboard = (id: string) => rows.get(`${DASHBOARDS}/${id}`) as Dashboard

describe("applyDefaultTags", () => {
  it("appends missing defaults, keeping the card's own spelling", () => {
    expect(applyDefaultTags(["Music", "x"], ["music", "work", "WORK"])).toEqual(
      ["Music", "x", "work"]
    )
  })

  it("leaves the tags alone with no defaults", () => {
    expect(applyDefaultTags(["a"], [])).toEqual(["a"])
  })
})

describe("setBoardDefaultTags", () => {
  it("stores the tags and stamps the dashboard", async () => {
    board("b")
    await setBoardDefaultTags("b", ["music"])
    expect(dashboard("b").defaultTags).toEqual(["music"])
    expect(dashboard("b").updatedAt).toBeGreaterThan(1)
  })

  it("does nothing when unchanged", async () => {
    board("b", ["music"])
    await setBoardDefaultTags("b", ["music"])
    expect(dashboard("b").updatedAt).toBe(1)
  })
})

describe("default tags on new and moved cards", () => {
  it("createCard starts with the board's defaults", async () => {
    board("b", ["music", "hobby"])
    column("c", "b")
    const id = await createCard("c")
    expect(tagsOf(id)).toEqual(["music", "hobby"])
  })

  it("moving to another board adds its defaults", async () => {
    board("from")
    board("to", ["work", "music"])
    column("here", "from")
    column("there", "to")
    card("moved", "here", ["Music"])
    const copyId = await moveCardToBoard("moved", "to")
    expect(tagsOf(copyId)).toEqual(["Music", "work"])
  })
})

describe("addTagToBoardCards", () => {
  it("tags the live cards lacking it and counts them", async () => {
    board("b")
    board("other")
    column("c", "b")
    column("o", "other")
    card("plain", "c", ["x"])
    card("has", "c", ["Music"])
    card("gone", "c", [], 5)
    card("elsewhere", "o", [])

    expect(await addTagToBoardCards("b", "music")).toBe(1)
    expect(tagsOf("plain")).toEqual(["x", "music"])
    expect(tagsOf("has")).toEqual(["Music"])
    expect(tagsOf("gone")).toEqual([])
    expect(tagsOf("elsewhere")).toEqual([])
    expect(await addTagToBoardCards("b", "music")).toBe(0)
  })
})
