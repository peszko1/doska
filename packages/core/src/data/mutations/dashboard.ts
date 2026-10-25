import { useMutation, useQueryClient } from "@tanstack/react-query"
import * as api from "../../api/operations"
import { pushUndo } from "../../undo"
import { keys } from "../keys"

export function useCreateDashboard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.createDashboard(name),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.dashboards }),
  })
}

export function useRenameDashboard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.renameDashboard(id, name),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.dashboards }),
  })
}

export function useSetDashboardSort() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, sort }: { id: string; sort: string[] }) =>
      api.setDashboardSort(id, sort),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.dashboards }),
  })
}

/** Sets a board's default tags, the ones its new and moved-in cards get. */
export function useSetBoardDefaultTags() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, tags }: { id: string; tags: string[] }) =>
      api.setBoardDefaultTags(id, tags),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.dashboards }),
  })
}

/** Tags every card already on the board that lacks the tag. */
export function useAddTagToBoardCards(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tag: string) => api.addTagToBoardCards(boardId, tag),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.boards })
      qc.invalidateQueries({ queryKey: keys.cards })
      qc.invalidateQueries({ queryKey: keys.digest })
    },
  })
}

export function useDeleteDashboard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteDashboard(id),
    onSuccess: (_data, id) => pushUndo("dashboards", id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.dashboards })
      qc.invalidateQueries({ queryKey: keys.digest })
      qc.invalidateQueries({ queryKey: keys.trash })
    },
  })
}
