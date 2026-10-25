import type { UserRecords } from "../../types"
import type { UserStore } from "../constants"
import { runtime } from "../../runtime"
import { sync } from "../sync"
import { stamp } from "../sync/hlc"
import { live } from "./live"

/**
 * The account's own records — tags, global board order, habits — read and
 * written the same way whatever the store. Never shared: they sync on the
 * account channel, so every device of this account sees them and nobody else.
 */

/** Every live record of one store, in no particular order. */
export async function getUserRecords<S extends UserStore>(
  store: S
): Promise<UserRecords[S][]> {
  const records = await runtime().db.getAll<UserRecords[S]>(store)
  return records.filter(live)
}

export function getUserRecord<S extends UserStore>(
  store: S,
  id: string
): Promise<UserRecords[S] | undefined> {
  return runtime().db.get<UserRecords[S]>(store, id)
}

/** Writes a record (live or not) as it is given, stamped as the newest. */
export async function putUserRecord<S extends UserStore>(
  store: S,
  record: Omit<UserRecords[S], "updatedAt">
): Promise<UserRecords[S]> {
  const stamped = { ...record, updatedAt: stamp() } as UserRecords[S]
  await runtime().db.set(store, stamped.id, stamped)
  sync.markDirty(store, stamped.id)
  return stamped
}

/** Tombstones a record, so the deletion reaches the account's other devices. */
export async function deleteUserRecord(
  store: UserStore,
  id: string
): Promise<void> {
  const record = await runtime().db.get<{ id: string }>(store, id)
  if (!record) return
  const now = stamp()
  await runtime().db.set(store, id, {
    ...record,
    deletedAt: now,
    updatedAt: now,
  })
  sync.markDirty(store, id)
}
