import { SidebarMenuButton, SidebarMenuItem } from "@doska/ui-kit"
import { useLocation } from "wouter"
import { routes } from "@/lib/routes"

/** Sidebar entry that opens the habit tracker. */
export function HabitsButton() {
  const [location, navigate] = useLocation()
  const isActive = location === routes.habits()

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip="Habits"
        onClick={() => navigate(`~${routes.habits()}`)}
      >
        <span>Habits</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
