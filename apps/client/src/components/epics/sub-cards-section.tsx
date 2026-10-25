import { cardDisplayId } from "@doska/contract"
import {
  useCreateSubCard,
  useEpic,
  useEpicChildren,
  type EpicCard,
} from "@doska/core"
import { Button, cn } from "@doska/ui-kit"
import { Check, Plus } from "lucide-react"
import { useOpenCard } from "@/lib/hooks"
import { EpicHint } from "./epic-hint"
import { EpicProgress } from "./epic-progress"

function SubCardRow({
  entry,
  onOpen,
}: {
  entry: EpicCard
  onOpen: () => void
}) {
  const { card, board, column, isDone } = entry
  const id = cardDisplayId(card.number)

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted"
      >
        <Check
          className={cn(
            "size-3.5 shrink-0",
            isDone ? "text-foreground" : "text-transparent"
          )}
        />
        {id && (
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {id}
          </span>
        )}
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            isDone && "text-muted-foreground line-through"
          )}
        >
          {card.title || "Untitled card"}
        </span>
        <span className="max-w-32 shrink-0 truncate text-xs text-muted-foreground">
          {board.title || "Untitled board"} · {column.title}
        </span>
      </button>
    </li>
  )
}

/**
 * The epic part of the card panel: a sub-card links back to its epic, any other
 * card lists its sub-cards and can add one.
 */
export function SubCardsSection({ cardId }: { cardId: string }) {
  const epic = useEpic(cardId)
  const { children, progress } = useEpicChildren(cardId)
  const { mutate: createSubCard, isPending } = useCreateSubCard()
  const openCard = useOpenCard()

  if (epic)
    return (
      <section className="border-t px-4 pt-3">
        <h3 className="mb-1 text-xs font-medium text-muted-foreground">Epic</h3>
        <EpicHint
          epic={epic.card}
          onOpen={() => openCard(epic.card.id, epic.board.id)}
          className="text-sm"
        />
      </section>
    )

  return (
    <section className="border-t px-4 pt-3">
      {children.length > 0 && (
        <>
          <h3 className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            Sub-cards
            <EpicProgress {...progress} />
          </h3>
          <ul className="-mx-2 mb-1">
            {children.map((entry) => (
              <SubCardRow
                key={entry.card.id}
                entry={entry}
                onOpen={() => openCard(entry.card.id, entry.board.id)}
              />
            ))}
          </ul>
        </>
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        className="-mx-2 text-muted-foreground"
        onClick={() =>
          createSubCard(cardId, {
            onSuccess: ({ id, boardId }) => openCard(id, boardId),
          })
        }
      >
        <Plus />
        Add sub-card
      </Button>
    </section>
  )
}
