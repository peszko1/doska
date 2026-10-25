import { useActiveUsers, useTagColor } from "@doska/core"
import { useDeck } from "@/providers/deck/deck-context"
import { useAuth } from "@/lib/hooks"
import { FilterPill } from "./filter-pill"

/** The strip under the board header listing the active user and tag filters. */
export function TagFilterPills() {
  const {
    tagFilters = [],
    toggleTagFilter,
    userFilters = [],
    toggleUserFilter,
  } = useDeck()
  const { authed } = useAuth()
  const { data: activeUsers = [] } = useActiveUsers(!!authed)
  const tagColor = useTagColor()

  const users = activeUsers.filter((user) => userFilters.includes(user.id))
  if (tagFilters.length === 0 && users.length === 0) return null

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-1.5">
      {toggleUserFilter &&
        users.map((user) => (
          <FilterPill
            key={user.id}
            label={user.username}
            prefix="@"
            onClear={() => toggleUserFilter(user.id)}
          />
        ))}
      {toggleTagFilter &&
        tagFilters.map((tag) => (
          <FilterPill
            key={tag}
            label={tag}
            prefix="#"
            color={tagColor(tag)}
            onClear={() => toggleTagFilter(tag)}
          />
        ))}
    </div>
  )
}
