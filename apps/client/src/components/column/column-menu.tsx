import {
  Button,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "@doska/ui-kit"
import { Archive, CircleCheck, MoreHorizontal, Trash2 } from "lucide-react"
import { ColumnColorSubmenu } from "./column-color"

interface IProps {
  title: string
  color: string
  onChangeColor: (color: string) => void
  done: boolean
  onChangeDone: (done: boolean) => void
  backlog: boolean
  onChangeBacklog: (backlog: boolean) => void
  onDelete: () => void
}

/** The column's rarely-reached actions, behind a ⋯ in its header. */
export function ColumnMenu({
  title,
  color,
  onChangeColor,
  done,
  onChangeDone,
  backlog,
  onChangeBacklog,
  onDelete,
}: IProps) {
  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={`${title} actions`}
          />
        }
      >
        <MoreHorizontal />
      </MenuTrigger>
      <MenuContent>
        <ColumnColorSubmenu color={color} onChange={onChangeColor} />
        <MenuItem onClick={() => onChangeDone(!done)}>
          <CircleCheck />
          {done ? "Unmark cards as done" : "Mark cards as done"}
        </MenuItem>
        <MenuItem onClick={() => onChangeBacklog(!backlog)}>
          <Archive />
          {backlog ? "Unmark as backlog" : "Mark as backlog"}
        </MenuItem>
        <MenuSeparator />
        <MenuItem onClick={onDelete} variant="destructive">
          <Trash2 />
          Delete column
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}
