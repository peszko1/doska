import { z } from "zod"

/**
 * Entity schemas shared by client and server
 *
 *  - `updatedAt`: client clock (ms). The last-writer-wins tiebreaker. On cards
 *    and columns it equals the newest of `stamps`.
 *  - `deletedAt`: tombstone. `null` while live; set to a timestamp on delete so
 *    the deletion propagates to other clients instead of vanishing silently.
 */

/**
 * Field groups: the unit of last-writer-wins on cards and columns.
 * `updatedAt` equals `max(stamps)`; a group with no stamp reads as `updatedAt`.
 * A tie on a group keeps what is stored.
 */
export const CARD_GROUPS = [
  "title",
  "body",
  "place",
  "deadline",
  "priority",
  "tags",
  "users",
  "attachments",
  "parent",
  "deleted",
  "conflict",
] as const

export const COLUMN_GROUPS = [
  "title",
  "position",
  "collapsed",
  "color",
  "done",
  "backlog",
  "deleted",
] as const

export type CardGroup = (typeof CARD_GROUPS)[number]
export type ColumnGroup = (typeof COLUMN_GROUPS)[number]

/**
 * A file attached to a card.
 *
 *  - `name`: editable display label, shown on the tile. Independent of storage.
 *  - `key`: opaque, backend-specific handle (an S3 object key, or a filename in
 *    the card's on-disk sidecar). Rewritten when files migrate between backends.
 */

const ATTACHMENT_KEY =
  /^att\/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}(\.[a-z0-9]+)?$/

export const AttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string().regex(ATTACHMENT_KEY),
  mime: z.string(),
  size: z.number(),
})

export const CardSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  position: z.string(),
  columnId: z.string(),
  /**
   * Human-readable per-board card number, shown as the card's id. Allocated
   * server-side from a per-board counter on the card's first sync, so it's
   * `null` until then.
   */
  number: z.number().nullable().default(null),
  /** Optional deadline as an ISO date string (`YYYY-MM-DD`); `null` when unset. */
  deadline: z.string().nullable().default(null),
  /** Importance: `high` / `medium` / `low`, empty for none. See `PRIORITIES`. */
  priority: z.string().default(""),
  /** `#tags`*/
  tags: z.array(z.string()).default([]),
  /** User ids tagged on the card. */
  users: z.array(z.string()).default([]),
  /** Attached files; travels with the card's last-writer-wins record. */
  attachments: z.array(AttachmentSchema).default([]),
  /**
   * The epic this card belongs to: another card's id, on any board. One level
   * only — a card with a parent is never a parent. `null` for none, and a
   * parent that is gone or out of reach reads as none.
   */
  parentId: z.string().nullable().default(null),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
  stamps: z.partialRecord(z.enum(CARD_GROUPS), z.number()).default({}),
  /** The body that lost a 3-way merge; `null` while nothing is pending. */
  bodyConflict: z
    .object({ body: z.string(), at: z.number() })
    .nullable()
    .default(null),
})

/** Exhaustive on purpose: a field without a group is a type error. */
export const CARD_FIELD_GROUP: Record<
  Exclude<
    keyof z.infer<typeof CardSchema>,
    "id" | "number" | "updatedAt" | "stamps"
  >,
  CardGroup
> = {
  title: "title",
  body: "body",
  columnId: "place",
  position: "place",
  deadline: "deadline",
  priority: "priority",
  tags: "tags",
  users: "users",
  attachments: "attachments",
  parentId: "parent",
  deletedAt: "deleted",
  bodyConflict: "conflict",
}

export const ColumnSchema = z.object({
  id: z.string(),
  title: z.string(),
  position: z.string(),
  dashboardId: z.string(),
  /** When true the column's card bodies are collapsed down to their titles. */
  collapsed: z.boolean().default(false),
  /**
   * Palette id tinting the column and any `[[card]]` reference to a card in
   * it. Empty for no color; see `COLUMN_COLORS` in the ui-kit.
   */
  color: z.string().default(""),
  /** Cards in this column are finished. */
  done: z.boolean().default(false),
  /** The board's backlog: cards parked for later, left off the global board.
   * At most one column per board carries it. */
  backlog: z.boolean().default(false),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
  stamps: z.partialRecord(z.enum(COLUMN_GROUPS), z.number()).default({}),
})

export const COLUMN_FIELD_GROUP: Record<
  Exclude<
    keyof z.infer<typeof ColumnSchema>,
    "id" | "dashboardId" | "updatedAt" | "stamps"
  >,
  ColumnGroup
> = {
  title: "title",
  position: "position",
  collapsed: "collapsed",
  color: "color",
  done: "done",
  backlog: "backlog",
  deletedAt: "deleted",
}

export const DashboardSchema = z.object({
  id: z.string(),
  title: z.string(),
  position: z.string(),
  sort: z.array(z.string()).default([]),
  /** Tags every card created on, or moved onto, this board starts with. */
  defaultTags: z.array(z.string()).default([]),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
})

/**
 * One entry of the sidebar tree
 */
export const SidebarItemSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("board"), id: z.string() }),
  z.object({
    type: z.literal("folder"),
    id: z.string(),
    title: z.string(),
    boardIds: z.array(z.string()).default([]),
  }),
])

