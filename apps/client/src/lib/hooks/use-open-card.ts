import { useCallback } from "react"
import { useLocation, useRouter } from "wouter"
import { routes } from "@/lib/routes"

/**
 * Opens any card's panel from wherever the viewer is. The digest and All tasks
 * host every board's cards, so they open it in place; a board only hosts its
 * own, so a card from elsewhere opens on its board.
 */
export function useOpenCard() {
  const [, navigate] = useLocation()
  const { base } = useRouter()

  return useCallback(
    (cardId: string, boardId: string) => {
      const hostsAny = base === routes.digest() || base === routes.global()
      if (hostsAny || base === routes.deck.to(boardId))
        navigate(routes.card.to(cardId))
      else navigate(`~${routes.deck.to(boardId)}${routes.card.to(cardId)}`)
    },
    [base, navigate]
  )
}
