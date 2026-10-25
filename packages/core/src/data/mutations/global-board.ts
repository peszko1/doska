import { useMutation, useQueryClient } from "@tanstack/react-query"
import * as api from "../../api/operations"
import { GLOBAL_ORDER } from "../../api/constants"
import type { GlobalOrder } from "../../types"
import type { GlobalDrop, GlobalStage } from "../../utils/global-board"
import { keys } from "../keys"
import { flushSyncUpdate } from "./flush-sync"

interface GlobalMove {
  cardId: string
  boardId: string
  stage: GlobalStage
  drop: GlobalDrop
}

/**
 * Persists a drop on the global board: the card's new place on its own board,
 * then the account's global positions. Both caches are written up front, inside
 * the drop event, for the same reason {@link useMoveCard} writes the board's.
 */
export function useMoveGlobalCard() {
  const qc = useQueryClient()
  const orderKey = keys.userStore(GLOBAL_ORDER)

  return useMutation({
    mutationFn: async ({ cardId, boardId, drop }: GlobalMove) => {
      if (drop.place) {
        const card = await api.getCard(cardId)
        if (card) await api.moveCard(boardId, [{ ...card, ...drop.place }])
      }
      for (const [id, position] of drop.order)
        await api.putUserRecord(GLOBAL_ORDER, { id, position, deletedAt: null })
    },
    onMutate: ({ cardId, stage, drop }: GlobalMove) => {
      const board = qc.getQueryData<api.GlobalBoard>(keys.globalBoard)
      const order = qc.getQueryData<GlobalOrder[]>(orderKey)
      flushSyncUpdate(() => {
        if (board && drop.place) {
          const { columnId, position } = drop.place
          qc.setQueryData<api.GlobalBoard>(keys.globalBoard, {
            ...board,
            entries: board.entries.map((entry) => {
              if (entry.card.id !== cardId) return entry
              const stages = board.stages.get(entry.board.id)
              const column =
                stages?.[stage].find((c) => c.id === columnId) ?? entry.column
              return {
                ...entry,
                stage,
                column,
                card: { ...entry.card, columnId, position },
              }
            }),
          })
        }
        const written = [...drop.order].map(([id, position]) => ({
          id,
          position,
          updatedAt: Date.now(),
          deletedAt: null,
        }))
        const ids = new Set(drop.order.keys())
        qc.setQueryData<GlobalOrder[]>(orderKey, [
          ...(order ?? []).filter((record) => !ids.has(record.id)),
          ...written,
        ])
      })
      return { board, order }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.board) qc.setQueryData(keys.globalBoard, ctx.board)
      if (ctx?.order) qc.setQueryData(orderKey, ctx.order)
    },
    onSettled: (_data, _err, { cardId, boardId }) => {
      for (const key of [
        keys.digest,
        keys.board(boardId),
        keys.card(cardId),
        keys.cardCol(cardId),
        orderKey,
      ])
        qc.invalidateQueries({ queryKey: key })
    },
  })
}

/** Creates a card at the top of a board's column, from outside that board. */
export function useCreateGlobalCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ columnId }: { boardId: string; columnId: string }) =>
      api.createCard(columnId),
    onSettled: (_data, _err, { boardId }) => {
      qc.invalidateQueries({ queryKey: keys.digest })
      qc.invalidateQueries({ queryKey: keys.board(boardId) })
    },
  })
}
