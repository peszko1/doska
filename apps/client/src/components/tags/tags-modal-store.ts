import { useSyncExternalStore } from "react"

/**
 * Whether the tags modal is open. App-wide rather than local state, because it
 * opens from menus that unmount as they close.
 */
let open = false
const listeners = new Set<() => void>()

export function setTagsModalOpen(next: boolean) {
  open = next
  for (const listener of listeners) listener()
}

export function useTagsModalOpen(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => open
  )
}
