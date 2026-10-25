import { cardDisplayId } from "@doska/contract"
import {
  useEpic,
  useEpicCandidates,
  useEpicChildren,
  useSetCardParent,
  type EpicCard,
} from "@doska/core"
import {
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuSubTrigger,
} from "@doska/ui-kit"
import { Diamond, ListFilter, Unlink } from "lucide-react"
import { useState } from "react"
import { useLocation } from "wouter"
import { epicHref } from "@/lib/epic-href"

/** How many picks the epic picker lists; a query narrows the rest. */
const LIMIT = 30

const label = (card: EpicCard["card"]) => {
  const id = cardDisplayId(card.number)
  const title = card.title || "Untitled card"
  return id ? `${id} ${title}` : title
}

function matches(entry: EpicCard, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    label(entry.card).toLowerCase().includes(q) ||
    entry.board.title.toLowerCase().includes(q)
  )
}

function AddToEpicSub({ cardId }: { cardId: string }) {
  const [isOpen, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const candidates = useEpicCandidates(cardId, isOpen)
  const { mutate: setParent } = useSetCardParent()

  const shown = candidates
    .filter((entry) => matches(entry, query))
    .sort((a, b) => (b.card.updatedAt ?? 0) - (a.card.updatedAt ?? 0))
    .slice(0, LIMIT)

  return (
    <MenuSub onOpenChange={setOpen}>
      <MenuSubTrigger>
        <Diamond />
        Add to epic…
      </MenuSubTrigger>
      <MenuContent
        align="start"
        sideOffset={2}
        className="flex max-h-80 w-72 flex-col"
      >
        <div className="px-3">
          <input
            value={query}
            placeholder="Search cards…"
            aria-label="Search cards"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Escape") e.stopPropagation()
            }}
            className="w-full bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <MenuSeparator />
        <div className="overflow-y-auto">
          {shown.length === 0 && (
            <div className="px-3 py-1.5 text-sm text-muted-foreground">
              No cards
            </div>
          )}
          {shown.map((entry) => (
            <MenuItem
              key={entry.card.id}
              onClick={() => setParent({ id: cardId, parentId: entry.card.id })}
            >
              <span className="min-w-0 flex-1 truncate">
                {label(entry.card)}
              </span>
              <span className="max-w-24 shrink-0 truncate text-xs text-muted-foreground">
                {entry.board.title || "Untitled board"}
              </span>
            </MenuItem>
          ))}
        </div>
      </MenuContent>
    </MenuSub>
  )
}

/**
 * The card's epic actions, by what it is: a sub-card can leave its epic, an
 * epic can show its cards on All tasks, and any other card can join one.
 */
export function EpicItems({ cardId }: { cardId: string }) {
  const [, navigate] = useLocation()
  const epic = useEpic(cardId)
  const { progress } = useEpicChildren(cardId)
  const { mutate: setParent } = useSetCardParent()

  if (epic)
    return (
      <MenuItem onClick={() => setParent({ id: cardId, parentId: null })}>
        <Unlink />
        Remove from epic
      </MenuItem>
    )
  if (progress.total > 0)
    return (
      <MenuItem onClick={() => navigate(`~${epicHref(cardId)}`)}>
        <ListFilter />
        Show epic's cards
      </MenuItem>
    )
  return <AddToEpicSub cardId={cardId} />
}
