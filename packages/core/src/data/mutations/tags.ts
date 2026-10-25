import { useMutation, useQueryClient } from "@tanstack/react-query"
import * as api from "../../api/operations"
import { TAGS } from "../../api/constants"
import type { Tag } from "../../types"
import { keys } from "../keys"

/** Restyles a tag for this account, on every board at once. */
export function useSetTagColor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      api.setTagColor(name, color),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.tags })
      qc.invalidateQueries({ queryKey: keys.userStore(TAGS) })
    },
  })
}

/** Pins a tag to the sidebar, at the end, or unpins it. */
export function useSetTagPinned() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, pinned }: { name: string; pinned: boolean }) =>
      api.setTagPinned(name, pinned),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.tags })
      qc.invalidateQueries({ queryKey: keys.userStore(TAGS) })
    },
  })
}

/** Reorders the sidebar's pinned tags, repainting the list before the write. */
export function useMovePinnedTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ name, index }: { name: string; index: number }) =>
      api.movePinnedTag(name, index),
    onMutate: ({ name, index }) => {
      qc.setQueryData<Tag[]>(keys.pinnedTags, (pins) => {
        if (!pins) return pins
        const moved = pins.find((t) => t.id === api.tagId(name))
        if (!moved) return pins
        const rest = pins.filter((t) => t !== moved)
        rest.splice(index, 0, moved)
        return rest
      })
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.userStore(TAGS) }),
  })
}

/** Renames a tag on every card carrying it, across every board. */
export function useRenameTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) =>
      api.renameTag(from, to),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.boards })
      qc.invalidateQueries({ queryKey: keys.cards })
      qc.invalidateQueries({ queryKey: keys.digest })
      qc.invalidateQueries({ queryKey: keys.userStore(TAGS) })
    },
  })
}
