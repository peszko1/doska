import { useState } from "react"
import {
  Button,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@doska/ui-kit"
import { ArrowRightLeft, History, MoreHorizontal, Trash2 } from "lucide-react"
import { useAddTagToBoardCards, useBoard } from "@doska/core"
import { ConfirmDialog } from "../../confirm-dialog"
import { HistoryModal } from "../../history/history-modal"
import { ReorderColumnsModal } from "../reorder-columns/reorder-columns-modal"
import { DefaultTagsSub } from "./default-tags-sub"
import { SortSub } from "./sort-sub"
import type { Column } from "@doska/core"

interface IProps {
  boardId: string
  title: string
  columns: Column[]
  sort: string[]
  onChangeSort: (sort: string[]) => void
  onDelete: () => void
  onReorderColumns: (changed: Column[]) => void
}

export function BoardActionsMenu({
  boardId,
  title,
  columns,
  sort,
  onChangeSort,
  onDelete,
  onReorderColumns,
}: IProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reorderOpen, setReorderOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  // A tag just made a default, offered to the cards already on the board.
  const [backfill, setBackfill] = useState<{ tag: string; count: number }>()
  const { data: board } = useBoard(boardId)
  const { mutate: addTagToCards } = useAddTagToBoardCards(boardId)

  function offerBackfill(tag: string) {
    const key = tag.toLowerCase()
    const count = (board?.cards ?? []).filter(
      (card) => !(card.tags ?? []).some((t) => t.toLowerCase() === key)
    ).length
    if (count === 0) return
    setMenuOpen(false)
    setBackfill({ tag, count })
  }

  return (
    <>
      <Menu open={menuOpen} onOpenChange={setMenuOpen}>
        <MenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Board actions"
              className="text-muted-foreground"
              tooltip={false}
            />
          }
        >
          <MoreHorizontal />
        </MenuTrigger>
        <MenuContent>
          <SortSub sort={sort} onChangeSort={onChangeSort} />
          <DefaultTagsSub boardId={boardId} onAdded={offerBackfill} />
          <MenuItem
            onClick={() => setReorderOpen(true)}
            disabled={columns.length < 2}
          >
            <ArrowRightLeft />
            Reorder columns
          </MenuItem>
          <MenuItem onClick={() => setHistoryOpen(true)}>
            <History />
            History
          </MenuItem>
          <MenuSeparator />
          <MenuItem onClick={() => setConfirmOpen(true)} variant="destructive">
            <Trash2 />
            Delete board
          </MenuItem>
        </MenuContent>
      </Menu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete board?"
        description={`"${title}" and all of its columns and cards move to the trash, where they stay restorable for 14 days.`}
        confirmLabel="Delete board"
        onConfirm={onDelete}
      />
      <ConfirmDialog
        open={backfill !== undefined}
        onOpenChange={(open) => !open && setBackfill(undefined)}
        title={`Add #${backfill?.tag} to existing cards?`}
        description={`${backfill?.count} ${backfill?.count === 1 ? "card" : "cards"} already on this board don't have it yet.`}
        confirmLabel="Add tag"
        destructive={false}
        onConfirm={() => backfill && addTagToCards(backfill.tag)}
      />
      <ReorderColumnsModal
        open={reorderOpen}
        onOpenChange={setReorderOpen}
        columns={columns}
        onReorder={onReorderColumns}
      />
      <HistoryModal
        entityType="board"
        entityId={boardId}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </>
  )
}
