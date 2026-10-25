import { useMoveCardToBacklog, useSendCardToBoard } from "@doska/core"
import { createElement } from "react"
import { toast } from "react-hot-toast"
import { CardMoveToast } from "@/components/toasts/card-move/card-move-toast"
import { AddCardBlockedToast } from "@/components/toasts/add-card-blocked/add-card-blocked-toast"

const TOAST_ID = "card-move"

function moved(title: string) {
  toast.custom(
    (toastInstance) =>
      createElement(CardMoveToast, { visible: toastInstance.visible, title }),
    { id: TOAST_ID, duration: 2500 }
  )
}

function blocked(reason: string) {
  toast.custom(
    (toastInstance) =>
      createElement(AddCardBlockedToast, {
        visible: toastInstance.visible,
        reason,
      }),
    { id: TOAST_ID, duration: 2500 }
  )
}

/** Parking a card in its board's backlog and taking it back out, with the
 * toast that confirms each — for the card menu and the backlog page alike. */
export function useBacklogMoves() {
  const { mutate: moveToBacklog } = useMoveCardToBacklog()
  const { mutate: sendToBoard } = useSendCardToBoard()
  return {
    moveToBacklog: (cardId: string) =>
      moveToBacklog(cardId, { onSuccess: () => moved("backlog") }),
    sendToBoard: (cardId: string) =>
      sendToBoard(cardId, {
        onSuccess: () => moved("To do"),
        onError: () => blocked("The board has no column to send it to"),
      }),
  }
}
