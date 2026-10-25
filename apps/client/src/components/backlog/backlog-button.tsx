import { SidebarMenuButton, SidebarMenuItem } from "@doska/ui-kit"
import { useLocation, useRouter } from "wouter"
import { routes } from "@/lib/routes"

/** Sidebar entry that opens the backlog. */
export function BacklogButton() {
  const [, navigate] = useLocation()
  // Nested route, so the match is on the router base rather than the location.
  const isActive = useRouter().base === routes.backlog()

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip="Backlog"
        // The empty `?tag=` clears whatever tag filter is on.
        onClick={() => navigate(`~${routes.backlog()}?tag=`)}
      >
        <span>Backlog</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
