import { useEffect, useMemo } from "react"
import { useRoute } from "wouter"
import { sync, useCardDeckId } from "@doska/core"
import { BacklogView } from "@/components/backlog/backlog-view"
import { useCardFilters, useTagQuery } from "@/lib/hooks"
import { routes } from "@/lib/routes"
import { AppShell } from "./app-shell"

/** Every board's backlog, at `/backlog`. */
export function BacklogPage() {
  useEffect(() => {
    sync.setActiveBoard(null)
  }, [])

  const [, params] = useRoute(routes.card.pattern)
  const { data: cardDeckId } = useCardDeckId(params?.id ?? null)
  const closeHref = `~${routes.backlog()}`
  const { filters, setTagFilters } = useCardFilters(closeHref)
  useTagQuery(filters.tagFilters, setTagFilters)

  const deck = useMemo(
    () => ({ id: cardDeckId ?? "", sort: [], ...filters }),
    [cardDeckId, filters]
  )

  return (
    <AppShell deck={deck} cardCloseHref={closeHref}>
      <BacklogView />
    </AppShell>
  )
}
