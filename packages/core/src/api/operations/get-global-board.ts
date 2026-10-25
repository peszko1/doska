import type {
  BoardStages,
  GlobalCard,
  GlobalStage,
} from "../../utils/global-board"
import { boardStages } from "../../utils/global-board"
import { db } from "../db/db"
import { live } from "./live"

export interface GlobalBoard {
  /** Every live card on a live board, with the lane its column feeds. */
  entries: GlobalCard[]
  /** Every board's columns by lane, empty ones included, for drops. */
  stages: Map<string, BoardStages>
}

/** Every board's cards, read for the global board. */
export async function getGlobalBoard(): Promise<GlobalBoard> {
  const [cards, columns, dashboards] = await Promise.all([
    db.getCards(),
    db.getColumns(),
    db.getDashboards(),
  ])

  const boardById = new Map(dashboards.filter(live).map((d) => [d.id, d]))
  // A live column of a tombstoned board is gone from the UI's point of view.
  const liveColumns = columns.filter(
    (c) => live(c) && boardById.has(c.dashboardId)
  )
  const stages = boardStages(liveColumns)
  const stageOf = new Map<string, GlobalStage>()
  for (const board of stages.values())
    for (const stage of ["todo", "doing", "done"] as const)
      for (const column of board[stage]) stageOf.set(column.id, stage)
  const columnById = new Map(liveColumns.map((c) => [c.id, c]))

  const entries = cards.filter(live).flatMap((card) => {
    const column = columnById.get(card.columnId)
    if (!column) return []
    return [
      {
        card,
        column,
        board: boardById.get(column.dashboardId)!,
        stage: stageOf.get(column.id)!,
      },
    ]
  })
  return { entries, stages }
}
