import { SidebarMenuButton, SidebarMenuItem } from "@doska/ui-kit"
import { useLocation, useRouter, useSearch } from "wouter"
import { routes } from "@/lib/routes"

/** Sidebar entry that opens the global board. */
export function GlobalBoardButton() {
  const [, navigate] = useLocation()
  // Nested route, so the match is on the router base rather than the location.
  // Filtered by a tag, the pinned tag's entry is the active one instead.
  const base = useRouter().base
  const search = useSearch()
  const isActive =
    base === routes.global() && !new URLSearchParams(search).has("tag")

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip="All tasks"
        // The empty `?tag=` clears whatever tag filter is on.
        onClick={() => navigate(`~${routes.global()}?tag=`)}
      >
        <span>All tasks</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
