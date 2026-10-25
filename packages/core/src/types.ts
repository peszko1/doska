import type {
  Card,
  Column,
  GlobalOrder,
  Habit,
  HabitCheck,
  Tag,
} from "@doska/contract"

export type {
  Attachment,
  Card,
  Column,
  Dashboard,
  HistoryEntry,
  Member,
  SidebarItem,
  SidebarLayout,
  Tag,
  GlobalOrder,
  Habit,
  HabitCheck,
} from "@doska/contract"

/** The record each of the account's own stores holds. */
export type UserRecords = {
  tags: Tag
  globalOrder: GlobalOrder
  habits: Habit
  habitChecks: HabitCheck
}

/** A board assembled for the UI: its columns and the cards that live in them. */
export type Board = {
  columns: Column[]
  cards: Card[]
}

/** How a board renders: its columns, or every card as one date-grouped list. */
export type DashboardView = "board" | "rows"
