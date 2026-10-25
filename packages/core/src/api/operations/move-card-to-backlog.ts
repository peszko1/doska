import { COLUMN_GROUPS } from "@doska/contract"
import { generateKeyBetween } from "fractional-indexing"
import { byPosition } from "../../utils"
import { db } from "../db/db"
import { recordHistory } from "../history/record-history"
import { sync } from "../sync"
import { touchColumn } from "../sync/touch"
import { live } from "./live"
import { moveCardToColumn } from "./move-card-to-column"
import { newId } from "./new-id"

export const BACKLOG_TITLE = "Backlog"

/**
 * Moves a card to the top of its board's backlog column. A board with none
 * gets one — "Backlog", at the far left, flagged — so the action never has to
 * be hidden: asking to park a card is reason enough to make the place for it.
 * Returns the id of the card now holding the content.
 */
export async function moveCardToBacklog(id: string): Promise<string> {
  const card = await db.getCard(id)
  if (!card) return id
  const from = await db.getColumn(card.columnId)
  if (!from) return id

  const columns = (await db.getColumns())
    .filter((c) => live(c) && c.dashboardId === from.dashboardId)
    .sort(byPosition)
  const backlog =
    columns.find((c) => c.backlog)?.id ??
    (await createBacklogColumn(from.dashboardId, columns[0]?.position ?? null))
  if (backlog === card.columnId) return id
  return moveCardToColumn(id, backlog)
}

async function createBacklogColumn(
  dashboardId: string,
  first: string | null
): Promise<string> {
  const id = newId("col")
  const column = {
    id,
    title: BACKLOG_TITLE,
    position: generateKeyBetween(null, first),
    dashboardId,
    collapsed: false,
    color: "",
    done: false,
    backlog: true,
    updatedAt: 0,
    deletedAt: null,
    stamps: {},
  }
  await db.setColumn(touchColumn(column, COLUMN_GROUPS))
  sync.markDirty("columns", id)
  await recordHistory.column(dashboardId, id, BACKLOG_TITLE, "create")
  return id
}
