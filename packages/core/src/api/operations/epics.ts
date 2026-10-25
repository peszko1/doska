import {
  buildEpicIndex,
  epicOf,
  parentProblem,
  subCardColumn,
} from "../../utils/epics"
import type { EpicIndex } from "../../utils/epics"
import { db } from "../db/db"
import { createCard } from "./create-card"
import { updateCard } from "./update-card"

/** Every live card with its epic links, read once for every epic query. */
export async function getEpicIndex(): Promise<EpicIndex> {
  const [cards, columns, dashboards] = await Promise.all([
    db.getCards(),
    db.getColumns(),
    db.getDashboards(),
  ])
  return buildEpicIndex(cards, columns, dashboards)
}

/**
 * Puts a card under an epic, or takes it out with `null`. Throws when the link
 * would break the one-level rule — see {@link parentProblem}.
 */
export async function setCardParent(
  cardId: string,
  parentId: string | null
): Promise<void> {
  if (parentId !== null) {
    const problem = parentProblem(await getEpicIndex(), cardId, parentId)
    if (problem) throw new Error(problem)
  }
  await updateCard(cardId, { parentId })
}

/** Creates an empty sub-card on the epic's board; resolves to where it went. */
export async function createSubCard(
  parentId: string
): Promise<{ id: string; boardId: string }> {
  const [cards, columns, dashboards] = await Promise.all([
    db.getCards(),
    db.getColumns(),
    db.getDashboards(),
  ])
  const index = buildEpicIndex(cards, columns, dashboards)
  const epic = index.cards.get(parentId)
  if (!epic) throw new Error(`createSubCard: no live card ${parentId}`)
  if (epicOf(index, parentId))
    throw new Error("A sub-card can't have sub-cards")
  const column = subCardColumn(
    columns.filter((c) => c.dashboardId === epic.board.id)
  )
  if (!column) throw new Error("The epic's board has no open column")
  const id = await createCard(column.id, { parentId })
  return { id, boardId: epic.board.id }
}
