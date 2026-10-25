import type { Card, Column, Dashboard } from "../../types"
import { byPosition } from "../../utils"
import { db } from "../db/db"
import { getSidebarTree, treeDashboards } from "./get-sidebar-tree"
import { live } from "./live"

export interface BacklogGroup {
  board: Dashboard
  column: Column
  /** In column order. */
  cards: Card[]
}

/** Every board's backlog column with its cards, boards in sidebar order.
 * Boards whose backlog is empty are left out. */
export async function getBacklog(): Promise<BacklogGroup[]> {
  const [tree, columns, cards] = await Promise.all([
    getSidebarTree(),
    db.getColumns(),
    db.getCards(),
  ])
  const backlogOf = new Map(
    columns.filter((c) => live(c) && c.backlog).map((c) => [c.dashboardId, c])
  )
  return treeDashboards(tree).flatMap((board) => {
    const column = backlogOf.get(board.id)
    if (!column) return []
    const inColumn = cards
      .filter((card) => live(card) && card.columnId === column.id)
      .sort(byPosition)
    return inColumn.length ? [{ board, column, cards: inColumn }] : []
  })
}
