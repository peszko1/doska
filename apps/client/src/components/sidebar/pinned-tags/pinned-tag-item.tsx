import { SidebarMenuButton, columnHue } from "@doska/ui-kit"
import type { Tag } from "@doska/core"
import { Hash } from "lucide-react"
import { useLocation, useRouter, useSearch } from "wouter"
import { routes } from "@/lib/routes"
import { tagBoardHref } from "@/lib/tag-board"

export function PinnedTagItem({ tag }: { tag: Tag }) {
  const [, navigate] = useLocation()
  // Nested route, so the match is on the router base rather than the location.
  const onGlobalBoard = useRouter().base === routes.global()
  const filtered = new URLSearchParams(useSearch()).getAll("tag")
  const isActive =
    onGlobalBoard &&
    filtered.length === 1 &&
    filtered[0].toLowerCase() === tag.id
  const hue = columnHue(tag.color)

  return (
    <SidebarMenuButton
      isActive={isActive}
      tooltip={`#${tag.name}`}
      onClick={() => navigate(`~${tagBoardHref(tag.name)}`)}
    >
      <Hash
        aria-hidden
        className="size-4 text-muted-foreground"
        style={hue === null ? undefined : { color: `oklch(0.62 0.15 ${hue})` }}
      />
      <span className="truncate">{tag.name}</span>
    </SidebarMenuButton>
  )
}
