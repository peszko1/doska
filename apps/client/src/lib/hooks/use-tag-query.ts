import { useEffect, useRef } from "react"
import { useLocation, useSearch } from "wouter"

const SEP = "\n"

/**
 * Keeps a page's filter in its `?<name>=` query, so a link with one opens the
 * page filtered and the address follows the filter. Opening a card navigates
 * without the query, so a missing one puts the filter back rather than
 * clearing it; an empty `?<name>=` is what clears it.
 */
export function useFilterQuery(
  name: string,
  values: string[],
  setValues: (values: string[]) => void
) {
  const search = useSearch()
  const [location, navigate] = useLocation()
  const fromUrl = new URLSearchParams(search).getAll(name).join(SEP)
  const cleared = new URLSearchParams(search).has(name) && !fromUrl
  const want = values.join(SEP)
  // The query last seen or written, so only someone else's link seeds the filter.
  const synced = useRef<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(search)
    params.delete(name)
    const rest = params.toString()
    if (cleared) {
      synced.current = ""
      setValues([])
      navigate(rest ? `${location}?${rest}` : location, { replace: true })
      return
    }
    if (fromUrl && fromUrl !== synced.current) {
      synced.current = fromUrl
      setValues(fromUrl.split(SEP))
      return
    }
    if (want === fromUrl) return
    synced.current = want
    for (const value of values) params.append(name, value)
    const query = params.toString()
    navigate(query ? `${location}?${query}` : location, { replace: true })
  }, [
    name,
    cleared,
    fromUrl,
    want,
    values,
    search,
    location,
    navigate,
    setValues,
  ])
}

/** The tag filter in `?tag=`, one param per tag. */
export function useTagQuery(tags: string[], setTags: (tags: string[]) => void) {
  useFilterQuery("tag", tags, setTags)
}
