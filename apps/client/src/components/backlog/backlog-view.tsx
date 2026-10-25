import { useCallback, useEffect } from "react"
import { useLocation, useRoute } from "wouter"
import { Archive, ArchiveRestore, TriangleAlert } from "lucide-react"
import {
  type BacklogGroup,
  type CardPatch,
  filterByTags,
  filterByUsers,
  sync,
  useBacklog,
  useDashboards,
  useSaveCard,
} from "@doska/core"
import { cn } from "@doska/ui-kit"
import { useDashboardNav } from "@/lib/hooks"
import { routes } from "@/lib/routes"
import { DeckProvider, useDeck } from "@/providers/deck/deck-context"
import { PageHeader } from "../app/page-header"
import { Card } from "../card/card"
import { useBacklogMoves } from "../card/menu/use-backlog-moves"
import { TagFilterPills } from "../deck/deck-header/tag-filter-pills"
import { CenteredState } from "../digest/centered-state"

/** Connects the backlog to its data, and pulls every board so it isn't reading
 * a partial picture — only the open board syncs during normal use. */
export function BacklogView() {
  const [, navigate] = useLocation()
  const [, params] = useRoute(routes.card.pattern)
  const deck = useDeck()
  const { tagFilters = [], userFilters = [] } = deck
  const { selectDashboard } = useDashboardNav()
  const { sendToBoard } = useBacklogMoves()
  const { mutate: saveCard } = useSaveCard()
  const { data: dashboards = [] } = useDashboards()
  const { data: groups = [], isPending, error } = useBacklog()

  const boardIds = dashboards.map((d) => d.id).join(",")
  useEffect(() => {
    if (!boardIds) return
    void sync.watchBoards(boardIds.split(","))
    return () => void sync.watchBoards([])
  }, [boardIds])

  const patchCard = useCallback(
    (cardId: string, patch: CardPatch) => saveCard({ id: cardId, patch }),
    [saveCard]
  )

  const visible = groups.flatMap((group): BacklogGroup[] => {
    const cards = filterByUsers(
      filterByTags(group.cards, tagFilters),
      userFilters
    )
    return cards.length ? [{ ...group, cards }] : []
  })
  const openCardId = params?.id ?? null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader>
        <h1 className="text-base font-semibold">Backlog</h1>
      </PageHeader>
      <TagFilterPills />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-10">
        <div className="mx-auto max-w-lg">
          {error ? (
            <CenteredState
              icon={<TriangleAlert className="size-8 text-destructive" />}
            >
              <p className="max-w-sm text-sm text-muted-foreground">
                Couldn't read your backlog. If the app is open in another tab,
                close it and reload.
              </p>
            </CenteredState>
          ) : isPending ? null : visible.length === 0 ? (
            <CenteredState
              icon={<Archive className="size-8 text-muted-foreground" />}
            >
              {groups.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing in the backlog matches the filter.
                </p>
              ) : (
                <p className="max-w-sm text-sm text-muted-foreground">
                  Nothing in the backlog. Mark a column as the board's backlog
                  from its ⋯ menu, or pick Move to backlog on a card — its cards
                  wait here, off All tasks, until you send them to the board.
                </p>
              )}
            </CenteredState>
          ) : (
            visible.map(({ board, column, cards }) => (
              <section key={board.id} className="mb-10">
                <h2 className="pb-2">
                  <button
                    type="button"
                    onClick={() => selectDashboard(board.id)}
                    className="text-md font-bold hover:underline"
                  >
                    {board.title || "Untitled board"}
                  </button>
                </h2>
                <DeckProvider value={{ ...deck, id: board.id }}>
                  <ul className="space-y-3">
                    {cards.map((card) => (
                      <li key={card.id}>
                        <Card
                          card={card}
                          column={column}
                          showBody={false}
                          isDragging={false}
                          imageCard={false}
                          onPatch={patchCard}
                          onClick={() => navigate(routes.card.to(card.id))}
                          className={cn(
                            "mb-0 max-w-none",
                            card.id === openCardId && "ring-2 ring-primary/40"
                          )}
                          metaLead={
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                sendToBoard(card.id)
                              }}
                              className="flex min-w-0 items-center gap-1.5 text-muted-foreground hover:text-foreground"
                            >
                              <ArchiveRestore className="size-3.5 shrink-0" />
                              <span className="truncate">Send to board</span>
                            </button>
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </DeckProvider>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
