import {
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuSubTrigger,
} from "@doska/ui-kit"
import { Check, Tags } from "lucide-react"
import { useState } from "react"
import {
  toggleTag,
  useDashboards,
  useSetBoardDefaultTags,
  useTagColor,
  useTagOptions,
} from "@doska/core"
import { ColumnSwatch } from "../../column/column-swatch"
import { NewTagInput } from "../../card/menu/new-tag-input"

const hasTag = (tags: string[], tag: string) =>
  tags.some((t) => t.toLowerCase() === tag.toLowerCase())

interface IProps {
  boardId: string
  /** A tag just became a default, for offering it to the cards already here. */
  onAdded: (tag: string) => void
}

/** The tags every card created on, or moved onto, the board starts with. */
export function DefaultTagsSub({ boardId, onAdded }: IProps) {
  const { data: dashboards } = useDashboards()
  const { mutate: setDefaultTags } = useSetBoardDefaultTags()
  const options = useTagOptions()
  const tagColor = useTagColor()
  const [query, setQuery] = useState("")

  const defaults = dashboards?.find((d) => d.id === boardId)?.defaultTags ?? []
  const shown = options.filter((option) =>
    option.name
      .toLowerCase()
      .includes(query.trim().replace(/^#/, "").toLowerCase())
  )

  function set(tags: string[], added?: string) {
    setDefaultTags({ id: boardId, tags })
    if (added) onAdded(added)
  }

  function toggle(tag: string) {
    if (hasTag(defaults, tag)) set(toggleTag(defaults, tag))
    else set([...defaults, tag], tag)
  }

  return (
    <MenuSub>
      <MenuSubTrigger>
        <Tags />
        Default tags
        {defaults.length > 0 && (
          <span className="flex-1 text-right text-xs text-muted-foreground">
            {defaults.length}
          </span>
        )}
      </MenuSubTrigger>
      <MenuContent
        align="start"
        sideOffset={2}
        className="flex max-h-80 w-56 flex-col"
      >
        <NewTagInput
          onChangeQuery={setQuery}
          onAdd={(tag) => {
            if (!hasTag(defaults, tag)) set([...defaults, tag], tag)
          }}
        />
        {shown.length > 0 && <MenuSeparator />}
        <div className="overflow-y-auto">
          {shown.map((option) => (
            <MenuItem
              key={option.name}
              closeOnClick={false}
              onClick={() => toggle(option.name)}
            >
              <ColumnSwatch color={tagColor(option.name)} />#{option.name}
              {hasTag(defaults, option.name) && <Check className="ml-auto" />}
            </MenuItem>
          ))}
        </div>
        <MenuSeparator />
        <p className="px-3 py-1.5 text-xs text-muted-foreground">
          New cards and cards moved here get these tags.
        </p>
      </MenuContent>
    </MenuSub>
  )
}
