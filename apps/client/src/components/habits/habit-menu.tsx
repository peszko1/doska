import {
  Button,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  cn,
} from "@doska/ui-kit"
import type { Habit } from "@doska/core"
import {
  Archive,
  ArchiveRestore,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import { ConfirmDialog } from "../confirm-dialog"
import { ColumnColorSubmenu } from "../column/column-color"

interface IProps {
  habit: Habit
  onRename: () => void
  onRecolor: (color: string) => void
  onArchive: (archived: boolean) => void
  onDelete: () => void
}

export function HabitMenu({
  habit,
  onRename,
  onRecolor,
  onArchive,
  onDelete,
}: IProps) {
  const [confirming, setConfirming] = useState(false)
  const archived = habit.archivedAt !== null

  return (
    <>
      <Menu>
        <MenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`${habit.name} actions`}
              tooltip={false}
              className={cn(
                "shrink-0 text-muted-foreground opacity-0 max-md:opacity-100",
                "group-hover/habit:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
              )}
            />
          }
        >
          <MoreVertical />
        </MenuTrigger>
        <MenuContent align="start">
          <MenuItem onClick={onRename}>
            <Pencil />
            Rename
          </MenuItem>
          <ColumnColorSubmenu color={habit.color} onChange={onRecolor} />
          <MenuItem onClick={() => onArchive(!archived)}>
            {archived ? <ArchiveRestore /> : <Archive />}
            {archived ? "Unarchive" : "Archive"}
          </MenuItem>
          <MenuSeparator />
          <MenuItem onClick={() => setConfirming(true)} variant="destructive">
            <Trash2 />
            Delete habit
          </MenuItem>
        </MenuContent>
      </Menu>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete “${habit.name}”?`}
        description="Its ticked days go with it. To keep them, archive the habit instead."
        onConfirm={onDelete}
      />
    </>
  )
}
