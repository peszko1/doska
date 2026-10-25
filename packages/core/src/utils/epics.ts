import type { Card, Column, Dashboard } from "../types"
import { byPosition } from "./position"

/**
 * Epics: a card whose `parentId` names another card is that card's sub-card,
 * one level deep. Only live, placed cards take part on either side, so a parent
 * that is deleted or out of reach reads as none — and restoring it brings its
 * children back, since their `parentId` is left alone.
 */

/** A card with the column and board it sits in. */
export interface EpicCard {
  card: Card
  column: Column
  board: Dashboard
  /** Sits in a done column. */
  isDone: boolean
}

export interface EpicProgress {
  done: number
  total: number
}

export interface EpicIndex {
  /** Every live card on a live column of a live board. */
  cards: Map<string, EpicCard>
  /** Each epic's live children, open ones first, then in board order. */
  children: Map<string, EpicCard[]>
}

const live = <T extends { deletedAt: number | null }>(r: T) =>
  r.deletedAt === null

function byPlace(a: EpicCard, b: EpicCard): number {
  if (a.isDone !== b.isDone) return a.isDone ? 1 : -1
  if (a.board.id !== b.board.id) return byPosition(a.board, b.board)
  if (a.column.id !== b.column.id) return byPosition(a.column, b.column)
  return byPosition(a.card, b.card)
}

export function buildEpicIndex(
  cards: Card[],
  columns: Column[],
  dashboards: Dashboard[]
): EpicIndex {
  const boardById = new Map(dashboards.filter(live).map((d) => [d.id, d]))
  const columnById = new Map(
    columns
      .filter((c) => live(c) && boardById.has(c.dashboardId))
      .map((c) => [c.id, c])
  )

  const placed = new Map<string, EpicCard>()
  for (const card of cards) {
    const column = live(card) ? columnById.get(card.columnId) : undefined
    if (!column) continue
    placed.set(card.id, {
      card,
      column,
      board: boardById.get(column.dashboardId)!,
      isDone: column.done,
    })
  }

  const children = new Map<string, EpicCard[]>()
  for (const entry of placed.values()) {
    const parentId = entry.card.parentId
    if (!parentId || parentId === entry.card.id || !placed.has(parentId))
      continue
    const list = children.get(parentId) ?? []
    list.push(entry)
    children.set(parentId, list)
  }
  for (const list of children.values()) list.sort(byPlace)
  return { cards: placed, children }
}

/** The card's epic, or null when it has none that's live and placed. */
export function epicOf(index: EpicIndex, cardId: string): EpicCard | null {
  const parentId = index.cards.get(cardId)?.card.parentId
  if (!parentId || parentId === cardId) return null
  return index.cards.get(parentId) ?? null
}

export function epicChildren(index: EpicIndex, cardId: string): EpicCard[] {
  return index.children.get(cardId) ?? []
}

export function epicProgress(children: EpicCard[]): EpicProgress {
  return {
    done: children.filter((child) => child.isDone).length,
    total: children.length,
  }
}

/**
 * Why `cardId` can't go under `parentId`, or null when it can. One level only:
 * an epic can't itself have an epic, and a card with sub-cards can't become one.
 */
export function parentProblem(
  index: EpicIndex,
  cardId: string,
  parentId: string
): string | null {
  if (cardId === parentId) return "A card can't be its own epic"
  if (!index.cards.has(cardId)) return "The card is gone"
  if (!index.cards.has(parentId)) return "The epic is gone"
  if (epicOf(index, parentId)) return "That card is already in an epic"
  if (epicChildren(index, cardId).length > 0)
    return "A card with sub-cards can't join an epic"
  return null
}

/** The cards `cardId` could join as a sub-card, in no particular order. */
export function epicCandidates(index: EpicIndex, cardId: string): EpicCard[] {
  if (epicChildren(index, cardId).length > 0) return []
  return [...index.cards.values()].filter(
    (entry) => parentProblem(index, cardId, entry.card.id) === null
  )
}

/** Where a new sub-card goes: the leftmost open, non-backlog column of a board. */
export function subCardColumn(columns: Column[]): Column | null {
  const open = columns.filter((c) => live(c) && !c.done).sort(byPosition)
  return open.find((c) => !c.backlog) ?? open[0] ?? null
}
