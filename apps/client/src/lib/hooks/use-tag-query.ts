import { useEffect, useRef } from "react"
import { useLocation, useSearch } from "wouter"

const SEP = "\n"

/**
 * Keeps a page's tag filter in its `?tag=` query, so a link with tags opens the
 * page filtered and the address follows the filter. Opening a card navigates
 * without the query, so a missing one puts the filter back rather than
 * clearing it; an empty `?tag=` is what clears it.
 */
export function useTagQuery(tags: string[], setTags: (tags: string[]) => void) {
  const search = useSearch()
  const [location, navigate] = useLocation()
  const fromUrl = new URLSearchParams(search).getAll("tag").join(SEP)
  const cleared = new URLSearchParams(search).has("tag") && !fromUrl
  const want = tags.join(SEP)
  // The query last seen or written, so only someone else's link seeds the filter.
  const synced = useRef<string | null>(null)

  useEffect(() => {
    if (cleared) {
      synced.current = ""
      setTags([])
      navigate(location, { replace: true })
      return
    }
    if (fromUrl && fromUrl !== synced.current) {
      synced.current = fromUrl
      setTags(fromUrl.split(SEP))
      return
    }
    if (want === fromUrl) return
    synced.current = want
    const params = new URLSearchParams(search)
    params.delete("tag")
    for (const tag of tags) params.append("tag", tag)
    const query = params.toString()
    navigate(query ? `${location}?${query}` : location, { replace: true })
  }, [cleared, fromUrl, want, tags, search, location, navigate, setTags])
}
