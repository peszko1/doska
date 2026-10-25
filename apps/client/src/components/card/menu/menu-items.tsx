import { MenuContent, MenuItem, MenuSeparator } from "@doska/ui-kit"
import { History, Pencil } from "lucide-react"
import { BacklogItem } from "./backlog-item"
import { CardMenuExtraItems } from "./card-menu-extras"
import { CopyIdItem } from "./copy-id-item"
import { DeadlineSub } from "./deadline-sub"
import { DeleteItem } from "./delete-item"
import { EpicItems } from "./epic-items"
import { MoveToBoardSub } from "./move-to-board-sub"
import { MoveToColumnSub } from "./move-to-column-sub"
import { PrioritySub } from "./priority-sub"
import { TagsSub } from "./tags-sub"
import { UsersSub } from "./users-sub"

interface IProps {
  cardId: string
  onEdit: () => void
  onShowHistory: () => void
  closeMenu: () => void
  align?: "start" | "center" | "end"
}

/** Everything the viewer can do to a card without opening it. */
export function CardMenuItems({
  cardId,
  onEdit,
  onShowHistory,
  closeMenu,
  align = "end",
}: IProps) {
  return (
    <MenuContent align={align} onClick={(e) => e.stopPropagation()}>
      <MenuItem onClick={onEdit}>
        <Pencil />
        Edit
      </MenuItem>
      <MenuSeparator />
      <CardMenuExtraItems cardId={cardId} />
      <MoveToColumnSub cardId={cardId} />
      <MoveToBoardSub cardId={cardId} />
      <BacklogItem cardId={cardId} />
      <EpicItems cardId={cardId} />
      <MenuSeparator />
      <PrioritySub cardId={cardId} />
      <TagsSub cardId={cardId} />
      <UsersSub cardId={cardId} />
      <DeadlineSub cardId={cardId} closeMenu={closeMenu} />
      <CopyIdItem cardId={cardId} />
      <MenuItem onClick={onShowHistory}>
        <History />
        History
      </MenuItem>
      <MenuSeparator />
      <DeleteItem cardId={cardId} />
    </MenuContent>
  )
}
