import {
  Button,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  cn,
} from "@doska/ui-kit"
import { Plus } from "lucide-react"
import type { Column, Dashboard } from "@doska/core"

interface IProps {
  /** Boards with a To do column, each with that column. */
  targets: { board: Dashboard; column: Column }[]
  disabledReason?: string
  onAdd: (target: { board: Dashboard; column: Column }) => void
}

/** The To do lane's add button: picks the board, then adds to its To do. */
export function AddGlobalCard({ targets, disabledReason, onAdd }: IProps) {
  const reason =
    disabledReason ?? (targets.length === 0 ? "Add a board first" : undefined)

  return (
    <Menu>
      <MenuTrigger
        disabled={!!reason}
        render={
          <Button
            variant="muted"
            aria-label="Add card"
            className={cn("mb-3 w-full", reason && "opacity-50")}
            tooltip={reason ?? false}
          />
        }
      >
        <Plus />
      </MenuTrigger>
      <MenuContent align="start" className="max-h-80 w-56 overflow-y-auto">
        {targets.map((target) => (
          <MenuItem key={target.board.id} onClick={() => onAdd(target)}>
            <span className="truncate">
              {target.board.title || "Untitled board"}
            </span>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  )
}
