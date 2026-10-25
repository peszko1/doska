import { useEffect, useMemo } from "react"
import { useRoute } from "wouter"
import { sync, useCardDeckId } from "@doska/core"
import { GlobalBoardView } from "@/components/global-board/global-board-view"
import { useCardFilters, useTagQuery } from "@/lib/hooks"
import { routes } from "@/lib/routes"
import { AppShell } from "./app-shell"

/** Every board's cards in three shared lanes, at `/all`. */
export function GlobalBoardPage() {
  useEffect(() => {
    sync.setActiveBoard(null)
  }, [])

  const [, params] = useRoute(routes.card.pattern)
  const { data: cardDeckId } = useCardDeckId(params?.id ?? null)
  const closeHref = `~${routes.global()}`
  const { filters, setTagFilters } = useCardFilters(closeHref)
  useTagQuery(filters.tagFilters, setTagFilters)

  const deck = useMemo(
    () => ({ id: cardDeckId ?? "", sort: [], ...filters }),
    [cardDeckId, filters]
  )

  return (
    <AppShell deck={deck} cardCloseHref={closeHref}>
      <GlobalBoardView />
    </AppShell>
  )
}
