import { useContext } from "react"
import { CardMenuExtras } from "./card-menu-extras-context"

export function CardMenuExtraItems({ cardId }: { cardId: string }) {
  const extras = useContext(CardMenuExtras)
  return extras?.(cardId) ?? null
}
