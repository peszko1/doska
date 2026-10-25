import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import type { PrefixOption } from "@doska/markdown/core"
import { getPinnedTags, getTags, tagId } from "../api/operations"
import { keys } from "./keys"

/** Every tag across every board, with its count and color. Most used first. */
export function useTags() {
  return useQuery({
    queryKey: keys.tags,
    queryFn: getTags,
    networkMode: "always",
  })
}

/** The tags pinned to the sidebar, in order. */
export function usePinnedTags() {
  return useQuery({
    queryKey: keys.pinnedTags,
    queryFn: getPinnedTags,
    networkMode: "always",
  })
}

/** A tag's palette id by name, ignoring case; empty for an unstyled tag. */
export function useTagColor(): (name: string) => string {
  const { data: tags } = useTags()
  return useMemo(() => {
    const colors = new Map(tags?.map((tag) => [tagId(tag.name), tag.color]))
    return (name: string) => colors.get(tagId(name)) ?? ""
  }, [tags])
}

/** `#` completions for the editor and the tags menu: every board's tags. */
export function useTagOptions(): PrefixOption[] {
  const { data: tags } = useTags()

  return useMemo(
    () =>
      (tags ?? []).map(({ name, count }) => ({
        name,
        hint: count === 1 ? "1 card" : `${count} cards`,
      })),
    [tags]
  )
}
