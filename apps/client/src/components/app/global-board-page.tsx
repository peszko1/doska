import { useEffect, useMemo, useState } from "react"
import { useRoute } from "wouter"
import { sync, useCardDeckId } from "@doska/core"
import { GlobalBoardView } from "@/components/global-board/global-board-view"
import { useCardFilters, useFilterQuery, useTagQuery } from "@/lib/hooks"
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
  const [epics, setEpics] = useState<string[]>([])
  useFilterQuery("epic", epics, setEpics)

  const deck = useMemo(
    () => ({
      id: cardDeckId ?? "",
      sort: [],
      ...filters,
      epicFilter: epics[0] ?? null,
      clearEpicFilter: () => setEpics([]),
    }),
    [cardDeckId, filters, epics]
  )

  return (
    <AppShell deck={deck} cardCloseHref={closeHref}>
      <GlobalBoardView />
    </AppShell>
  )
}
