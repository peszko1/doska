import { db } from "../db/db"
import { sync } from "../sync"
import { stamp } from "../sync/hlc"
import { touchColumn } from "../sync/touch"

/**
 * Marks the column whose cards count as finished. Finished work isn't a
 * backlog, so a done column stops being the board's backlog.
 */
export async function setColumnDone(id: string, done: boolean): Promise<void> {
  const column = await db.getColumn(id)
  if (!column) return

  const now = stamp()
  const unbacklog = done && column.backlog
  await db.setColumn(
    touchColumn(
      { ...column, done, backlog: unbacklog ? false : column.backlog },
      unbacklog ? ["done", "backlog"] : ["done"],
      now
    )
  )
  sync.markDirty("columns", id)
}
