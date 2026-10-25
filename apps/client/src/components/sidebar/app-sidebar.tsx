import { useParams } from "wouter"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
} from "@doska/ui-kit"
import { usePublishedBoards, useSharedBoards } from "@doska/core"
import { useAuth } from "@/lib/hooks"
import { AppSidebarHeader } from "./app-sidebar-header"
import { ThemeToggle } from "@/components/theme-toggle"
import { DashboardsList } from "./dashboards-list/dashboards-list"
import { PinnedTags } from "./pinned-tags/pinned-tags"
import { SidebarAccount } from "./sidebar-account"
import { SettingsButton } from "@/components/settings/settings-button"
import { TrashButton } from "@/components/trash/trash-button"
import { HistoryButton } from "@/components/history/history-button"
import { UpcomingButton } from "@/components/digest/upcoming-button"
import { GlobalBoardButton } from "@/components/global-board/global-board-button"
import { HabitsButton } from "@/components/habits/habits-button"
import { isDesktop } from "@/lib/platform"

export function AppSidebar() {
  const { authed } = useAuth()
  const { data: sharedIds = [] } = useSharedBoards(authed === true)
  const { data: publishedIds = [] } = usePublishedBoards(authed === true)

  const activeDashboardId = useParams().id ?? ""

  return (
    <Sidebar className="ml-1">
      {!isDesktop() && <AppSidebarHeader />}
      <SidebarContent className="group/sidebar mt-6">
        <SidebarGroup>
          <SidebarMenu>
            <GlobalBoardButton />
            <UpcomingButton />
            <HabitsButton />
            <TrashButton />
          </SidebarMenu>
        </SidebarGroup>
        <PinnedTags />
        <DashboardsList
          activeDashboardId={activeDashboardId}
          sharedIds={sharedIds}
          publishedIds={publishedIds}
        />
      </SidebarContent>
      <SidebarFooter>
        <ThemeToggle />
        <HistoryButton />
        <SettingsButton />
        <SidebarAccount />
      </SidebarFooter>
    </Sidebar>
  )
}
