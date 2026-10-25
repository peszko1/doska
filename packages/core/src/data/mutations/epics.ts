import { useMutation, useQueryClient } from "@tanstack/react-query"
import * as api from "../../api/operations"
import { cardWriteKeys, keys } from "../keys"

/** Puts a card under an epic, or out of one with `parentId: null`. */
export function useSetCardParent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string | null }) =>
      api.setCardParent(id, parentId),
    onSettled: (_data, _err, { id }) => {
      for (const key of cardWriteKeys(id))
        qc.invalidateQueries({ queryKey: key })
    },
  })
}

/** Creates a sub-card on the epic's board and resolves to its id and board. */
export function useCreateSubCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (parentId: string) => api.createSubCard(parentId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.boards })
      qc.invalidateQueries({ queryKey: keys.digest })
    },
  })
}
