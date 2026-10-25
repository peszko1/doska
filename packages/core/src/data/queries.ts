import { useQuery } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"
import { countOwnedBoards, listAccounts } from "../api/accounts"
import { publicBoardToken, publishedBoards } from "../api/boards"
import { fetchSession } from "../api/auth"
import { useServerPaused } from "../api/sync/connection"
import { fetchLinkedProviders, fetchSsoProviders } from "../api/sso"
import { fetchPublicBoard } from "../api/public"
import {
  getActivity,
  getBoardHistory,
  getHistory,
} from "../api/history/get-history"
import { listActiveUsers, listMembers, listSharedBoards } from "../api/members"
import {
  hasUnclaimedLocalBoards,
  UNCLAIMED_BOARDS_WARNING,
} from "../api/identity"
import * as api from "../api/operations"
import type { DigestFilter } from "../api/operations"
import { GLOBAL_ORDER, HABIT_CHECKS, type UserStore } from "../api/constants"
import { globalLanes } from "../utils/global-board"
import {
  epicCandidates,
  epicChildren,
  epicOf,
  epicProgress,
  type EpicIndex,
} from "../utils/epics"
import type { HistoryEntry } from "../types"
import { keys } from "./keys"

export type { Account } from "../api/accounts"
export type { SsoProvider } from "../api/sso"
export { UNCLAIMED_BOARDS_WARNING }

/** Identity providers offered at sign-in. Empty without a server, or SSO. */
export function useSsoProviders() {
  return useQuery({
    queryKey: keys.sso,
    queryFn: fetchSsoProviders,
    networkMode: "always",
  })
}

export function useLinkedProviders(userId: string | null) {
  return useQuery({
    queryKey: keys.linkedProviders(userId ?? ""),
    queryFn: fetchLinkedProviders,
    enabled: userId !== null,
  })
}

/**
 * The sync session. `data` is `undefined` until the first check resolves; auth
 * only gates sync, so this never blocks the app — it just drives the sign-in UI.
 */
export function useSession() {
  const paused = useServerPaused()
  return useQuery({
    queryKey: keys.session,
    queryFn: fetchSession,
    networkMode: "always",
    enabled: !paused,
  })
}

/** Whether the sign-in form should warn that the boards on this device are
 * about to become part of whichever account signs in*/
export function useUnclaimedLocalBoards() {
  return useQuery({
    queryKey: keys.unclaimedLocalBoards,
    queryFn: hasUnclaimedLocalBoards,
    networkMode: "always",
  })
}

/** Every account on the server. Admin-only server-side, so `enabled` is how the
 * caller keeps a non-admin session from firing a request that would 403. */
export function useAccounts(enabled: boolean) {
  return useQuery({
    queryKey: keys.accounts,
    queryFn: listAccounts,
    enabled,
  })
}

/** What stands between one account and being deleted. */
export function useOwnedBoards(userId: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.ownedBoards(userId),
    queryFn: () => countOwnedBoards(userId),
    enabled,
  })
}

/** Who a board is shared with, and what the reader may change about it.
 * Board-scoped server-side, so `enabled` keeps a signed-out session quiet. */
export function useBoardMembers(boardId: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.members(boardId),
    queryFn: () => listMembers(boardId),
    enabled,
  })
}

/** The board's public link, or null while it has none. Readable by anyone on the
 * board; `enabled` keeps a signed-out client from asking at all. */
export function usePublicBoardStatus(boardId: string, enabled: boolean) {
  return useQuery({
    queryKey: keys.publicStatus(boardId),
    queryFn: () => publicBoardToken(boardId),
    enabled,
  })
}

/**
 * A published board, fetched whole from its share link. No retry: the one
 * expected failure is a token that is not published, and retrying that just
 * makes the visitor wait for the same answer.
 */
export function usePublicBoard(token: string) {
  return useQuery({
    queryKey: keys.publicBoard(token),
    queryFn: () => fetchPublicBoard(token),
    retry: false,
    staleTime: Infinity,
  })
}

/** Which boards are published, for the sidebar's marker. */
export function usePublishedBoards(enabled: boolean) {
  return useQuery({
    queryKey: keys.publishedBoards,
    queryFn: publishedBoards,
    enabled,
  })
}

/** Which boards are shared, for the sidebar's marker. */
export function useSharedBoards(enabled: boolean) {
  return useQuery({
    queryKey: keys.sharedBoards,
    queryFn: listSharedBoards,
    enabled,
  })
}

/** Every active account, for the member picker. Any session may read it. */
export function useActiveUsers(enabled: boolean) {
  return useQuery({
    queryKey: keys.activeUsers,
    queryFn: listActiveUsers,
    enabled,
  })
}

// These read IndexedDB, so they must resolve offline (see query-client.ts).
export function useDashboards() {
  return useQuery({
    queryKey: keys.dashboards,
    queryFn: () => api.getDashboards(),
    networkMode: "always",
  })
}

/** Every live record of one of the account's own stores. Refreshed by the
 * account channel on a pull, and by whichever mutation writes the store. */
export function useUserRecords<S extends UserStore>(store: S) {
  return useQuery({
    queryKey: keys.userStore(store),
    queryFn: () => api.getUserRecords(store),
    networkMode: "always",
  })
}

