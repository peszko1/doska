import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing"
import { priorityRank } from "@doska/tokens"
import type { Card, Column, Dashboard } from "../types"
import { byPosition, keyBetween } from "./position"

/**
 * The global board: every board's cards in three shared lanes. A board's
 * columns map onto them by the `done` flag and their order — the leftmost
 * column not marked done is To do, the other undone ones In progress, and done
 * columns Done — so no column needs configuring to take part. A board's backlog
 * column feeds no lane: its cards wait off the global board.
 */
export const GLOBAL_STAGES = ["todo", "doing", "done"] as const
export type GlobalStage = (typeof GLOBAL_STAGES)[number]

export const GLOBAL_STAGE_TITLES: Record<GlobalStage, string> = {
  todo: "To do",
  doing: "In progress",
  done: "Done",
}

/** A card as the global board holds it: with the column and board it sits in. */
export interface GlobalCard {
  card: Card
  column: Column
  board: Dashboard
  stage: GlobalStage
}

/** One board's columns, sorted, under the lane each one feeds. */
export type BoardStages = Record<GlobalStage, Column[]>

/** Every board's columns by stage, from that board's live columns. */
export function boardStages(columns: Column[]): Map<string, BoardStages> {
  const byBoard = new Map<string, BoardStages>()
  for (const column of [...columns].sort(byPosition)) {
    let stages = byBoard.get(column.dashboardId)
    if (!stages) {
      stages = { todo: [], doing: [], done: [] }
      byBoard.set(column.dashboardId, stages)
    }
    if (column.backlog) continue
    if (column.done) stages.done.push(column)
    else if (stages.todo.length === 0) stages.todo.push(column)
    else stages.doing.push(column)
  }
  return byBoard
}

/**
 * Where a card dropped into a lane lands on its own board: the stage's first
 * column, or — for In progress on a board with a single undone column — that
 * column. Null when the board has nowhere to put it.
 */
export function stageColumn(
  stages: BoardStages | undefined,
  stage: GlobalStage
): Column | null {
  if (!stages) return null
  if (stage === "doing") return stages.doing[0] ?? stages.todo[0] ?? null
  return stages[stage][0] ?? null
}

/**
 * The account's own arrangement: placed cards by their global position, then
 * the rest by priority, deadline and id.
 */
function personalOrder(order: ReadonlyMap<string, string>) {
  return (a: GlobalCard, b: GlobalCard): number => {
    const keyA = order.get(a.card.id)
    const keyB = order.get(b.card.id)
    if (keyA !== undefined || keyB !== undefined) {
      if (keyA === undefined) return 1
      if (keyB === undefined) return -1
      if (keyA !== keyB) return keyA < keyB ? -1 : 1
    }
    const rank = priorityRank(a.card.priority) - priorityRank(b.card.priority)
    if (rank !== 0) return rank
    const deadlineA = a.card.deadline ?? "￿"
    const deadlineB = b.card.deadline ?? "￿"
    if (deadlineA !== deadlineB) return deadlineA < deadlineB ? -1 : 1
    return a.card.id < b.card.id ? -1 : a.card.id > b.card.id ? 1 : 0
  }
}

/** A lane slot: the card shown in it, and the card whose position made it. */
export interface LaneSlot {
  entry: GlobalCard
  owner: GlobalCard
}

/**
 * One lane in order. The account's arrangement decides which board column each
 * slot goes to, but a column's cards always fill its slots in their board
 * order, so the board and the global board agree on which comes first.
 */
export function laneSlots(
  entries: GlobalCard[],
  order: ReadonlyMap<string, string>
): LaneSlot[] {
  const queues = new Map<string, GlobalCard[]>()
  for (const entry of entries) {
    const queue = queues.get(entry.column.id) ?? []
    queue.push(entry)
    queues.set(entry.column.id, queue)
  }
  for (const queue of queues.values())
    queue.sort(
      (a, b) => byPosition(a.card, b.card) || (a.card.id < b.card.id ? -1 : 1)
    )

  return [...entries].sort(personalOrder(order)).map((owner) => ({
    owner,
    entry: queues.get(owner.column.id)!.shift()!,
  }))
}

export function laneOrder(
  entries: GlobalCard[],
  order: ReadonlyMap<string, string>
): GlobalCard[] {
  return laneSlots(entries, order).map((slot) => slot.entry)
}

/** Every lane in order. */
export function globalLanes(
  entries: GlobalCard[],
  order: ReadonlyMap<string, string>
): Record<GlobalStage, GlobalCard[]> {
  return {
    todo: laneOrder(
      entries.filter((e) => e.stage === "todo"),
      order
    ),
    doing: laneOrder(
      entries.filter((e) => e.stage === "doing"),
      order
    ),
    done: laneOrder(
      entries.filter((e) => e.stage === "done"),
      order
    ),
  }
}

/**
 * The moved card's board position after a drop, from its nearest neighbour on
 * the lane in the same board column: right after the one above, or else right
 * before the one below — next to it in the full column, so cards a filter hides
 * keep their place. With neither, a card that changed column goes to its top,
 * as moving a card to a column does elsewhere; one that didn't stays put.
 * `undefined` when the neighbours' keys collide and no position fits.
 */
