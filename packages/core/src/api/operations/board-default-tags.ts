import { applyDefaultTags } from "@doska/utils"
import { db } from "../db/db"
import { sync } from "../sync"
import { stamp } from "../sync/hlc"
import { getBoard } from "./get-board"
import { updateCard } from "./update-card"

const sameTags = (a: string[], b: string[]) =>
  a.length === b.length && a.every((tag, i) => tag === b[i])

/** Sets the tags every card created on, or moved onto, a board starts with. */
export async function setBoardDefaultTags(
  id: string,
  tags: string[]
): Promise<void> {
  const dashboard = await db.getDashboard(id)
  if (!dashboard || sameTags(dashboard.defaultTags ?? [], tags)) return
  await db.setDashboard({ ...dashboard, defaultTags: tags, updatedAt: stamp() })
  sync.markDirty("dashboards", id)
}

/** Adds `tag` to every live card on the board that lacks it, one edit per
 * card so each lands in its history. Returns how many changed. */
export async function addTagToBoardCards(
  boardId: string,
  tag: string
): Promise<number> {
  const { cards } = await getBoard(boardId)
  let changed = 0
  for (const card of cards) {
    const tags = applyDefaultTags(card.tags ?? [], [tag])
    if (tags.length === (card.tags ?? []).length) continue
    await updateCard(card.id, { tags })
    changed += 1
  }
  return changed
}
