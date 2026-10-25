import { useEffect, useState } from "react"
import { createElement } from "react"
import { DragDropContext, type DropResult } from "@hello-pangea/dnd"
import { toast } from "react-hot-toast"
import { useLocation } from "wouter"
import {
  type Card,
  type CardPatch,
  type GlobalCard,
  GLOBAL_STAGES,
  GLOBAL_STAGE_TITLES,
  type GlobalStage,
  filterByTags,
  filterByUsers,
  planGlobalDrop,
  stageColumn,
  sync,
  useCreateGlobalCard,
  useDashboards,
  useGlobalBoard,
  useMoveGlobalCard,
  useSaveCard,
} from "@doska/core"
import { cn, MenuItem } from "@doska/ui-kit"
import { ArrowUpToLine } from "lucide-react"
import { routes } from "@/lib/routes"
import { useDeck } from "@/providers/deck/deck-context"
import { AddCardBlockedToast } from "@/components/toasts/add-card-blocked/add-card-blocked-toast"
import { DraggableCard } from "../card/draggable-card"
import { CardMenuExtras } from "../card/menu/card-menu-extras-context"
import { PageHeader } from "../app/page-header"
import { BoardView } from "../deck/board-view"
import { DragStateProvider } from "../deck/drag-state"
import { TagFilterPills } from "../deck/deck-header/tag-filter-pills"
import { SyncIndicator } from "../deck/sync-indicator"
import { AddGlobalCard } from "./add-global-card"
import { GlobalLane } from "./global-lane"

const noop = () => {}

/** The epic itself and its sub-cards, for the `?epic=` filter. */
const inEpic = (card: Card, epicId: string) =>
  card.id === epicId || card.parentId === epicId

function blocked(reason: string) {
  toast.custom(
    (instance) =>
      createElement(AddCardBlockedToast, { visible: instance.visible, reason }),
    { id: "global-drop-blocked", duration: 2500 }
  )
}

/**
 * Connects the global board to its data, and pulls every board so it isn't
 * reading a partial picture — only the open board syncs during normal use.
 */
export function GlobalBoardView() {
  const [, navigate] = useLocation()
  const [isDragging, setIsDragging] = useState(false)
  const { tagFilters = [], userFilters = [], epicFilter } = useDeck()
  const { data: dashboards = [] } = useDashboards()
  const { entries, stages, order, lanes, isPending } = useGlobalBoard()
  const { mutate: moveCard } = useMoveGlobalCard()
  const { mutate: createCard } = useCreateGlobalCard()
  const { mutate: saveCard } = useSaveCard()

  const boardIds = dashboards.map((d) => d.id).join(",")
  useEffect(() => {
    if (!boardIds) return
    void sync.watchBoards(boardIds.split(","))
    return () => void sync.watchBoards([])
  }, [boardIds])

  const matching = new Set(
    filterByUsers(
      filterByTags(
        entries
          .map((e) => e.card)
          .filter((card) => !epicFilter || inEpic(card, epicFilter)),
        tagFilters
      ),
      userFilters
    )
  )
  const isVisible = (entry: GlobalCard) => matching.has(entry.card)
  const isFiltered =
    tagFilters.length > 0 || userFilters.length > 0 || !!epicFilter

  const targets = dashboards.flatMap((board) => {
    const column = stageColumn(stages.get(board.id), "todo")
    return column ? [{ board, column }] : []
  })

  const patchCard = (id: string, patch: CardPatch) => saveCard({ id, patch })

  /** Lands a card at `index` of a lane's visible cards, as a drop would. */
  function place(cardId: string, stage: GlobalStage, index: number) {
    const drop = planGlobalDrop({
      entries,
      stages,
      order,
      isVisible,
      cardId,
      stage,
      index,
    })
    const entry = entries.find((e) => e.card.id === cardId)
    if (!drop || !entry) {
      if (entry && entry.stage !== stage)
        blocked(
          `${entry.board.title || "This board"} has no ${GLOBAL_STAGE_TITLES[stage]} column`
        )
      return
    }
    moveCard({ cardId, boardId: entry.board.id, stage, drop })
  }

  function handleDragEnd({ source, destination, draggableId }: DropResult) {
    setIsDragging(false)
    if (!destination) return
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return
    place(
      draggableId,
      destination.droppableId as GlobalStage,
      destination.index
    )
  }

  // Top of the lane as shown: a filter's hidden cards keep their places.
  const moveToTop = (cardId: string) => {
    const entry = entries.find((e) => e.card.id === cardId)
    if (!entry) return null
    const isFirst = lanes[entry.stage].find(isVisible)?.card.id === cardId
    return (
      <MenuItem
        disabled={isFirst}
        onClick={() => place(cardId, entry.stage, 0)}
        className="data-disabled:pointer-events-none data-disabled:opacity-50"
      >
        <ArrowUpToLine />
        Move to top
      </MenuItem>
    )
  }

  return (
    <DragStateProvider value={isDragging}>
      <CardMenuExtras value={moveToTop}>
        <DragDropContext
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
        >
          <BoardView
            isLoading={isPending}
            isDragging={isDragging}
            footer={<SyncIndicator />}
            header={
              <>
                <PageHeader>
                  <h1 className="text-base font-semibold">All tasks</h1>
                </PageHeader>
                <TagFilterPills />
              </>
            }
          >
            {GLOBAL_STAGES.map((stage) => (
              <GlobalLane
                key={stage}
                stage={stage}
                addCard={
                  stage === "todo" && (
                    <AddGlobalCard
                      targets={targets}
                      disabledReason={
                        isFiltered ? "Clear filters to add cards" : undefined
                      }
                      onAdd={({ board, column }) =>
                        createCard(
                          { boardId: board.id, columnId: column.id },
                          {
                            onSuccess: (cardId) =>
                              navigate(routes.card.to(cardId)),
                          }
                        )
                      }
                    />
                  )
                }
              >
                {(showBody) =>
                  lanes[stage].filter(isVisible).map((entry, index) => (
                    <DraggableCard
                      key={entry.card.id}
                      card={entry.card}
                      column={entry.column}
                      index={index}
                      showBody={showBody}
                      compact={false}
                      vanishOnDrop={false}
                      onPatch={patchCard}
                      onDropSettled={noop}
                      className={cn(
                        stage === "done" &&
                          "opacity-40 [&_[data-slot=card-title]]:line-through"
                      )}
                      metaLead={
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`~${routes.deck.to(entry.board.id)}`)
                          }}
                          className="min-w-0 truncate text-muted-foreground hover:text-foreground"
                        >
                          {entry.board.title || "Untitled board"}
                        </button>
                      }
                    />
                  ))
                }
              </GlobalLane>
            ))}
          </BoardView>
        </DragDropContext>
      </CardMenuExtras>
    </DragStateProvider>
  )
}
