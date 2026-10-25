import type { DashboardChange } from "@doska/contract"
import type { DirtyStore } from "@doska/sync"
import type { Card, Column, Dashboard, SidebarLayout } from "../../../types"
import { keys } from "../../../data/keys"
import { queryClient } from "../../../query-client"
import { runtime } from "../../../runtime"
import {
  CARDS,
  CARDS_BY_COLUMN,
  COLUMNS,
  DASHBOARDS,
  SIDEBAR,
  TAGS,
  USER_STORES,
  type UserStore,
} from "../../constants"
import { db } from "../../db/db"
import { clock, persistClock } from "../hlc"
import { splitRef } from "./channel-shared"
import { resetHistoryCursor } from "./history-driver"

/** Account-level dashboard-list steps, shared server ⇄ filesystem. */

export async function collectDashboardChanges(
  dirty: DirtyStore
): Promise<{ changes: DashboardChange[]; refs: string[] }> {
  const changes: DashboardChange[] = []
  const refs: string[] = []
  const dead: string[] = []

  for (const ref of dirty.all()) {
    const [store, id] = splitRef(ref)
    let change: DashboardChange | undefined
    switch (store) {
      case DASHBOARDS: {
        const record = await runtime().db.get<Dashboard>(DASHBOARDS, id)
        if (record) change = { store: DASHBOARDS, record }
        break
      }
      case SIDEBAR: {
        const record = await runtime().db.get<SidebarLayout>(SIDEBAR, id)
        if (record) change = { store: SIDEBAR, record }
        break
      }
      default: {
        if (!isUserStore(store)) continue
        const record = await runtime().db.get(store, id)
        if (record) change = { store, record } as DashboardChange
      }
    }

    if (!change) {
      dead.push(ref)
      continue
    }
    changes.push(change)
    refs.push(ref)
  }

  if (dead.length) dirty.drop(dead)

  return { changes, refs }
}

const isUserStore = (store: string): store is UserStore =>
  (USER_STORES as readonly string[]).includes(store)

/** Hard-deletes a board's columns and cards, tombstoned or not. */
export async function purgeBoard(boardId: string): Promise<void> {
  const columns = await runtime().db.getAll<Column>(COLUMNS)
  for (const column of columns) {
    if (column.dashboardId !== boardId) continue
    const cards = await runtime().db.getAll<Card>(CARDS, {
      index: CARDS_BY_COLUMN,
      range: { lower: column.id, upper: column.id },
    })
    for (const card of cards) await db.hardDelete(CARDS, card.id)
    await db.hardDelete(COLUMNS, column.id)
  }
  queryClient.invalidateQueries({ queryKey: keys.board(boardId) })
}

/** LWW-upserts pulled changes; purges a board on tombstone. */
export async function applyDashboardRemote(
  changes: DashboardChange[]
): Promise<void> {
  let touched = false
  const touchedUserStores = new Set<UserStore>()

  // A board shared with us brings history older than our cursor.
  for (const { store, record } of changes) {
    if (store !== DASHBOARDS) continue
    if (await runtime().db.get(DASHBOARDS, record.id)) continue
    await resetHistoryCursor()
    break
  }

  for (const { store, record } of changes) {
    clock.receive(record.updatedAt)
    const existing = await runtime().db.get<{ updatedAt: number }>(
      store,
      record.id
    )
    if (existing && existing.updatedAt >= record.updatedAt) continue
    await runtime().db.set(store, record.id, record)
    if (isUserStore(store)) {
      touchedUserStores.add(store)
      continue
    }
    touched = true
    if (store === DASHBOARDS && record.deletedAt != null)
      await purgeBoard(record.id)
  }
  void persistClock()

  for (const store of touchedUserStores)
    queryClient.invalidateQueries({ queryKey: keys.userStore(store) })
  if (touchedUserStores.has(TAGS))
    queryClient.invalidateQueries({ queryKey: keys.tags })

  if (touched) {
    queryClient.invalidateQueries({ queryKey: keys.dashboards })
    // Digest rows carry their board's title, and a tombstoned board drops out.
    queryClient.invalidateQueries({ queryKey: keys.digest })
  }
}
