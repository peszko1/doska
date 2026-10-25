import { db } from "../db/db"
import { sync } from "../sync"
import { stamp } from "../sync/hlc"
import { touchColumn } from "../sync/touch"
import { live } from "./live"

/**
 * Marks the board's backlog column, where cards wait off the global board.
 * A board has at most one, so marking a column unmarks its siblings; and a
 * backlog isn't finished work, so the column stops counting cards as done.
 */
export async function setColumnBacklog(
  id: string,
  backlog: boolean
): Promise<void> {
  const column = await db.getColumn(id)
  if (!column) return

  const now = stamp()
  if (backlog) {
    const siblings = (await db.getColumns()).filter(
      (c) =>
        live(c) &&
        c.dashboardId === column.dashboardId &&
        c.id !== id &&
        c.backlog
    )
    for (const sibling of siblings) {
      await db.setColumn(
        touchColumn({ ...sibling, backlog: false }, ["backlog"], now)
      )
      sync.markDirty("columns", sibling.id)
    }
  }

  const undone = backlog && column.done
  await db.setColumn(
    touchColumn(
      { ...column, backlog, done: undone ? false : column.done },
      undone ? ["backlog", "done"] : ["backlog"],
      now
    )
  )
  sync.markDirty("columns", id)
}
