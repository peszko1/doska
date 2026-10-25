export const CARDS = "cards"
export const COLUMNS = "columns"
export const DASHBOARDS = "dashboards"
/** The account's sidebar layout: one record under `SIDEBAR_LAYOUT_ID`. */
export const SIDEBAR = "sidebar"
export const SIDEBAR_LAYOUT_ID = "layout"
export const HISTORY = "history"

/** The account's own records, synced beside the sidebar on the account channel.
 * Tags are keyed by lowercased name, global order by card id, checks by
 * `${habitId}:${date}`. */
export const TAGS = "tags"
export const GLOBAL_ORDER = "globalOrder"
export const HABITS = "habits"
export const HABIT_CHECKS = "habitChecks"
export const USER_STORES = [TAGS, GLOBAL_ORDER, HABITS, HABIT_CHECKS] as const
export type UserStore = (typeof USER_STORES)[number]

export const STORES = [
  CARDS,
  COLUMNS,
  DASHBOARDS,
  SIDEBAR,
  HISTORY,
  ...USER_STORES,
] as const
export type StoreName = (typeof STORES)[number]

/** Sync bookkeeping (the pull cursor) — kept in the DB so it shares the data's
 * lifetime. Not dropped on upgrade, but gone if the whole DB is deleted. */
export const META_STORE = "meta"

/** Index on `cards.columnId`, so a column's cards are a storage-side range seek
 * (`getCards(columnId)`) instead of a full-store scan. The primary key stays the
 * card id, so lookups by id (`getCard`) remain a direct get. */
export const CARDS_BY_COLUMN = "columnId"

/** Index on `cards.deadline` for the digest's date-range reads. Deadlines are
 * `YYYY-MM-DD`, so index order is chronological and a range seek needs no sort.
 * A `null` deadline yields no index key, so undated cards are absent by
 * construction — the index can't answer "cards with no deadline". */
export const CARDS_BY_DEADLINE = "deadline"

export const CARDS_BY_NUMBER = "number"

/** Index on `habitChecks.date`, so a tracker's visible range is a seek. */
export const HABIT_CHECKS_BY_DATE = "date"

export const HISTORY_BY_ENTITY = "entityId"
export const HISTORY_BY_CREATED = "createdAt"
