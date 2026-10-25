import { boardStages, stageColumn } from "../../utils/global-board"
import { db } from "../db/db"
import { live } from "./live"
import { moveCardToColumn } from "./move-card-to-column"

/**
 * Takes a card out of the backlog: to the top of its board's To do column, the
 * one that feeds the global board's first lane. Returns the id of the card now
 * holding the content.
 */
export async function sendCardToBoard(id: string): Promise<string> {
  const card = await db.getCard(id)
  if (!card) return id
  const from = await db.getColumn(card.columnId)
  if (!from) return id

  const columns = (await db.getColumns()).filter(
    (c) => live(c) && c.dashboardId === from.dashboardId
  )
  const todo = stageColumn(boardStages(columns).get(from.dashboardId), "todo")
  if (!todo) throw new Error("The board has no To do column")
  return moveCardToColumn(id, todo.id)
}