export function placeInColumn({
  lane,
  moved,
  column,
  columnChanged,
}: {
  /** The lane as shown after the drop, the moved card included. */
  lane: readonly GlobalCard[]
  moved: GlobalCard
  /** The destination column's other cards. */
  column: readonly Card[]
  columnChanged: boolean
}): string | null | undefined {
  const index = lane.indexOf(moved)
  const sameColumn = (candidate: GlobalCard) =>
    candidate !== moved && candidate.column.id === moved.column.id
  const above = lane.slice(0, Math.max(index, 0)).reverse().find(sameColumn)
  const below = lane.slice(index + 1).find(sameColumn)
  const rest = [...column].sort(byPosition)

  if (above) {
    const at = rest.findIndex((card) => card.id === above.card.id)
    return keyBetween(rest[at], rest[at + 1]) ?? undefined
  }
  if (below) {
    const at = rest.findIndex((card) => card.id === below.card.id)
    return keyBetween(rest[at - 1], rest[at]) ?? undefined
  }
  if (!columnChanged) return null
  return keyBetween(undefined, rest[0]) ?? undefined
}

const sameIds = (a: readonly GlobalCard[], b: readonly GlobalCard[]) =>
  a.length === b.length && a.every((entry, i) => entry.card.id === b[i].card.id)

/**
 * The global positions to write so the lane shows `shown` (the visible lane as
 * dropped) — normally one record, the moved card's, minted between the slots
 * it landed between. A slot's key belongs to the card that made it, which is
 * not always the card shown in it, so the candidate is checked by laying the
 * lane out again. When it doesn't hold — a neighbour without a position, keys
 * that collide, a slot made by the moved card itself — every visible card is
 * given a fresh position in the order shown instead: more records, but the
 * order is then exactly what the account saw. Cards a filter hides keep theirs.
 */
export function placeInOrder({
  lane,
  shown,
  moved,
  order,
}: {
  /** Every card of the lane after the drop, hidden ones and the moved one included. */
  lane: readonly GlobalCard[]
  shown: readonly GlobalCard[]
  moved: GlobalCard
  order: ReadonlyMap<string, string>
}): Map<string, string> {
  const shownIds = new Set(shown.map((entry) => entry.card.id))
  const visible = (entries: GlobalCard[]) =>
    entries.filter((entry) => shownIds.has(entry.card.id))
  const holds = (writes: Map<string, string>) =>
    sameIds(
      visible(laneOrder([...lane], new Map([...order, ...writes]))),
      shown
    )

  const others = lane.filter((entry) => entry !== moved)
  const slotKey = new Map(
    laneSlots(others, order).map(({ entry, owner }) => [
      entry.card.id,
      order.get(owner.card.id),
    ])
  )
  const index = shown.indexOf(moved)
  const above = shown[index - 1]
  const below = shown[index + 1]
  const aboveKey = above && slotKey.get(above.card.id)
  const belowKey = below && slotKey.get(below.card.id)
  if (!above || aboveKey !== undefined) {
    try {
      const key = generateKeyBetween(aboveKey ?? null, belowKey ?? null)
      const writes = new Map([[moved.card.id, key]])
      if (holds(writes)) return writes
    } catch {
      // Colliding neighbours: fall through to a fresh run.
    }
  }

  const keys = generateNKeysBetween(null, null, shown.length)
  return new Map(shown.map((entry, i) => [entry.card.id, keys[i]]))
}

/** What a drop on the global board writes. */
export interface GlobalDrop {
  /** The card's new place on its board; null when it stays where it is. */
  place: { columnId: string; position: string } | null
  /** Global positions to write, by card id. */
  order: Map<string, string>
}

/**
 * Plans a drop: the card's board column (the stage's column on its own board
 * when it changed lane), its position in that column, and the global positions
 * that put it where it was dropped. Null when the drop can't land — its board
 * has no column for the lane, or no position fits.
 */
export function planGlobalDrop({
  entries,
  stages,
  order,
  isVisible,
  cardId,
  stage,
  index,
}: {
  /** Every card on the global board, filters aside. */
  entries: readonly GlobalCard[]
  /** Every board's columns by stage, empty columns included. */
  stages: ReadonlyMap<string, BoardStages>
  order: ReadonlyMap<string, string>
  isVisible: (entry: GlobalCard) => boolean
  cardId: string
  /** The lane it was dropped on. */
  stage: GlobalStage
  /** Where in that lane's visible cards it was dropped. */
  index: number
}): GlobalDrop | null {
  const current = entries.find((entry) => entry.card.id === cardId)
  if (!current) return null

  const lanes = globalLanes([...entries], order)
  const target =
    current.stage === stage
      ? current.column
      : stageColumn(stages.get(current.board.id), stage)
  if (!target) return null

  const columnChanged = target.id !== current.column.id
  const moving: GlobalCard = {
    ...current,
    stage,
    column: target,
    card: { ...current.card, columnId: target.id },
  }
  const shown = lanes[stage].filter(
    (entry) => entry.card.id !== cardId && isVisible(entry)
  )
  shown.splice(index, 0, moving)

  const position = placeInColumn({
    lane: shown,
    moved: moving,
    column: entries
      .filter((e) => e.column.id === target.id && e.card.id !== cardId)
      .map((e) => e.card),
    columnChanged,
  })
  if (position === undefined) return null

  const moved: GlobalCard =
    position === null
      ? moving
      : { ...moving, card: { ...moving.card, position } }
  const at = shown.indexOf(moving)
  shown[at] = moved
  const lane = [
    ...entries.filter((e) => e.stage === stage && e.card.id !== cardId),
    moved,
  ]

  return {
    place: position === null ? null : { columnId: target.id, position },
    order: placeInOrder({ lane, shown, moved, order }),
  }
}