/**
 * How one account lays out its sidebar. A single record per user.
 */
export const SidebarLayoutSchema = z.object({
  id: z.literal("layout"),
  items: z.array(SidebarItemSchema).default([]),
  updatedAt: z.number(),
  deletedAt: z.null(),
})

/**
 * Per-account records. Unlike boards they are never shared: each one belongs to
 * the account that pushed it, and only that account pulls it back. They ride
 * the account-level `dashboards.sync` channel alongside the sidebar layout.
 */

/** A tag's personal styling. Cards reference tags by name, so the id is the
 * name lowercased and a tag with no record is still a tag, just unstyled. */
export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Palette id, as on columns; empty for none. */
  color: z.string().default(""),
  /** Fractional-index key among the sidebar's pinned tags; `null` unpinned. */
  pin: z.string().nullable().default(null),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
})

/**
 * Where a card sits on its owner's global board, keyed by card id. It only
 * interleaves boards: within one board column the card's own `position` wins.
 * Cards with no record fall back to a default order.
 */
export const GlobalOrderSchema = z.object({
  id: z.string(),
  position: z.string(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
})

export const HabitSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Palette id, as on columns; empty for none. */
  color: z.string().default(""),
  position: z.string(),
  /** Hidden from the tracker but kept with its checks; `null` while active. */
  archivedAt: z.number().nullable().default(null),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
})

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * One ticked day of a habit, keyed `${habitId}:${date}` so both devices that
 * tick the same day write the same record. Unticking tombstones it.
 */
export const HabitCheckSchema = z.object({
  id: z.string(),
  habitId: z.string(),
  /** The day in the account's own calendar, `YYYY-MM-DD`. */
  date: z.string().regex(ISO_DATE),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
})

/**
 * The whole of a published board, as `GET /api/public/b/:token` returns it.
 *
 * Built out of the record schemas above on purpose: everything the sync tables
 * carry beyond them — `seq`, `owner_id`, the share token itself — is internal,
 * and reusing the wire shapes is what keeps it out. Tombstones are excluded by
 * the query, so every record here is live.
 */
export const PublicBoardSchema = z.object({
  dashboard: DashboardSchema,
  columns: z.array(ColumnSchema),
  cards: z.array(CardSchema),
})

/** Ship editors only; `'owner'` exists so widening roles needs no migration. */
export const MemberRoleSchema = z.enum(["owner", "editor"])

/** Someone with access to a board, as the share dialog's roster renders them.
 * The owner is in there too, with `role: 'owner'` and no membership row. */
export const MemberSchema = z.object({
  userId: z.string(),
  username: z.string(),
  image: z.string().nullable(),
  role: MemberRoleSchema,
})

/** A not-banned account: everything the member picker gets. */
export const ActiveUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  image: z.string().nullable(),
})

export const HISTORY_ENTITY_TYPES = ["card", "column", "board"] as const
export const HISTORY_ACTIONS = [
  "create",
  "edit",
  "rename",
  "move",
  "delete",
  "restore",
] as const

export const HistoryEntrySchema = z.object({
  id: z.string(),
  boardId: z.string(),
  entityId: z.string(),
  entityType: z.enum(HISTORY_ENTITY_TYPES),
  userId: z.string().nullable(),
  action: z.enum(HISTORY_ACTIONS),
  data: z.record(z.string(), z.unknown()),
  createdAt: z.number(),
  updatedAt: z.number(),
  // Never tombstoned, only purged by age. Here so generic sync helpers accept the row.
  deletedAt: z.null(),
})

const DashboardRecordChangeSchema = z.object({
  store: z.literal("dashboards"),
  record: DashboardSchema,
})

const SidebarChangeSchema = z.object({
  store: z.literal("sidebar"),
  record: SidebarLayoutSchema,
})

/** The account channel's per-account record stores, beside the sidebar. */
export const USER_RECORD_STORES = [
  "tags",
  "globalOrder",
  "habits",
  "habitChecks",
] as const

export type UserRecordStore = (typeof USER_RECORD_STORES)[number]

const UserRecordChangeSchemas = [
  z.object({ store: z.literal("tags"), record: TagSchema }),
  z.object({ store: z.literal("globalOrder"), record: GlobalOrderSchema }),
  z.object({ store: z.literal("habits"), record: HabitSchema }),
  z.object({ store: z.literal("habitChecks"), record: HabitCheckSchema }),
] as const

export const UserRecordChangeSchema = z.discriminatedUnion(
  "store",
  UserRecordChangeSchemas
)

/** A change on the account-level channel (see `dashboards.sync`): a dashboard,
 * the caller's sidebar layout, or one of the caller's own records. */
export const DashboardChangeSchema = z.discriminatedUnion("store", [
  DashboardRecordChangeSchema,
  SidebarChangeSchema,
  ...UserRecordChangeSchemas,
])

/** One board-channel record change, tagged by the store it belongs to. */
export const ChangeSchema = z.discriminatedUnion("store", [
  z.object({
    store: z.literal("cards"),
    record: CardSchema,
    /** The synced body the local edit started from; the server merges against it. */
    baseBody: z.string().optional(),
  }),
  z.object({ store: z.literal("columns"), record: ColumnSchema }),
  DashboardRecordChangeSchema,
])
