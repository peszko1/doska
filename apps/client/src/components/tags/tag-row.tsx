import { toTagName } from "@doska/markdown"
import { Button, Menu, MenuContent, MenuTrigger, TagChip } from "@doska/ui-kit"
import {
  useRenameTag,
  useSetTagColor,
  useSetTagPinned,
  type TagSummary,
} from "@doska/core"
import { Pencil, Pin, PinOff } from "lucide-react"
import { useState } from "react"
import { ColorMenuItems } from "../column/column-color"
import { ColumnSwatch } from "../column/column-swatch"

/** One tag in the tags modal: its chip, how many cards carry it, its sidebar
 * pin, its color, and a rename that applies on every board. */
export function TagRow({ tag }: { tag: TagSummary }) {
  const { mutate: setColor } = useSetTagColor()
  const { mutate: rename } = useRenameTag()
  const { mutate: setPinned } = useSetTagPinned()
  const pinned = tag.pin !== null
  const [draft, setDraft] = useState<string | null>(null)

  function commit() {
    const name = toTagName(draft ?? "")
    if (name && name !== tag.name) rename({ from: tag.name, to: name })
    setDraft(null)
  }

  return (
    <li className="flex items-center gap-2 px-4 py-1.5">
      {draft === null ? (
        <TagChip label={tag.name} color={tag.color} className="min-w-0" />
      ) : (
        <input
          autoFocus
          value={draft}
          aria-label={`Rename #${tag.name}`}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") {
              e.stopPropagation()
              setDraft(null)
            }
          }}
          className="min-w-0 flex-1 rounded-md border bg-transparent px-1.5 py-0.5 text-sm outline-none"
        />
      )}
      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
        {tag.count === 1 ? "1 card" : `${tag.count} cards`}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label={
          pinned ? `Unpin #${tag.name}` : `Pin #${tag.name} to the sidebar`
        }
        aria-pressed={pinned}
        onClick={() => setPinned({ name: tag.name, pinned: !pinned })}
        className={pinned ? "text-primary" : undefined}
      >
        {pinned ? <PinOff /> : <Pin />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Rename #${tag.name}`}
        onClick={() => setDraft(tag.name)}
      >
        <Pencil />
      </Button>
      <Menu>
        <MenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Color of #${tag.name}`}
            />
          }
        >
          <ColumnSwatch color={tag.color} />
        </MenuTrigger>
        <MenuContent align="end">
          <ColorMenuItems
            color={tag.color}
            onChange={(color) => setColor({ name: tag.name, color })}
          />
        </MenuContent>
      </Menu>
    </li>
  )
}