/** Every live habit, archived ones included, in tracker order. */
export function useHabits() {
  return useQuery({
    queryKey: keys.habits,
    queryFn: () => api.getHabits(),
    networkMode: "always",
  })
}

/** The ticks dated within `[from, to]`. Under the checks store's key, so a
 * pull or a tick refreshes every range. */
export function useHabitChecks(from: string, to: string) {
  return useQuery({
    queryKey: [...keys.userStore(HABIT_CHECKS), from, to],
    queryFn: () => api.getHabitChecks(from, to),
    networkMode: "always",
  })
}

/** The sidebar's boards and folders, in order. */
export function useSidebarTree() {
  return useQuery({
    queryKey: keys.sidebar,
    queryFn: () => api.getSidebarTree(),
    networkMode: "always",
  })
}

export function useBoard(deckId: string) {
  return useQuery({
    queryKey: keys.board(deckId),
    queryFn: () => api.getBoard(deckId),
    networkMode: "always",
  })
}

/** Newest first. A board's history covers everything on it. */
export function useHistory(
  entityType: HistoryEntry["entityType"],
  entityId: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: keys.history(entityId),
    queryFn: () =>
      entityType === "board" ? getBoardHistory(entityId) : getHistory(entityId),
    enabled,
    networkMode: "always",
  })
}

export function useActivity(enabled: boolean) {
  return useQuery({
    queryKey: keys.activity,
    queryFn: () => getActivity(),
    enabled,
    networkMode: "always",
  })
}

/** Everything deleted and still restorable — see {@link api.getTrash}. */
export function useTrash() {
  return useQuery({
    queryKey: keys.trash,
    queryFn: () => api.getTrash(),
    networkMode: "always",
  })
}

/**
 * Every board's cards in the global board's lanes, laid out by the account's
 * own arrangement. Positions of cards that are gone are simply never looked up.
 */
export function useGlobalBoard() {
  const board = useQuery({
    queryKey: keys.globalBoard,
    queryFn: api.getGlobalBoard,
    networkMode: "always",
  })
  const { data: records } = useUserRecords(GLOBAL_ORDER)
  const data = board.data
  return useMemo(() => {
    const order = new Map(
      (records ?? []).map((record) => [record.id, record.position])
    )
    const entries = data?.entries ?? []
    return {
      entries,
      stages: data?.stages ?? new Map(),
      order,
      lanes: globalLanes(entries, order),
      isPending: board.isPending,
    }
  }, [data, records, board.isPending])
}

/** Every board's backlog cards — see {@link api.getBacklog}. */
export function useBacklog() {
  return useQuery({
    queryKey: keys.backlog,
    queryFn: api.getBacklog,
    networkMode: "always",
  })
}

/** Deadlined cards across every board, for the digest. */
function useEpicIndex<T>(select: (index: EpicIndex) => T, enabled = true) {
  return useQuery({
    queryKey: keys.epics,
    queryFn: api.getEpicIndex,
    select,
    enabled,
    networkMode: "always",
  })
}

/** The card's epic: live, on a live column and board, and present here. */
export function useEpic(cardId: string | null) {
  const { data } = useEpicIndex(
    useCallback(
      (index: EpicIndex) => (cardId ? epicOf(index, cardId) : null),
      [cardId]
    ),
    cardId != null
  )
  return data ?? null
}

/** The epic's live sub-cards with where they sit, and how many are done. */
export function useEpicChildren(cardId: string | null) {
  const { data } = useEpicIndex(
    useCallback(
      (index: EpicIndex) => {
        const children = cardId ? epicChildren(index, cardId) : []
        return { children, progress: epicProgress(children) }
      },
      [cardId]
    ),
    cardId != null
  )
  return data ?? EMPTY_EPIC
}

const EMPTY_EPIC = { children: [], progress: { done: 0, total: 0 } }

/** The cards `cardId` could join, for the epic picker; only read while open. */
export function useEpicCandidates(cardId: string, enabled: boolean) {
  const { data } = useEpicIndex(
    useCallback((index: EpicIndex) => epicCandidates(index, cardId), [cardId]),
    enabled
  )
  return data ?? []
}

export function useDigest(filter: DigestFilter) {
  return useQuery({
    queryKey: keys.digestFilter(filter),
    queryFn: () => api.getDigest(filter),
    networkMode: "always",
  })
}

/** The board an arbitrary card belongs to — see {@link api.getCardDeckId}. */
export function useCardDeckId(id: string | null) {
  return useQuery({
    queryKey: keys.cardDeck(id ?? ""),
    queryFn: () => api.getCardDeckId(id as string),
    enabled: id != null,
    networkMode: "always",
  })
}

/** The column an arbitrary card lives in — see {@link api.getCardCol}. */
export function useCardCol(id: string | null) {
  return useQuery({
    queryKey: keys.cardCol(id ?? ""),
    queryFn: () => api.getCardCol(id as string),
    enabled: id != null,
    networkMode: "always",
  })
}

export function useCard(id: string | null) {
  return useQuery({
    queryKey: keys.card(id ?? ""),
    queryFn: () => api.getCard(id as string),
    enabled: id != null,
    networkMode: "always",
  })
}
