/**
 * A card's tags with a board's default tags added: the card's own come first
 * and keep their spelling, and a default it already carries in any case is
 * not added again.
 */
export function applyDefaultTags(
  tags: readonly string[],
  defaults: readonly string[]
): string[] {
  const result = [...tags]
  for (const tag of defaults) {
    const key = tag.toLowerCase()
    if (!result.some((t) => t.toLowerCase() === key)) result.push(tag)
  }
  return result
}
