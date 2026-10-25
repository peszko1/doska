import {
  COLUMN_COLORS,
  MenuContent,
  MenuItem,
  MenuSub,
  MenuSubTrigger,
} from "@doska/ui-kit"
import { Check } from "lucide-react"
import { ColumnSwatch } from "./column-swatch"

interface IProps {
  color: string
  onChange: (color: string) => void
}

/** The palette as menu items, "No color" first, the current one ticked. */
export function ColorMenuItems({ color, onChange }: IProps) {
  const isSet = COLUMN_COLORS.some((c) => c.id === color)

  return (
    <>
      <MenuItem onClick={() => onChange("")}>
        <ColumnSwatch color="" />
        No color
        {!isSet && <Check className="ml-auto" />}
      </MenuItem>
      {COLUMN_COLORS.map((option) => (
        <MenuItem key={option.id} onClick={() => onChange(option.id)}>
          <ColumnSwatch color={option.id} />
          {option.label}
          {option.id === color && <Check className="ml-auto" />}
        </MenuItem>
      ))}
    </>
  )
}

/** Picks a column's color, nested inside the column's actions menu. */
export function ColumnColorSubmenu({ color, onChange }: IProps) {
  return (
    <MenuSub>
      <MenuSubTrigger>
        <ColumnSwatch color={color} />
        Color
      </MenuSubTrigger>
      <MenuContent align="start">
        <ColorMenuItems color={color} onChange={onChange} />
      </MenuContent>
    </MenuSub>
  )
}
