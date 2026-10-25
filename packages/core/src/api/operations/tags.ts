import { generateKeyBetween } from "fractional-indexing"
import type { Tag } from "../../types"
import { TAGS } from "../constants"
import { db } from "../db/db"
import { live } from "./live"
import { updateCard } from "./update-card"
import {
  deleteUserRecord,
  getUserRecord,
  getUserRecords,
  putUserRecord,
} from "./user-records"

/** Tags are matched by name, ignoring case; this is the key they're stored under. */
export const tagId = (name: string) => name.toLowerCase()

export interface TagSummary {
  /** As first seen: a styled tag's own spelling, else the first card's. */
  name: string
  /** Live cards carrying it, across every board. */
  count: number
  /** Palette id; empty when the account never styled it. */
  color: string
  /** Sidebar order key while pinned; `null` otherwise. */
  pin: string | null
}

/**
 * Every tag the account knows: the ones on live cards of every board, plus the
 * ones it styled and no card carries any more. Most used first.
 */
export async function getTags(): Promise<TagSummary[]> {
  const [cards, columns, dashboards, styled] = await Promise.all([
    db.getCards(),
    db.getColumns(),
    db.getDashboards(),
    getUserRecords(TAGS),
  ])

  const liveBoards = new Set(dashboards.filter(live).map((d) => d.id))
  const liveColumns = new Set(
    columns
      .filter((c) => live(c) && liveBoards.has(c.dashboardId))
      .map((c) => c.id)
  )

  const tags = new Map<string, TagSummary>()
  for (const tag of styled)
    tags.set(tag.id, {
      name: tag.name,
      count: 0,
      color: tag.color,
      pin: tag.pin,
    })

  for (const card of cards) {
    if (!live(card) || !liveColumns.has(card.columnId)) continue
    for (const name of card.tags ?? []) {
      const entry = tags.get(tagId(name))
      if (entry) entry.count += 1
      else tags.set(tagId(name), { name, count: 1, color: "", pin: null })
    }
  }

  return [...tags.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name)
  )
}

/** The account's styling of one tag, or the unstyled default. */
async function tagRecord(name: string): Promise<Omit<Tag, "updatedAt">> {
  const record = await getUserRecord(TAGS, tagId(name))
  return record && live(record)
    ? record
    : { id: tagId(name), name, color: "", pin: null, deletedAt: null }
}

export async function setTagColor(name: string, color: string): Promise<void> {
  await putUserRecord(TAGS, { ...(await tagRecord(name)), color })
}

/** Pinned tags in sidebar order. */
export async function getPinnedTags(): Promise<Tag[]> {
  const tags = await getUserRecords(TAGS)
  return tags
    .filter((tag): tag is Tag & { pin: string } => tag.pin !== null)
    .sort((a, b) => (a.pin < b.pin ? -1 : a.pin > b.pin ? 1 : 0))
}

/** Pins a tag at the end of the sidebar's list, or unpins it. */
export async function setTagPinned(
  name: string,
  pinned: boolean
): Promise<void> {
  const record = await tagRecord(name)
  if (!pinned) return void (await putUserRecord(TAGS, { ...record, pin: null }))
  if (record.pin !== null) return
  const pins = await getPinnedTags()
  const pin = generateKeyBetween(pins.at(-1)?.pin ?? null, null)
  await putUserRecord(TAGS, { ...record, pin })
}

/** Moves a pinned tag to `index` among the pinned tags, counted without it. */
export async function movePinnedTag(
  name: string,
  index: number
): Promise<void> {
  const rest = (await getPinnedTags()).filter((t) => t.id !== tagId(name))
  const record = await tagRecord(name)
  if (record.pin === null) return
  const pin = generateKeyBetween(
    rest[index - 1]?.pin ?? null,
    rest[index]?.pin ?? null
  )
  await putUserRecord(TAGS, { ...record, pin })
}

/**
 * Renames a tag on every card that carries it, on every board, and moves its
 * styling along. Renaming onto an existing tag merges the two; the target keeps
 * its own color if it has one.
 */
export async function renameTag(from: string, to: string): Promise<void> {
  const name = to.trim().replace(/^#/, "")
  if (!name || name === from) return

  const cards = await db.getCards()
  for (const card of cards) {
    if (!live(card)) continue
    const tags = card.tags ?? []
    if (!tags.some((t) => tagId(t) === tagId(from))) continue
    const renamed: string[] = []
    for (const t of tags) {
      const next = tagId(t) === tagId(from) ? name : t
      if (!renamed.some((r) => tagId(r) === tagId(next))) renamed.push(next)
    }
    await updateCard(card.id, { tags: renamed })
  }

  const records = await getUserRecords(TAGS)
  const source = records.find((t) => t.id === tagId(from))
  const target = records.find((t) => t.id === tagId(name))
  const color = target?.color || source?.color || ""
  const pin = target?.pin ?? source?.pin ?? null
  if (source && source.id !== tagId(name))
    await deleteUserRecord(TAGS, source.id)
  if (source || target)
    await putUserRecord(TAGS, {
      id: tagId(name),
      name,
      color,
      pin,
      deletedAt: null,
    } satisfies Omit<Tag, "updatedAt">)
}
