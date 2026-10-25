import { createContext, type ReactNode } from "react"

/** Menu items a view adds to every card it shows — the global board's "Move to
 * top" — rendered at the head of the card menu's move group. */
export const CardMenuExtras = createContext<
  ((cardId: string) => ReactNode) | null
>(null)
