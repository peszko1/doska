import { MenuItem } from "@doska/ui-kit"
import { Archive, ArchiveRestore } from "lucide-react"
import { useCardCol } from "@doska/core"
import { useBacklogMoves } from "./use-backlog-moves"

/** "Move to backlog", or "Send to board" for a card already there. A board
 * without a backlog column gets one on the first move, so it always shows. */
export function BacklogItem({ cardId }: { cardId: string }) {
  const { data: column } = useCardCol(cardId)
  const { moveToBacklog, sendToBoard } = useBacklogMoves()

  if (column?.backlog)
    return (
      <MenuItem onClick={() => sendToBoard(cardId)}>
        <ArchiveRestore />
        Send to board
      </MenuItem>
    )
  return (
    <MenuItem onClick={() => moveToBacklog(cardId)}>
      <Archive />
      Move to backlog
    </MenuItem>
  )
}
